import api from './client';
import { BorrowResponse, ReturnResponse, BorrowRecord, Book, BookWithStats, BookImportResponse, StaffPatronActiveBorrowsResponse, CreateBorrowSlipRequest, CreateBorrowSlipResponse, LookupBorrowSlipRequest, LookupBorrowSlipResponse, ConfirmBorrowSlipRequest } from '../types';

export interface WaitlistEntry {
  id: string;
  book_id: string;
  status: string;
  created_at: string;
  book: {
    id: string;
    isbn: string;
    title: string;
    author?: string;
    cover_url?: string;
    total_copies?: number;
    available_copies?: number;
  };
}

export const getMyWaitlist = async (): Promise<{ items: WaitlistEntry[]; total: number }> => {
  const response = await api.get<{ items: WaitlistEntry[]; total: number }>('/borrow/waitlist');
  return response.data;
};

export const joinWaitlist = async (bookId: string): Promise<{ id: string; book_id: string; status: string }> => {
  const response = await api.post<{ id: string; book_id: string; status: string }>('/borrow/waitlist', { book_id: bookId });
  return response.data;
};

export const leaveWaitlist = async (waitlistId: string): Promise<void> => {
  await api.delete(`/borrow/waitlist/${waitlistId}`);
};

export const borrowApi = {
  getBooksPage: async (skip: number, limit: number, search: string): Promise<{ items: Book[]; total: number }> => {
    const { data } = await api.get('/borrow/books', { params: { skip, limit, search } });
    return data;
  },
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
    const response = await api.get<{ items: Book[]; total: number } | Book[]>('/borrow/books', {
      params: { skip, limit },
    });
    const data = response.data;
    return Array.isArray(data) ? data : data.items || [];
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

  getBorrowConfig: async (): Promise<{ max_borrow_books: number; max_borrow_books_per_slip: number; max_borrow_days: number }> => {
    const response = await api.get('/borrow/config');
    return response.data;
  },

  renewBorrow: async (borrowId: string): Promise<{ success: boolean; message: string; due_at?: string; renewal_count?: number }> => {
    const response = await api.post('/borrow/renew', { record_id: borrowId, borrow_id: borrowId });
    return response.data;
  },
};
