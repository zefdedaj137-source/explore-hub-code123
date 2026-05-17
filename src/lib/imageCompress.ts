/**
 * Client-side image compression before upload.
 * Uses canvas to resize and re-encode images as JPEG/WebP.
 */

interface CompressOptions {
  /** Max width or height in pixels (default: 1200) */
  maxSize?: number;
  /** JPEG/WebP quality 0-1 (default: 0.82) */
  quality?: number;
  /** Output mime type (default: image/jpeg) */
  type?: "image/jpeg" | "image/webp";
}

/**
 * Compress an image File, returning a new compressed File.
 * Skips compression if the file is already small enough (<200KB).
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxSize = 1200, quality = 0.82, type = "image/jpeg" } = options;

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip if already small
  if (file.size < 200 * 1024) return file;

  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;
  if (width > maxSize || height > maxSize) {
    if (width > height) {
      newWidth = maxSize;
      newHeight = Math.round((height / width) * maxSize);
    } else {
      newHeight = maxSize;
      newWidth = Math.round((width / height) * maxSize);
    }
  }

  const canvas = new OffscreenCanvas(newWidth, newHeight);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type, quality });
  const ext = type === "image/webp" ? "webp" : "jpg";
  const name = file.name.replace(/\.[^.]+$/, `.${ext}`);

  return new File([blob], name, { type });
}
