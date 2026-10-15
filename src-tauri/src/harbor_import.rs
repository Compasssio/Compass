//! Imports an existing Harbor (beta) installation into Compass the first time
//! Compass runs on a machine that has one.
//!
//! Called from `run()` before the Tauri builder starts. That timing matters:
//! Tauri creates the config windows (and with them the WebView2 profile)
//! *before* the `setup` hook runs, so by then the localStorage LevelDB would
//! be live — copying into a live profile is not safe. At the top of `run()`
//! nothing of Compass exists yet, which is also what makes "fresh" simple:
//! no settings file and no WebView profile directory.
//!
//! Only fires on a fresh install; a Compass that has already run is never
//! touched. `pnpm migrate:from-harbor` covers merging into an existing
//! Compass and reads the same sources. Nothing ever writes to the Harbor side.

use std::fs;
use std::path::{Path, PathBuf};

const HARBOR_ID: &str = "app.harbor";
/// Keep in sync with `identifier` in tauri.conf.json.
const COMPASS_ID: &str = "app.compass";

/// Roaming config root (Windows `%APPDATA%`), where settings.json and
/// secrets.json live — mirrors `app_data_dir` from tauri.
fn config_root(id: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("APPDATA").map(|v| PathBuf::from(v).join(id))
    }
    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME").map(|v| {
            PathBuf::from(v)
                .join("Library")
                .join("Application Support")
                .join(id)
        })
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::env::var_os("XDG_CONFIG_HOME")
            .map(PathBuf::from)
            .or_else(|| std::env::var_os("HOME").map(|v| PathBuf::from(v).join(".config")))
            .map(|v| v.join(id))
    }
}

/// Local data root (Windows `%LOCALAPPDATA%`), where the WebView2 profile
/// lives — mirrors `app_local_data_dir` from tauri.
fn local_root(id: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    {
        std::env::var_os("LOCALAPPDATA").map(|v| PathBuf::from(v).join(id))
    }
    #[cfg(target_os = "macos")]
    {
        config_root(id)
    }
    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::env::var_os("XDG_DATA_HOME")
            .map(PathBuf::from)
            .or_else(|| {
                std::env::var_os("HOME").map(|v| PathBuf::from(v).join(".local").join("share"))
            })
            .map(|v| v.join(id))
    }
}

/// Harbor (beta) labelled its keys harbor*, Compass labels them compass*.
pub fn rename_harbor_key(key: &str) -> String {
    if let Some(rest) = key.strip_prefix("harbor") {
        let bump = match rest.chars().next() {
            Some('.') | Some('-') => true,
            Some(c) => c.is_ascii_uppercase(),
            None => false,
        };
        if bump {
            return format!("compass{rest}");
        }
    }
    key.to_string()
}

/// User data copied when missing. Same list as `scripts/migrate-from-harbor.mjs`.
const COPY_DIRS: &[&str] = &[
    "fonts",
    "anime4k",
    "shaders",
    "games",
    "game-accounts",
    "game-download-queue",
    "game-preparation",
    "game-setup",
    "game-torrents",
    "game-archives",
    "manga-downloads",
    "music",
    "music-store",
    "spotify",
    "connectors",
];
const COPY_FILES: &[&str] = &[
    ".window-state.json",
    "soundcloud-client-id",
    "youtube-visitor-id",
    "music-audio.json",
];

pub fn prepare() {
    match run_import() {
        Ok(Some(summary)) => eprintln!("[compass::harbor-import] imported from Harbor: {summary}"),
        Ok(None) => {}
        Err(error) => eprintln!("[compass::harbor-import] import failed: {error}"),
    }
}

fn run_import() -> Result<Option<String>, String> {
    let Some(compass_data) = config_root(COMPASS_ID) else {
        return Ok(None);
    };
    let Some(compass_local) = local_root(COMPASS_ID) else {
        return Ok(None);
    };
    let Some(harbor_data) = config_root(HARBOR_ID) else {
        return Ok(None);
    };
    let harbor_local = local_root(HARBOR_ID);

    // Fresh Compass only. The WebView profile check is Windows-shaped; other
    // platforms rely on the settings file alone.
    if compass_data.join("settings.json").exists() {
        return Ok(None);
    }
    if compass_local.join("EBWebView").exists() {
        return Ok(None);
    }
    if !harbor_data.exists() && harbor_local.as_deref().is_none_or(|p| !p.exists()) {
        return Ok(None);
    }

    let mut parts: Vec<String> = Vec::new();

    // The WebView localStorage first: it is the largest step and the one a
    // failed run must not leave half-done, because the target directory is
    // also the "Compass has run" marker. On failure the partial directory is
    // removed so the next launch can retry.
    #[cfg(windows)]
    {
        if let Some(harbor_local) = harbor_local.as_deref() {
            let target = compass_local.join("EBWebView");
            let source = harbor_local
                .join("EBWebView")
                .join("Default")
                .join("Local Storage");
            match copy_missing_tree(&source, &target.join("Default").join("Local Storage")) {
                Ok(copied) => {
                    if copied > 0 {
                        parts.push(format!("{copied} localStorage files"));
                    }
                }
                Err(error) => {
                    let _ = fs::remove_dir_all(&target);
                    return Err(error);
                }
            }
        }
    }

    let mut data_files = 0usize;
    for dir in COPY_DIRS {
        data_files += copy_missing_tree(&harbor_data.join(dir), &compass_data.join(dir))?;
    }
    for file in COPY_FILES {
        if copy_missing_file(&harbor_data.join(file), &compass_data.join(file))? {
            data_files += 1;
        }
    }
    if let Ok(entries) = fs::read_dir(&harbor_data) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with("music-p_") && name.ends_with(".db") {
                if copy_missing_file(&entry.path(), &compass_data.join(&name))? {
                    data_files += 1;
                }
            }
        }
    }
    if !compass_data.join("music.db").exists() {
        for name in ["music.db", "music.db-wal", "music.db-shm"] {
            if copy_missing_file(&harbor_data.join(name), &compass_data.join(name))? {
                data_files += 1;
            }
        }
    }
    if data_files > 0 {
        parts.push(format!("{data_files} data files"));
    }

    // Settings and secrets last: writing them flips Compass to "used", so a
    // crash before this point retries cleanly on the next launch.
    let settings = import_json_with_renames(
        &harbor_data.join("settings.json"),
        &compass_data.join("settings.json"),
    )?;
    if settings > 0 {
        parts.push(format!("{settings} settings"));
    }
    let secrets = import_json_with_renames(
        &harbor_data.join("secrets.json"),
        &compass_data.join("secrets.json"),
    )?;
    if secrets > 0 {
        parts.push(format!("{secrets} secrets"));
    }

    if parts.is_empty() {
        return Ok(None);
    }
    Ok(Some(parts.join(", ")))
}

fn import_json_with_renames(from: &Path, to: &Path) -> Result<usize, String> {
    if !from.is_file() {
        return Ok(0);
    }
    let text = fs::read_to_string(from).map_err(|e| format!("read {}: {e}", from.display()))?;
    let parsed: serde_json::Value =
        serde_json::from_str(&text).map_err(|e| format!("parse {}: {e}", from.display()))?;
    let Some(object) = parsed.as_object() else {
        return Ok(0);
    };
    let mut renamed = serde_json::Map::with_capacity(object.len());
    for (key, value) in object {
        renamed.insert(rename_harbor_key(key), value.clone());
    }
    let count = renamed.len();
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }
    let body = serde_json::to_string(&serde_json::Value::Object(renamed))
        .map_err(|e| format!("serialize {}: {e}", to.display()))?;
    fs::write(to, body).map_err(|e| format!("write {}: {e}", to.display()))?;
    Ok(count)
}

fn copy_missing_tree(from: &Path, to: &Path) -> Result<usize, String> {
    if !from.is_dir() {
        return Ok(0);
    }
    let mut copied = 0usize;
    let entries = fs::read_dir(from).map_err(|e| format!("read {}: {e}", from.display()))?;
    for entry in entries.flatten() {
        let name = entry.file_name();
        if name.to_string_lossy() == "LOCK" {
            continue; // LevelDB lock file, never copy it
        }
        let target = to.join(&name);
        let file_type = entry
            .file_type()
            .map_err(|e| format!("stat {}: {e}", entry.path().display()))?;
        if file_type.is_dir() {
            copied += copy_missing_tree(&entry.path(), &target)?;
        } else if file_type.is_file() && !target.exists() {
            if let Some(parent) = target.parent() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
            }
            fs::copy(entry.path(), &target)
                .map_err(|e| format!("copy {}: {e}", entry.path().display()))?;
            copied += 1;
        }
    }
    Ok(copied)
}

fn copy_missing_file(from: &Path, to: &Path) -> Result<bool, String> {
    if !from.is_file() || to.exists() {
        return Ok(false);
    }
    if let Some(parent) = to.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("mkdir {}: {e}", parent.display()))?;
    }
    fs::copy(from, to).map_err(|e| format!("copy {}: {e}", from.display()))?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renames_harbor_keys() {
        assert_eq!(rename_harbor_key("harbor.settings"), "compass.settings");
        assert_eq!(
            rename_harbor_key("harbor-spookfest-list"),
            "compass-spookfest-list"
        );
        assert_eq!(rename_harbor_key("harborAvatar"), "compassAvatar");
        assert_eq!(rename_harbor_key("compass.settings"), "compass.settings");
        assert_eq!(rename_harbor_key("harborous"), "harborous");
        assert_eq!(rename_harbor_key("harbor"), "harbor");
    }

    #[test]
    fn copies_missing_files_only() {
        let base =
            std::env::temp_dir().join(format!("compass-harbor-import-test-{}", std::process::id()));
        let from = base.join("from");
        let to = base.join("to");
        std::fs::create_dir_all(from.join("nested")).unwrap();
        std::fs::write(from.join("nested").join("a.txt"), "a").unwrap();
        std::fs::write(from.join("b.txt"), "b").unwrap();
        std::fs::write(from.join("LOCK"), "lock").unwrap();
        std::fs::create_dir_all(&to).unwrap();
        std::fs::write(to.join("b.txt"), "keep").unwrap();

        let copied = copy_missing_tree(&from, &to).unwrap();
        assert_eq!(copied, 1);
        assert_eq!(
            std::fs::read_to_string(to.join("nested").join("a.txt")).unwrap(),
            "a"
        );
        assert_eq!(std::fs::read_to_string(to.join("b.txt")).unwrap(), "keep");
        assert!(!to.join("LOCK").exists());
        let _ = std::fs::remove_dir_all(&base);
    }
}
