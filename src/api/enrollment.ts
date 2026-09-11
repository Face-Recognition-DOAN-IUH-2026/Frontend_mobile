import api from './client';

export async function waitForEnrollment(jobId: string): Promise<void> {
  if (!jobId) throw new Error('Máy chủ không trả mã xử lý khuôn mặt');
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const { data } = await api.get(`/tasks/${encodeURIComponent(jobId)}`, { timeout: 10000 });
    if (['FAILURE', 'ERROR', 'REVOKED'].includes(data.status) || data.result?.error || data.result?.status === 'error') {
      throw new Error(data.result?.error || 'Xử lý khuôn mặt thất bại');
    }
    if (data.status === 'SUCCESS') return;
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Khuôn mặt vẫn đang được xử lý. Vui lòng kiểm tra lại sau; chưa thể xác nhận thành công.');
}
