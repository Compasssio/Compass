use super::{auth, session, SpotifyState, SpotifyStatus};
use librespot_core::authentication::Credentials;
use librespot_core::config::SessionConfig;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::AppHandle;

/// Spotify's OAuth 2.0 device authorization grant (RFC 8628). Pairing needs no callback
/// server, and the desktop client id it authenticates with is the one the playback session
/// itself uses — Spotify rejects playback tokens issued to developer apps.
const AUTHORIZE_URL: &str = "https://accounts.spotify.com/oauth2/device/authorize";
const TOKEN_URL: &str = "https://accounts.spotify.com/api/token";
const DEVICE_GRANT: &str = "urn:ietf:params:oauth:grant-type:device_code";

/// The token must be issued to the same client the librespot session authenticates with.
fn client_id() -> String {
    SessionConfig::default().client_id
}

#[derive(Debug, Clone, Deserialize)]
struct DeviceCode {
    device_code: String,
    user_code: String,
    verification_uri: String,
    #[serde(default)]
    verification_uri_complete: Option<String>,
    #[serde(default)]
    expires_in: u64,
    #[serde(default)]
    interval: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DevicePrompt {
    pub user_code: String,
    pub verification_uri: String,
    pub verification_uri_complete: Option<String>,
    pub expires_in: u64,
    pub interval: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum DevicePoll {
    Pending { interval: u64 },
    SlowDown { interval: u64 },
    Connected { status: SpotifyStatus },
}

#[derive(Debug, Clone)]
pub(super) struct PendingDevice {
    device_code: String,
    expires_at: u64,
    interval: u64,
}

impl SpotifyState {
    pub async fn begin_device_pairing(self: &Arc<Self>) -> Result<DevicePrompt, String> {
        let response = self
            .http()
            .post(AUTHORIZE_URL)
            .form(&[("client_id", client_id()), ("scope", auth::SCOPES.join(" "))])
            .send()
            .await
            .map_err(|error| format!("Spotify pairing request failed: {error}"))?;
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        if !status.is_success() {
            return Err(describe_pairing_refusal(status, &body));
        }
        let code: DeviceCode = serde_json::from_str(&body)
            .map_err(|error| format!("Spotify pairing response was unreadable: {error}"))?;
        let interval = code.interval.max(1);
        *self.device.write() = Some(PendingDevice {
            device_code: code.device_code,
            expires_at: unix_seconds().saturating_add(code.expires_in),
            interval,
        });
        Ok(DevicePrompt {
            user_code: code.user_code,
            verification_uri: code.verification_uri,
            verification_uri_complete: code.verification_uri_complete,
            expires_in: code.expires_in,
            interval,
        })
    }

    pub async fn poll_device_pairing(
        self: &Arc<Self>,
        app: AppHandle,
    ) -> Result<DevicePoll, String> {
        let Some(pending) = self.device.read().clone() else {
            return Err("No Spotify pairing is in progress".to_string());
        };
        if unix_seconds() >= pending.expires_at {
            *self.device.write() = None;
            return Err("The Spotify pairing code expired. Start again.".to_string());
        }
        let response = self
            .http()
            .post(TOKEN_URL)
            .form(&[
                ("client_id", client_id()),
                ("grant_type", DEVICE_GRANT.to_string()),
                ("device_code", pending.device_code.clone()),
            ])
            .send()
            .await
            .map_err(|error| format!("Spotify pairing poll failed: {error}"))?;
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        let value: Value = serde_json::from_str(&body).unwrap_or(Value::Null);
        if status.is_success() {
            let Some(access_token) = value.get("access_token").and_then(Value::as_str) else {
                return Err("Spotify pairing finished without a token".to_string());
            };
            *self.device.write() = None;
            let cache_dir = self.cache_path()?;
            let cache = session::make_cache(&cache_dir)?;
            let credentials = Credentials::with_access_token(access_token.to_string());
            self.connect_with(app.clone(), cache, credentials).await?;
            // Nothing else can drive browsing right now, so let the paired token serve it.
            // It belongs to the desktop client, so its refresh path must ask that client
            // rather than the listener's own app.
            if !self.web_token_serveable(&app) {
                self.adopt_web_token(&app, device_authorization(&value), None, Some(client_id()));
            }
            return Ok(DevicePoll::Connected {
                status: self.snapshot(),
            });
        }
        match value.get("error").and_then(Value::as_str) {
            Some("authorization_pending") => Ok(DevicePoll::Pending {
                interval: pending.interval,
            }),
            Some("slow_down") => {
                let interval = pending.interval + 5;
                if let Some(slot) = self.device.write().as_mut() {
                    slot.interval = interval;
                }
                Ok(DevicePoll::SlowDown { interval })
            }
            Some("access_denied") => {
                *self.device.write() = None;
                Err("Spotify pairing was declined.".to_string())
            }
            Some("expired_token") => {
                *self.device.write() = None;
                Err("The Spotify pairing code expired. Start again.".to_string())
            }
            Some(other) => Err(format!("Spotify pairing failed: {other}")),
            None => Err(format!("Spotify pairing failed with status {status}")),
        }
    }

    pub fn cancel_device_pairing(&self) {
        self.device.write().take();
    }
}

fn device_authorization(value: &Value) -> auth::Authorization {
    auth::Authorization {
        access_token: value
            .get("access_token")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        refresh_token: value
            .get("refresh_token")
            .and_then(Value::as_str)
            .map(str::to_string),
        expires_at: unix_seconds()
            .saturating_add(value.get("expires_in").and_then(Value::as_u64).unwrap_or(3600)),
        scopes: value
            .get("scope")
            .and_then(Value::as_str)
            .unwrap_or_default()
            .split_whitespace()
            .map(str::to_string)
            .collect(),
    }
}

fn describe_pairing_refusal(status: reqwest::StatusCode, body: &str) -> String {
    let value: Value = serde_json::from_str(body).unwrap_or(Value::Null);
    match value.get("error").and_then(Value::as_str) {
        Some("invalid_client") => "Spotify rejected the pairing client".to_string(),
        Some("unauthorized_client") => {
            "Spotify does not allow device pairing for this client".to_string()
        }
        Some("invalid_scope") => "Spotify rejected the requested permissions".to_string(),
        Some(other) => format!("Spotify pairing failed: {other}"),
        None => format!("Spotify pairing failed with status {status}"),
    }
}

fn unix_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_pairing_client_matches_the_session_client() {
        // The token must be issued to the client the librespot session authenticates with,
        // or login5 rejects it for playback.
        assert_eq!(client_id(), SessionConfig::default().client_id);
        assert!(!client_id().is_empty());
    }

    #[test]
    fn a_device_code_response_parses_the_rfc8628_fields() {
        let code: DeviceCode = serde_json::from_str(
            r#"{"device_code":"abc","user_code":"ABCDEF","verification_uri":"https://spotify.com/pair","verification_uri_complete":"https://spotify.com/pair?code=ABCDEF","expires_in":3599,"interval":5}"#,
        )
        .expect("parse");
        assert_eq!(code.user_code, "ABCDEF");
        assert_eq!(code.interval, 5);
        assert_eq!(code.expires_in, 3599);
        assert_eq!(
            code.verification_uri_complete.as_deref(),
            Some("https://spotify.com/pair?code=ABCDEF")
        );
    }

    #[test]
    fn refusals_name_the_real_problem() {
        let bad = reqwest::StatusCode::BAD_REQUEST;
        assert_eq!(
            describe_pairing_refusal(bad, r#"{"error":"invalid_client"}"#),
            "Spotify rejected the pairing client"
        );
        assert_eq!(
            describe_pairing_refusal(bad, r#"{"error":"unauthorized_client"}"#),
            "Spotify does not allow device pairing for this client"
        );
        assert_eq!(
            describe_pairing_refusal(bad, r#"{"error":"invalid_scope"}"#),
            "Spotify rejected the requested permissions"
        );
        assert!(describe_pairing_refusal(reqwest::StatusCode::BAD_GATEWAY, "nope").contains("502"));
    }
}
