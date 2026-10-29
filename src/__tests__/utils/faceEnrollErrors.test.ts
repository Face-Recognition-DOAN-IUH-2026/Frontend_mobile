import {
  ANGLE_VI_LABELS,
  mapEnrollError,
  extractFailedAngles,
  buildAngleErrorMessage,
} from '../../utils/faceEnrollErrors';

describe('faceEnrollErrors (mobile)', () => {
  it('có đủ nhãn tiếng Việt cho 4 góc (thẳng/phải/trái/cúi)', () => {
    expect(ANGLE_VI_LABELS).toEqual({
      frontal: 'Nhìn thẳng',
      right: 'Nghiêng phải',
      left: 'Nghiêng trái',
      down: 'Cúi xuống',
    });
  });

  it('map mã lỗi backend sang tiếng Việt', () => {
    expect(mapEnrollError('LOW_QUALITY', 'fallback')).toMatch(/mờ|thiếu sáng/);
    expect(mapEnrollError('MOTION_BLUR', 'fallback')).toMatch(/mờ|thiếu sáng|chụp lại/);
    expect(mapEnrollError('NO_FACE_DETECTED', 'fallback')).toMatch(/Không tìm thấy/);
    expect(mapEnrollError('Quá thời gian chờ.', 'fallback')).toBe('Quá thời gian chờ.');
    expect(mapEnrollError('WEIRD_CODE', 'fallback')).toBe('fallback');
    expect(mapEnrollError(null, 'fallback')).toBe('fallback');
  });

  it('trích góc lỗi từ result worker (1 angle failed)', () => {
    const failed = extractFailedAngles({
      status: 'error',
      error: '1 angle(s) failed, all rolled back',
      results: [
        { angle: 'frontal', status: 'success' },
        { angle: 'right', status: 'error', error: 'LOW_QUALITY' },
        { angle: 'left', status: 'success' },
        { angle: 'down', status: 'success' },
      ],
    });
    expect(failed).toEqual([{ id: 'right', label: 'Nghiêng phải', error: 'LOW_QUALITY' }]);
  });

  it('trả rỗng khi không có chi tiết', () => {
    expect(extractFailedAngles(null)).toEqual([]);
    expect(extractFailedAngles({})).toEqual([]);
  });

  it('ghép câu báo rõ góc nào lỗi để chụp lại', () => {
    const msg = buildAngleErrorMessage(
      [{ id: 'left', label: 'Nghiêng trái', error: 'NO_FACE_DETECTED' }],
      'Đăng ký thất bại.'
    );
    expect(msg).toMatch(/Nghiêng trái/);
    expect(msg).toMatch(/Không tìm thấy/);
  });
});
