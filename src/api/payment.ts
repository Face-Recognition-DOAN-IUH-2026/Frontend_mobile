import api from './client';
import { PatronFineItem, PaymentOrderResponse, PaymentOrderStatusResponse } from '../types/payment';

export const paymentApi = {
  getMyFines: async (): Promise<PatronFineItem[]> => {
    const response = await api.get<PatronFineItem[]>('/borrow/patron/fines');
    return response.data;
  },

  createPaymentOrder: async (
    recordIds: string[],
    paymentMethod: 'vietqr' | 'payos' = 'vietqr'
  ): Promise<PaymentOrderResponse> => {
    const response = await api.post<PaymentOrderResponse>('/borrow/payments/create', {
      record_ids: recordIds,
      payment_method: paymentMethod,
    });
    return response.data;
  },

  getOrderStatus: async (orderCode: string): Promise<PaymentOrderStatusResponse> => {
    const response = await api.get<PaymentOrderStatusResponse>(`/borrow/payments/${orderCode}/status`);
    return response.data;
  },

  simulatePayment: async (orderCode: string): Promise<any> => {
    const response = await api.post(`/borrow/payments/${encodeURIComponent(orderCode)}/simulate`);
    return response.data;
  },
};
