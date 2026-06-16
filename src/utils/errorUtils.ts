export function getErrorMessage(err: unknown): string {
  if (!err) return 'Lỗi không xác định';
  if (typeof err === 'string') return err;

  const response = (err as any)?.response;
  const detail = response?.data?.detail || response?.data?.error;

  if (detail) {
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: any) =>
          typeof d === 'string' ? d : `${d.loc?.join('.')}: ${d.msg}`
        )
        .join('; ');
    }
    if (typeof detail === 'object') {
      return detail.msg || detail.message || JSON.stringify(detail);
    }
  }

  return (err as any)?.message || (err as any)?.msg || String(err);
}