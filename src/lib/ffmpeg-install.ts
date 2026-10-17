import { isLinuxDesktop, isMacDesktop, isWeb } from "@/lib/platform";

export function ffmpegInstallStep(): string {
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isMac = isMacDesktop() || (isWeb() && /Mac/.test(userAgent));
  const isLinux = isLinuxDesktop() || (isWeb() && /Linux/.test(userAgent));

  if (isMac) return "Open a terminal and run: brew install ffmpeg";
  if (isLinux) {
    return "Install ffmpeg using your system package manager (apt, dnf, pacman, zypper, etc.).";
  }
  return "Open a terminal and run: winget install Gyan.FFmpeg";
}
