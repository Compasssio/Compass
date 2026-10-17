use axum::extract::Query;
use axum::response::Html;
use axum::routing::get;
use axum::Router;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::net::TcpListener;
use tokio::sync::{oneshot, Mutex};

const PAGE_OK: &str = r#"<!doctype html><html><head><meta charset="utf-8"><title>Compass</title><style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#0d0f14;color:#e9ebf2}.c{text-align:center;max-width:380px;padding:32px}h1{font-size:21px;margin:0 0 10px;font-weight:600}p{color:#9aa1ad;font-size:14px;line-height:1.55;margin:0}</style></head><body><div class="c"><h1>You're signed in</h1><p>You can close this tab and head back to Compass.</p></div></body></html>"#;

const PAGE_FAIL: &str = r#"<!doctype html><html><head><meta charset="utf-8"><title>Compass</title><style>body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#0d0f14;color:#e9ebf2}.c{text-align:center;max-width:380px;padding:32px}p{color:#9aa1ad;font-size:14px;line-height:1.55}</style></head><body><div class="c"><p>No sign-in key came through. Return to Compass and try again.</p></div></body></html>"#;

#[tauri::command]
pub async fn stremio_auth_start(app: AppHandle) -> Result<u16, String> {
    let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0)))
        .await
        .map_err(|e| format!("bind failed: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("local_addr: {}", e))?
        .port();

    let (tx, rx) = oneshot::channel::<()>();
    let done = Arc::new(Mutex::new(Some(tx)));
    let app_handle = app.clone();

    let router = Router::new().route(
        "/cb",
        get(move |Query(params): Query<HashMap<String, String>>| {
            let app = app_handle.clone();
            let done = done.clone();
            async move {
                let key = params
                    .get("key")
                    .or_else(|| params.get("authKey"))
                    .cloned()
                    .unwrap_or_default();
                if key.is_empty() {
                    return Html(PAGE_FAIL);
                }
                let _ = app.emit("stremio-auth", key);
                if let Some(sender) = done.lock().await.take() {
                    let _ = sender.send(());
                }
                Html(PAGE_OK)
            }
        }),
    );

    tokio::spawn(async move {
        let shutdown = async {
            tokio::select! {
                _ = rx => {}
                _ = tokio::time::sleep(std::time::Duration::from_secs(300)) => {}
            }
        };
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(shutdown)
            .await;
    });

    Ok(port)
}
