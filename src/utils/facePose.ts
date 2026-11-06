/**
 * Pose-gate đo góc đầu cho AutoFaceCapture (mobile) — mirror ngưỡng web
 * (MultiAngleCapture yaw/pitch), dùng Euler angles của ML Kit:
 * headEulerAngleY ~ yaw (quay trái/phải), headEulerAngleX ~ pitch (ngửa/cúi).
 *
 * LƯU Ý MIRROR: camera trước lật ảnh nên dấu Y có thể đảo so với thực tế.
 * Bảng dưới đã được cân bằng độ nhạy (Yaw 15° - 45°) để người dùng dễ đạt yêu cầu
 * mà vẫn đảm bảo tính toán 3D của khuôn mặt.
 */

export type FaceAngleId = 'frontal' | 'right' | 'left' | 'down';

export const POSE_RANGES: Record<FaceAngleId, { yaw: [number, number]; pitch: [number, number] }> = {
  frontal: { yaw: [-15, 15], pitch: [-15, 15] },
  right: { yaw: [15, 45], pitch: [-20, 20] },
  left: { yaw: [-45, -15], pitch: [-20, 20] },
  down: { yaw: [-18, 18], pitch: [12, 45] },
};

const FIX_HINT: Record<FaceAngleId, string> = {
  frontal: 'Xoay mặt về chính diện, nhìn thẳng vào camera',
  right: 'Xoay đầu sang phải thêm chút nữa',
  left: 'Xoay đầu sang trái thêm chút nữa',
  down: 'Cúi nhẹ cằm xuống thêm chút nữa',
};

export interface PoseVerdict {
  ok: boolean;
  hint: string;
}

export function assessPose(
  yawY: number | null | undefined,
  pitchX: number | null | undefined,
  angle: FaceAngleId,
): PoseVerdict {
  if (yawY === null || yawY === undefined || pitchX === null || pitchX === undefined) {
    return { ok: false, hint: 'Không xác định được khuôn mặt, giữ mặt trong khung oval' };
  }
  const range = POSE_RANGES[angle];
  const yawOk = yawY >= range.yaw[0] && yawY <= range.yaw[1];
  const pitchOk = pitchX >= range.pitch[0] && pitchX <= range.pitch[1];
  if (yawOk && pitchOk) return { ok: true, hint: '' };
  return { ok: false, hint: FIX_HINT[angle] };
}
