import { invoke } from "@tauri-apps/api/core";

const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export function setWebviewMemoryLow(low: boolean): void {
  if (!isTauri) return;
  void invoke("compass_set_webview_memory_low", { low }).catch(() => {});
}

export function pulseWebviewMemoryLow(settleMs = 1500): void {
  if (!isTauri) return;
  setWebviewMemoryLow(true);
  window.setTimeout(() => setWebviewMemoryLow(false), settleMs);
}

export function setWebviewVisible(visible: boolean): void {
  if (!isTauri) return;
  void invoke("compass_set_webview_visible", { visible }).catch(() => {});
}

export function trySuspendWebview(): void {
  if (!isTauri) return;
  void invoke("compass_try_suspend_webview").catch(() => {});
}

export function resumeWebview(): void {
  if (!isTauri) return;
  void invoke("compass_resume_webview").catch(() => {});
}
