/**
 * Lỗi đăng ký khuôn mặt (enroll-batch worker) — port từ Frontend_Web.
 * Worker trả về `{ error: "N angle(s) failed...", results: [{ angle, status, error }] }`
 * nhưng mobile trước đây chỉ hiện câu chung nên không biết góc nào lỗi.
 */

export const ANGLE_VI_LABELS: Record<string, string> = {
  frontal: 'Nhìn thẳng',
  right: 'Nghiêng phải',
  left: 'Nghiêng trái',
  down: 'Cúi xuống',
};

const ERROR_MESSAGES: Record<string, string> = {
  LIVENESS_FAILED: 'Ảnh không phải khuôn mặt thật, vui lòng chụp trực tiếp.',
  NO_FACE_DETECTED: 'Không tìm thấy khuôn mặt trong ảnh, vui lòng thử lại.',
  MULTIPLE_FACES: 'Có nhiều hơn 1 khuôn mặt trong ảnh, vui lòng chụp lại.',
  LOW_QUALITY: 'Ảnh quá mờ hoặc thiếu sáng, vui lòng chụp lại với ánh sáng tốt hơn.',
  FACE_DETECTION_FAILED: 'Không thể trích xuất khuôn mặt, vui lòng thử lại.',
};

export function mapEnrollError(code: string | null | undefined, fallback: string): string {
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code && code.length < 120 && !/^[A-Z_]+$/.test(code)) return code;
  return fallback;
}

export interface FailedAngle {
  id: string;
  label: string;
  error: string | null;
}

export function extractFailedAngles(result: unknown): FailedAngle[] {
  if (!result || typeof result !== 'object') return [];
  const results = (result as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];
  return results
    .filter(
      (r): r is { angle: string; status: string; error?: string } =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as { angle?: unknown }).angle === 'string' &&
        (r as { status?: unknown }).status !== 'success',
    )
    .map((r) => ({
      id: r.angle,
      label: ANGLE_VI_LABELS[r.angle] ?? r.angle,
      error: typeof r.error === 'string' ? r.error : null,
    }));
}

export function buildAngleErrorMessage(failed: FailedAngle[], fallback: string): string {
  if (failed.length === 0) return fallback;
  return failed
    .map((f) => `Góc ${f.label} lỗi: ${mapEnrollError(f.error, 'không đạt yêu cầu')}`)
    .join('\n');
}
