import {
  blurScoreFromRGBA,
  isImageBlurry,
  blurScoreForBase64,
} from '../../utils/faceQuality';

describe('faceQuality (kiểm tra độ mờ trước khi upload)', () => {
  it('isImageBlurry luôn trả về false (bỏ qua kiểm tra mờ ở client)', () => {
    expect(isImageBlurry(0, 10)).toBe(false);
    expect(isImageBlurry(5, 10)).toBe(false);
    expect(isImageBlurry(10, 10)).toBe(false);
    expect(isImageBlurry(100, 25)).toBe(false);
    expect(isImageBlurry(null, 10)).toBe(false);
    expect(isImageBlurry(undefined, 10)).toBe(false);
    expect(isImageBlurry(NaN, 10)).toBe(false);
  });

  it('blurScoreFromRGBA tính điểm cho ảnh xám đơn giản', () => {
    // Ảnh 3x3, mỗi pixel [r,g,b,a]; các pixel bên trái đen, bên phải trắng -> dao động cao
    const gray = new Uint8ClampedArray([
      0, 0, 0, 255, 128, 128, 255, 255, 255, 0, 0, 0, 255,
      0, 0, 0, 255, 128, 128, 255, 255, 255, 0, 0, 0, 255,
      0, 0, 0, 255, 128, 128, 255, 255, 255, 0, 0, 0, 255,
    ]);
    const score = blurScoreFromRGBA(gray, 3, 3);
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('blurScoreForBase64 resolve -1 khi base64 không hợp lệ', async () => {
    expect(await blurScoreForBase64('not-a-valid-base64!!!')).toBe(-1);
    expect(await blurScoreForBase64('')).toBe(-1);
    expect(await blurScoreForBase64(null)).toBe(-1);
    expect(await blurScoreForBase64(undefined)).toBe(-1);
  });
});
