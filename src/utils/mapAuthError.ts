export function mapAuthError(err: any): string {
  if (err?.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (data.error) {
      const backendError = data.error;
      if (backendError === 'Invalid credentials') {
        return 'Sai tài khoản hoặc mật khẩu';
      }
      if (backendError === 'Invalid password') {
        return 'Mật khẩu không chính xác';
      }
      if (backendError === 'Account is disabled') {
        return 'Tài khoản đã bị khóa';
      }
      if (backendError === 'Account is not active') {
        return 'Tài khoản chưa được kích hoạt hoặc đã bị khóa';
      }
      if (backendError === 'Membership has expired') {
        return 'Thẻ thư viện đã hết hạn';
      }
      if (backendError === 'User not found') {
        return 'Tài khoản không tồn tại';
      }
      if (typeof backendError === 'string' && (backendError.includes('student_code') || backendError.includes('password are required'))) {
        return 'Vui lòng nhập đầy đủ mã sinh viên và mật khẩu';
      }
      if (typeof backendError === 'string' && backendError.trim()) {
        return backendError;
      }
    }
    if (data.detail) {
      if (typeof data.detail === 'string' && data.detail.trim()) {
        if (data.detail === 'Invalid credentials') {
          return 'Sai tài khoản hoặc mật khẩu';
        }
        if (data.detail === 'Invalid password') {
          return 'Mật khẩu không chính xác';
        }
        return data.detail;
      }
      if (Array.isArray(data.detail) && data.detail.length > 0) {
        return data.detail[0];
      }
    }
    if (Array.isArray(data.message) && data.message.length > 0) {
      return data.message[0];
    }
    if (data.message && typeof data.message === 'string' && data.message.trim()) {
      if (data.message === 'Invalid credentials') {
        return 'Sai tài khoản hoặc mật khẩu';
      }
      if (data.message === 'Invalid password') {
        return 'Mật khẩu không chính xác';
      }
      return data.message;
    }
  }
  if (err?.code === 'ECONNABORTED') {
    return 'Kết nối quá lâu. Vui lòng thử lại.';
  }
  if (err?.code === 'ERR_NETWORK' || err?.message === 'Network Error' || err?.message === 'TypeError: Network request failed') {
    return 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
  }
  if (err?.message && typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  if (!err?.response) {
    return 'Không thể kết nối server. Vui lòng kiểm tra mạng.';
  }
  return 'Đăng nhập thất bại';
}
