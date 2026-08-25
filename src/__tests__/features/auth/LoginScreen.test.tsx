// @ts-nocheck
import fs from 'fs';
import path from 'path';
import { mapAuthError } from '../../../utils/mapAuthError';

function createInvalidCredentialsError() {
  return {
    response: { data: { error: 'Invalid credentials' }, status: 401 },
    message: 'Request failed with status code 401',
  };
}

describe('LoginScreen - error feedback', () => {
  it('LoginScreen file contains HelperText with helper-error and uses mapAuthError (GREEN)', () => {
    const filePath = path.join(__dirname, '../../../features/auth/screens/LoginScreen.tsx');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('HelperText');
    expect(content).toContain('helper-error');
    expect(content).toContain('mapAuthError');
    expect(content).toContain("from '../../../utils/mapAuthError'");
  });

  it('maps Invalid credentials to Vietnamese via mapAuthError', () => {
    expect(mapAuthError(createInvalidCredentialsError())).toBe('Sai tài khoản hoặc mật khẩu');
  });

  it('mapAuthError handles all required cases', () => {
    expect(mapAuthError({ response: { data: { error: 'Account is disabled' } } })).toBe('Tài khoản đã bị khóa');
    expect(mapAuthError({ response: { data: { error: 'Membership has expired' } } })).toBe('Thẻ thư viện đã hết hạn');
    expect(mapAuthError({ code: 'ECONNABORTED' })).toBe('Kết nối quá lâu. Vui lòng thử lại.');
    expect(mapAuthError({})).toBe('Không thể kết nối server. Vui lòng kiểm tra mạng.');
  });
});
