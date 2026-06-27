import api from './client';
import { BorrowResponse, ReturnResponse, BorrowRecord, Book, BookWithStats, BookImportResponse, StaffPatronActiveBorrowsResponse, CreateBorrowSlipRequest, CreateBorrowSlipResponse, LookupBorrowSlipRequest, LookupBorrowSlipResponse, ConfirmBorrowSlipRequest } from '../types';

export interface BookReservation {
  id: string;
  book_id: string;
  patron_id: string;
  reserved_at: string;
  expires_at: string;
  status: string;
  notified_at: string | null;
  book: {
    id: string;
    isbn: string;
    title: string;
    author?: string;
    cover_url?: string;
  };
}

export const getMyReservations = async (): Promise<{ items: BookReservation[]; total: number }> => {
  const response = await api.get<{ items: BookReservation[]; total: number }>('/borrow/reservations');
  return response.data;
};

export const reserveBook = async (bookId: string): Promise<{ message: string; reservation: BookReservation }> => {
  const response = await api.post<{ message: string; reservation: BookReservation }>('/borrow/reserve', { book_id: bookId });
  return response.data;
};

export const cancelReservation = async (reservationId: string): Promise<void> => {
  await api.delete(`/borrow/reservations/${reservationId}`);
};

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
};
