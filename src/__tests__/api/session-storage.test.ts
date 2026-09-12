jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn(), deleteItemAsync: jest.fn(), getItemAsync: jest.fn() }));
import * as storage from 'expo-secure-store';
import { clearTokens, getSessionGeneration, saveSessionTokens } from '../../api/secureStorage';

it('logout deletes tokens after an in-flight refresh write completes', async () => {
  let release!: () => void;
  (storage.setItemAsync as jest.Mock).mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  const pending = saveSessionTokens('access', 'refresh', getSessionGeneration());
  const assertion = expect(pending).rejects.toThrow('Session changed');
  await Promise.resolve();
  const logout = clearTokens();
  release();
  await assertion;
  await logout;
  const lastWrite = Math.max(...(storage.setItemAsync as jest.Mock).mock.invocationCallOrder);
  expect((storage.deleteItemAsync as jest.Mock).mock.invocationCallOrder.every(order => order > lastWrite)).toBe(true);
});

it('rejects results from a session that has already logged out', async () => {
  const generation = getSessionGeneration();
  await clearTokens();
  jest.clearAllMocks();
  await expect(saveSessionTokens('stale', 'stale', generation)).rejects.toThrow('Session changed');
  expect(storage.setItemAsync).not.toHaveBeenCalled();
});
