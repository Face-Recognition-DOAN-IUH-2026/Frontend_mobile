import api from './client';
import { BorrowResponse, ReturnResponse, BorrowRecord, Book } from '../types';

export interface BorrowRequest {
  isbn: string;
}

export const borrowApi = {
  borrowBook: async (isbn: string): Promise<BorrowResponse> => {
    const response = await api.post<BorrowResponse>('/borrow/', { isbn });
    return response.data;
  },

  returnBook: async (isbn: string): Promise<ReturnResponse> => {
    const response = await api.post<ReturnResponse>('/borrow/return', { isbn });
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

  getBook: async (isbn: string): Promise<Book> => {
    const response = await api.get<Book>(`/borrow/book/${isbn}`);
    return response.data;
  },
};