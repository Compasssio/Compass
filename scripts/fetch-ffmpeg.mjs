import { chmodSync, copyFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const binDir = join(root, "src-tauri", "binaries");

function targetTriple() {
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  if (process.platform === "win32") return `${arch}-pc-windows-msvc`;
  if (process.platform === "darwin") return `${arch}-apple-darwin`;
  return `${arch}-unknown-linux-gnu`;
}

const ext = process.platform === "win32" ? ".exe" : "";
const triple = targetTriple();
const sizeMb = (p) => (statSync(p).size / 1048576).toFixed(0);

let ok = true;
for (const name of ["ffmpeg", "ffprobe"]) {
  const dest = join(binDir, `${name}-${triple}${ext}`);
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`[ffmpeg] ${name}-${triple}${ext} already present (${sizeMb(dest)} MB)`);
    continue;
  }
  const src = join(binDir, `${name}${ext}`);
  if (!existsSync(src) || statSync(src).size === 0) {
    console.error(`[ffmpeg] missing ${src}`);
    console.error(`[ffmpeg] Drop a STATIC ${name}${ext} into src-tauri/binaries/ then re-run.`);
    console.error(`[ffmpeg]   Windows: github.com/BtbN/FFmpeg-Builds (gpl, static).`);
    console.error(`[ffmpeg]   macOS arm64: osxexperts.net (static, NOT brew/dynamic).`);
    ok = false;
    continue;
  }
  copyFileSync(src, dest);
  if (process.platform !== "win32") chmodSync(dest, 0o755);
  console.log(`[ffmpeg] ${name}${ext} -> ${name}-${triple}${ext} (${sizeMb(dest)} MB)`);
}

if (!ok) process.exit(1);
