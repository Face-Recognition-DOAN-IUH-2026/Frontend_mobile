import api from './client';
import { BorrowResponse, ReturnResponse, BorrowRecord, Book, BookWithStats, BookImportResponse, StaffPatronActiveBorrowsResponse, CreateBorrowSlipRequest, CreateBorrowSlipResponse, LookupBorrowSlipRequest, LookupBorrowSlipResponse, ConfirmBorrowSlipRequest } from '../types';

export interface BorrowRequest {
  barcode: string;
}

export const borrowApi = {
  borrowBook: async (barcode: string): Promise<BorrowResponse> => {
    const response = await api.post<BorrowResponse>('/borrow/', { barcode });
    return response.data;
  },

  returnBook: async (barcode: string, note?: string): Promise<ReturnResponse> => {
    const response = await api.post<ReturnResponse>('/borrow/staff-return', { barcode, note });
    return response.data;
  },

  lookupByBarcode: async (barcode: string): Promise<BorrowRecord> => {
    const response = await api.get<BorrowRecord>(`/borrow/barcode/${encodeURIComponent(barcode)}`);
    return response.data;
  },

  getActiveBorrowsByStudentCode: async (studentCode: string): Promise<StaffPatronActiveBorrowsResponse> => {
    const response = await api.get<StaffPatronActiveBorrowsResponse>(
      `/borrow/staff/patrons/${encodeURIComponent(studentCode)}/active`,
    );
    return response.data;
  },

  getPatronActiveBorrows: async (): Promise<StaffPatronActiveBorrowsResponse> => {
    const response = await api.get<StaffPatronActiveBorrowsResponse>('/borrow/patron/active');
    return response.data;
  },

  returnByPatron: async (studentCode: string, barcodeOrIsbn: string, note?: string): Promise<ReturnResponse> => {
    const response = await api.post<ReturnResponse>('/borrow/staff-return/by-patron', {
      student_code: studentCode,
      barcode_or_isbn: barcodeOrIsbn,
      note,
    });
    return response.data;
  },

  getHistory: async (status?: string): Promise<BorrowRecord[]> => {
    const params = status ? { status_filter: status } : {};
    const response = await api.get<BorrowRecord[]>('/borrow/history', { params });
    return response.data;
  },

  getBooks: async (skip = 0, limit = 50): Promise<Book[]> => {
    const response = await api.get<Book[]>('/borrow/books', {
      params: { skip, limit },
    });
    return response.data;
  },

  getBook: async (isbn: string): Promise<BookWithStats> => {
    const response = await api.get<BookWithStats>(`/borrow/book/${isbn}`);
    return response.data;
  },

  lookupBookByIsbn: async (isbn: string): Promise<BookWithStats> => {
    const response = await api.get<BookWithStats>(`/borrow/book/${isbn}`);
    return response.data;
  },

  batchImportByIsbn: async (items: { isbn: string; quantity: number }[]): Promise<BookImportResponse> => {
    const response = await api.post<BookImportResponse>('/borrow/isbn-import/batch', { items });
    return response.data;
  },

  createSlip: async (data: CreateBorrowSlipRequest): Promise<CreateBorrowSlipResponse> => {
    const response = await api.post<CreateBorrowSlipResponse>('/borrow/staff/slip/create', data);
    return response.data;
  },

  lookupBorrowSlip: async (data: LookupBorrowSlipRequest): Promise<LookupBorrowSlipResponse> => {
    const response = await api.post<LookupBorrowSlipResponse>('/borrow/staff/slip/lookup', data);
    return response.data;
  },

  confirmBorrowSlip: async (data: ConfirmBorrowSlipRequest): Promise<CreateBorrowSlipResponse> => {
    const response = await api.post<CreateBorrowSlipResponse>('/borrow/staff/slip/confirm', data);
    return response.data;
  },
};
