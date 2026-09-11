jest.mock('../../api/client', () => ({ __esModule: true, default: { get: jest.fn() } }));
import api from '../../api/client';
import { waitForEnrollment } from '../../api/enrollment';

it('rejects worker errors even when Celery reports SUCCESS', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { status: 'SUCCESS', result: { status: 'error', error: 'No face detected' } } });
  await expect(waitForEnrollment('job')).rejects.toThrow('No face detected');
});
it('accepts completed enrollment', async () => {
  (api.get as jest.Mock).mockResolvedValue({ data: { status: 'SUCCESS', result: { status: 'success' } } });
  await expect(waitForEnrollment('job')).resolves.toBeUndefined();
});
