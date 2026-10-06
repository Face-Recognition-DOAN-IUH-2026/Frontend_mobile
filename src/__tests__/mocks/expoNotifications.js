module.exports = {
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'dummy-token' }),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
};
