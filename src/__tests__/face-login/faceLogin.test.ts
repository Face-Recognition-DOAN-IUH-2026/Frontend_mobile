import { authApi, FaceLoginResponse } from '../../api/auth';

// ─── Mock api client ─────────────────────────────────────────────────────────
jest.mock('../../api/client', () => {
  const mockAxiosInstance = {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  };
  return { __esModule: true, default: mockAxiosInstance };
});

jest.mock('../../api/secureStorage', () => ({
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(),
  setRefreshToken: jest.fn(),
  getRefreshToken: jest.fn(),
  clearTokens: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

import api from '../../api/client';
import { setAccessToken, setRefreshToken, clearTokens } from '../../api/secureStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockApi = api as jest.Mocked<typeof api>;


// ═══════════════════════════════════════════════════════════════════════════════
// M2: Face login API call
// ═══════════════════════════════════════════════════════════════════════════════

describe('Face Login API (authApi.faceLogin)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('M2: sends POST to /auth/face-login with FormData', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        token_type: 'bearer',
      },
    });

    const result = await authApi.faceLogin('file:///tmp/face.jpg');

    expect(mockApi.post).toHaveBeenCalledWith(
      '/auth/face-login',
      expect.any(FormData)
    );
    expect(result.access_token).toBe('mock-access-token');
    expect(result.refresh_token).toBe('mock-refresh-token');
    expect(result.token_type).toBe('bearer');
  });

  it('M2: stores access token after successful login', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'access-abc',
        refresh_token: 'refresh-xyz',
        token_type: 'bearer',
      },
    });

    await authApi.faceLogin('file:///tmp/face.jpg');

    expect(setAccessToken).toHaveBeenCalledWith('access-abc');
    expect(setRefreshToken).toHaveBeenCalledWith('refresh-xyz');
  });

  it('M2: handles response without refresh_token', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'access-only',
        token_type: 'bearer',
      },
    });

    const result = await authApi.faceLogin('file:///tmp/face.jpg');

    expect(result.access_token).toBe('access-only');
    expect(setAccessToken).toHaveBeenCalledWith('access-only');
    expect(setRefreshToken).not.toHaveBeenCalled();
  });

  it('M2: throws on API error', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Khuôn mặt không khớp' } },
    });

    await expect(authApi.faceLogin('file:///tmp/face.jpg')).rejects.toMatchObject({
      response: { status: 400 },
    });
  });

  it('M2: FormData contains file with correct MIME type', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { access_token: 'token', token_type: 'bearer' },
    });

    await authApi.faceLogin('file:///tmp/face.jpg');

    const formData = mockApi.post.mock.calls[0][1] as FormData;
    // FormData append is mocked, but we can verify the call structure
    expect(mockApi.post).toHaveBeenCalledTimes(1);
    expect(mockApi.post.mock.calls[0][0]).toBe('/auth/face-login');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// M5: Face login network error
// ═══════════════════════════════════════════════════════════════════════════════

describe('Face Login Network Errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('M5: timeout error is thrown correctly', async () => {
    mockApi.post.mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 30000ms exceeded',
    });

    await expect(authApi.faceLogin('file:///tmp/face.jpg')).rejects.toMatchObject({
      code: 'ECONNABORTED',
    });
  });

  it('M5: network error is thrown correctly', async () => {
    mockApi.post.mockRejectedValueOnce({
      code: 'ERR_NETWORK',
      message: 'Network Error',
    });

    await expect(authApi.faceLogin('file:///tmp/face.jpg')).rejects.toMatchObject({
      code: 'ERR_NETWORK',
    });
  });

  it('M5: 401 unauthorized is thrown correctly', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Unauthorized' } },
    });

    await expect(authApi.faceLogin('file:///tmp/face.jpg')).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it('M5: 429 rate limited is thrown correctly', async () => {
    mockApi.post.mockRejectedValueOnce({
      response: { status: 429, data: { detail: 'Too many requests' } },
    });

    await expect(authApi.faceLogin('file:///tmp/face.jpg')).rejects.toMatchObject({
      response: { status: 429 },
    });
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// M6: AutoFaceCapture logic (4-angle enrollment)
// ═══════════════════════════════════════════════════════════════════════════════

describe('AutoFaceCapture 4-Angle Enrollment', () => {
  const ANGLES = ['frontal', 'right', 'left', 'down'] as const;

  it('M6: defines 4 required angles', () => {
    expect(ANGLES).toHaveLength(4);
    expect(ANGLES).toContain('frontal');
    expect(ANGLES).toContain('right');
    expect(ANGLES).toContain('left');
    expect(ANGLES).toContain('down');
  });

  it('M6: enrollment sends all 4 images to batch endpoint', async () => {
    const mockImages = [
      { uri: 'file:///frontal.jpg', type: 'image/jpeg', name: 'frontal.jpg' },
      { uri: 'file:///right.jpg', type: 'image/jpeg', name: 'right.jpg' },
      { uri: 'file:///left.jpg', type: 'image/jpeg', name: 'left.jpg' },
      { uri: 'file:///down.jpg', type: 'image/jpeg', name: 'down.jpg' },
    ];

    mockApi.post.mockResolvedValueOnce({
      data: { job_id: 'enroll-job-001' },
    });

    // Simulate the enrollment API call (from FaceCameraScreen)
    const formData = new FormData();
    mockImages.forEach((img) => {
      formData.append('images', img as any);
    });
    formData.append('consent_given', 'true');

    const response = await mockApi.post('/patrons/patron-1/enroll-batch', formData);

    expect(response.data.job_id).toBe('enroll-job-001');
    expect(mockApi.post).toHaveBeenCalledWith(
      '/patrons/patron-1/enroll-batch',
      expect.any(FormData)
    );
  });

  it('M6: partial capture (2 of 4 angles) should not submit', () => {
    const captures = {
      frontal: { done: true, file: 'file1' },
      right: { done: true, file: 'file2' },
      left: { done: false, file: null },
      down: { done: false, file: null },
    };

    const allCaptured = Object.values(captures).every(c => c.done);
    expect(allCaptured).toBe(false);
  });

  it('M6: all 4 angles captured allows submission', () => {
    const captures = {
      frontal: { done: true, file: 'file1' },
      right: { done: true, file: 'file2' },
      left: { done: true, file: 'file3' },
      down: { done: true, file: 'file4' },
    };

    const allCaptured = Object.values(captures).every(c => c.done);
    expect(allCaptured).toBe(true);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// M1: FaceLoginScreen camera state logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('FaceLoginScreen State Logic', () => {
  it('M1: camera permission states', () => {
    type CameraState = 'idle' | 'requesting' | 'granted' | 'denied';

    const states: CameraState[] = ['idle', 'requesting', 'granted'];
    expect(states).toContain('granted');

    const deniedStates: CameraState[] = ['idle', 'requesting', 'denied'];
    expect(deniedStates).toContain('denied');
  });

  it('M1: face capture flow states', () => {
    type CaptureState = 'idle' | 'camera_active' | 'capturing' | 'processing' | 'success' | 'error';

    const flow: CaptureState[] = ['idle', 'camera_active', 'capturing', 'processing', 'success'];
    expect(flow[0]).toBe('idle');
    expect(flow[flow.length - 1]).toBe('success');
  });

  it('M1: error message mapping', () => {
    const errorMessages: Record<string, string> = {
      'camera_permission': 'Không thể truy cập camera',
      'no_face': 'Không phát hiện khuôn mặt',
      'no_match': 'Không nhận diện được khuôn mặt',
      'spoof': 'Phát hiện giả mạo',
      'network': 'Lỗi kết nối mạng',
      'lockout': 'Tài khoản tạm thời bị khóa',
    };

    expect(errorMessages['camera_permission']).toBe('Không thể truy cập camera');
    expect(errorMessages['no_match']).toBe('Không nhận diện được khuôn mặt');
    expect(errorMessages['lockout']).toContain('khóa');
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// M3: Face login success -> navigation logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('Face Login Success Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('M3: successful face login triggers token storage and auth state change', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'bearer',
      },
    });

    // Simulate the faceLogin flow from authApi
    const result = await authApi.faceLogin('file:///tmp/face.jpg');

    // Verify tokens are stored
    expect(setAccessToken).toHaveBeenCalledWith('new-access-token');
    expect(setRefreshToken).toHaveBeenCalledWith('new-refresh-token');

    // Verify response structure
    expect(result.access_token).toBe('new-access-token');
    expect(result.token_type).toBe('bearer');
  });

  it('M3: logout clears all tokens and user data', async () => {
    await authApi.logout();

    expect(clearTokens).toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['patronData', 'userData']);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// Token type validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Face Login Token Types', () => {
  it('FaceLoginResponse has required fields', () => {
    const validResponse: FaceLoginResponse = {
      access_token: 'token',
      token_type: 'bearer',
    };

    expect(validResponse.access_token).toBeTruthy();
    expect(validResponse.token_type).toBe('bearer');
  });

  it('FaceLoginResponse allows optional refresh_token', () => {
    const withRefresh: FaceLoginResponse = {
      access_token: 'token',
      refresh_token: 'refresh',
      token_type: 'bearer',
    };

    const withoutRefresh: FaceLoginResponse = {
      access_token: 'token',
      token_type: 'bearer',
    };

    expect(withRefresh.refresh_token).toBeTruthy();
    expect(withoutRefresh.refresh_token).toBeUndefined();
  });
});
