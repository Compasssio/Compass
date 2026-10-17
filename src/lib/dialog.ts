export async function confirmDialog(msg: string): Promise<boolean> {
  if ("__TAURI_INTERNALS__" in window) {
    const { confirm } = await import("@tauri-apps/plugin-dialog");
    return confirm(msg);
  }
  return window.confirm(msg);
}

export async function alertDialog(msg: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    const { message } = await import("@tauri-apps/plugin-dialog");
    await message(msg);
    return;
  }
  window.alert(msg);
}
