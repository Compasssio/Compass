import { shrinkGif } from "./avatar-gif";

const MAX_ANIMATED_AVATAR_BYTES = 2 * 1024 * 1024;

export function resizeAvatar(file: File, maxDim: number): Promise<string> {
  if (file.type === "image/gif") {
    return shrinkGif(file).catch(() =>
      file.size <= MAX_ANIMATED_AVATAR_BYTES ? fileToDataUrl(file) : resizeToWebp(file, maxDim),
    );
  }
  return resizeToWebp(file, maxDim);
}

function resizeToWebp(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no canvas 2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };
    img.src = objectUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
