/**
 * Kiểm tra chất lượng ảnh trước khi upload enroll-batch.
 * Mirror backend `FaceModel.estimate_blur` (Laplacian variance) để phát hiện sớm
 * ảnh quá mờ trên mobile, nhắc người dùng chụp lại ngay thay vì chờ worker rollback
 * toàn bộ 4 góc.
 */

/**
 * Tính độ mượt (Laplacian variance) từ mảng RGBA ảnh thô.
 * Trả về -1 nếu không tính được (ảnh rỗng / không hợp lệ).
 */
export function blurScoreFromRGBA(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): number {
  if (!pixels || pixels.length < width * height * 4 || width <= 0 || height <= 0) {
    return -1;
  }

  // Chuyển sang ảnh xám đơn giản (luminance) rồi tính độ dao động cục bộ
  // (proxy cho Laplacian variance: độ sắc nét của ảnh).
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      gray[y * width + x] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = gray[y * width + x];
      const lap =
        gray[(y - 1) * width + x] +
        gray[(y + 1) * width + x] +
        gray[y * width + x - 1] +
        gray[y * width + x + 1] -
        4 * center;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }

  if (count === 0) return -1;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Kiểm tra ảnh có quá mờ không (dựa trên blur score).
 * Trả về true nếu blurry (dưới ngưỡng), false nếu đủ sắc nét.
 * Trả về false khi không tính được (an toàn: không chặn upload do lỗi tính toán).
 */
export function isImageBlurry(
  score: number | null | undefined,
  threshold: number = 25,
): boolean {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return false;
  }
  return score < threshold;
}

/**
 * Tính blur score từ chuỗi base64 (dùng trước khi gọi API enroll-batch).
 * Trả về Promise resolve -1 nếu base64 không hợp lệ hoặc ảnh không decode được.
 * Yêu cầu môi trường có `Image` (browser) hoặc `HTMLCanvasElement` (React Native
 * với expo / polyfill). Nếu không có môi trường decode ảnh → resolve -1.
 */
export function blurScoreForBase64(
  base64: string | null | undefined,
): Promise<number> {
  if (!base64 || typeof base64 !== 'string') return Promise.resolve(-1);

  let dataUrl: string;
  try {
    dataUrl =
      base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  } catch {
    return Promise.resolve(-1);
  }

  // Trong môi trường không có Image/Canvas (jest/node) resolve -1 để caller tự quyết định.
  const ImageCtor =
    typeof Image !== 'undefined' ? Image : (globalThis as any)?.Image;
  const canvasEl =
    typeof document !== 'undefined' && document.createElement
      ? document.createElement('canvas')
      : null;
  if (!ImageCtor || !canvasEl) return Promise.resolve(-1);

  return new Promise<number>((resolve) => {
    const img = new ImageCtor();
    img.onload = () => {
      const canvas = canvasEl as HTMLCanvasElement;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(-1);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      resolve(blurScoreFromRGBA(imageData.data, img.width, img.height));
    };
    img.onerror = () => resolve(-1);
    img.src = dataUrl;
  });
}
