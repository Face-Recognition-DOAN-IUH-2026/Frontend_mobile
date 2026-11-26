import 'react-native';

jest.mock('expo-camera', () => ({
  Camera: 'Camera',
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: true }, jest.fn()],
}));


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('axios', () => ({
  create: () => ({
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }),
  post: jest.fn(),
  get: jest.fn(),
}));

jest.mock('zustand', () => ({
  create: () => jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'token' }),
}));

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue(''),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', android: { package: 'com.library.app', versionCode: 1 } } },
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
  applicationId: 'com.library.app',
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(),
  getContentUriAsync: jest.fn().mockResolvedValue('content://com.library.app.fileprovider/cache_updates/test.apk'),
}));

jest.mock('expo-intent-launcher', () => ({
  startActivityAsync: jest.fn().mockResolvedValue({ resultCode: 0 }),
}));