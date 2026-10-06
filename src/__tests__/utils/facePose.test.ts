import { assessPose, POSE_RANGES, type FaceAngleId } from '../../utils/facePose';

describe('facePose.assessPose (pose-gate mobile, mirror ngưỡng web)', () => {
  it('chính diện: yaw/pitch trong ±12 mới đạt', () => {
    expect(assessPose(0, 0, 'frontal').ok).toBe(true);
    expect(assessPose(12, -12, 'frontal').ok).toBe(true);
    expect(assessPose(13, 0, 'frontal').ok).toBe(false);
    expect(assessPose(0, 20, 'frontal').ok).toBe(false);
  });

  it('nghiêng phải/trái: cần |yaw| 20-50, sai hướng không đạt', () => {
    expect(assessPose(30, 0, 'right').ok).toBe(true);
    expect(assessPose(-30, 0, 'right').ok).toBe(false);
    expect(assessPose(10, 0, 'right').ok).toBe(false);
    expect(assessPose(-30, 0, 'left').ok).toBe(true);
    expect(assessPose(30, 0, 'left').ok).toBe(false);
  });

  it('cúi nhẹ: pitch 15-45, yaw gần thẳng', () => {
    expect(assessPose(0, 25, 'down').ok).toBe(true);
    expect(assessPose(0, 5, 'down').ok).toBe(false);
    expect(assessPose(30, 25, 'down').ok).toBe(false);
  });

  it('gợi ý đúng hướng cần sửa khi sai', () => {
    const r = assessPose(-30, 0, 'right');
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/phải/i);
  });

  it('bảng ngưỡng khớp web (yaw/pitch)', () => {
    expect(POSE_RANGES.frontal).toEqual({ yaw: [-12, 12], pitch: [-12, 12] });
    expect(POSE_RANGES.down).toEqual({ yaw: [-15, 15], pitch: [15, 45] });
  });

  it('không có số đo Euler thì rớt với gợi ý chung', () => {
    const r = assessPose(null, 0, 'frontal');
    expect(r.ok).toBe(false);
    expect(r.hint).toMatch(/khuôn mặt/i);
  });
});
