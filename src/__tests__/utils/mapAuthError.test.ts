import { mapAuthError } from '../../utils/mapAuthError';

describe('mapAuthError - login error mapping', () => {
  it('maps Invalid credentials to Vietnamese message', () => {
    const err = { response: { data: { error: 'Invalid credentials' } } };
    expect(mapAuthError(err)).toBe('Sai tài khoản hoặc mật khẩu');
  });

  it('maps Account is disabled', () => {
    const err = { response: { data: { error: 'Account is disabled' } } };
    expect(mapAuthError(err)).toBe('Tài khoản đã bị khóa');
  });

  it('maps Membership has expired', () => {
    const err = { response: { data: { error: 'Membership has expired' } } };
    expect(mapAuthError(err)).toBe('Thẻ thư viện đã hết hạn');
  });

  it('maps string data error directly', () => {
    const err = { response: { data: 'Some string error' } };
    expect(mapAuthError(err)).toBe('Some string error');
  });

  it('maps detail string', () => {
    const err = { response: { data: { detail: 'Lỗi từ server' } } };
    expect(mapAuthError(err)).toBe('Lỗi từ server');
  });

  it('maps detail array', () => {
    const err = { response: { data: { detail: ['Lỗi 1'] } } };
    expect(mapAuthError(err)).toBe('Lỗi 1');
  });

  it('maps message array', () => {
    const err = { response: { data: { message: ['Bad request'] } } };
    expect(mapAuthError(err)).toBe('Bad request');
  });

  it('maps ECONNABORTED timeout', () => {
    const err = { code: 'ECONNABORTED' };
    expect(mapAuthError(err)).toBe('Kết nối quá lâu. Vui lòng thử lại.');
  });

  it('maps network error without response', () => {
    const err = {};
    expect(mapAuthError(err)).toBe('Không thể kết nối server. Vui lòng kiểm tra mạng.');
  });

  it('maps detail string fallback to message', () => {
    const err = { response: { data: { message: 'Custom message' } } };
    expect(mapAuthError(err)).toBe('Custom message');
  });

  it('maps axios Network Error to Vietnamese connection message', () => {
    const err = { message: 'Network Error' };
    expect(mapAuthError(err)).toBe('Không thể kết nối server. Vui lòng kiểm tra mạng.');
  });

  it('maps ERR_NETWORK code to Vietnamese connection message', () => {
    const err = { code: 'ERR_NETWORK', message: 'Network Error' };
    expect(mapAuthError(err)).toBe('Không thể kết nối server. Vui lòng kiểm tra mạng.');
  });

  it('maps generic err.message fallback', () => {
    const err = { message: 'Some custom failure' };
    expect(mapAuthError(err)).toBe('Some custom failure');
  });

  it('defaults to Dang nhap that bai', () => {
    const err = { response: { data: {} } };
    expect(mapAuthError(err)).toBe('Đăng nhập thất bại');
  });
});
