export interface PatronFineItem {
  record_id: string;
  book: { title: string; isbn: string } | null;
  barcode: string | null;
  overdue_fine: number;
  damage_fee: number;
  total: number;
  return_at: string | null;
}

export interface PaymentOrderResponse {
  id: string;
  orderCode: string;
  patronId: string;
  amount: number;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  paymentMethod: 'vietqr' | 'payos' | 'vnpay' | 'cash';
  qrUrl: string | null;
  qrData: string | null;
  expiresAt: string;
  recordIds: string[];
}

export interface PaymentOrderStatusResponse {
  orderCode: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  amount: number;
  paidAt?: string | null;
}
