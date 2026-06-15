import axios from 'axios';
import { OpenLibraryBook } from '../types';
import { devError } from '../utils/logger';

const OPEN_LIBRARY_API = 'https://openlibrary.org';

export const openLibraryApi = {
  getBookByIsbn: async (isbn: string): Promise<OpenLibraryBook | null> => {
    try {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      const response = await axios.get(`${OPEN_LIBRARY_API}/api/books`, {
        params: {
          bibkeys: `ISBN:${cleanIsbn}`,
          format: 'json',
          jscmd: 'data',
        },
        timeout: 10000,
      });

      const data = response.data;
      const bookKey = `ISBN:${cleanIsbn}`;

      if (data[bookKey]) {
        return data[bookKey] as OpenLibraryBook;
      }
      return null;
    } catch (error) {
      devError('OpenLibrary API error:', error);
      return null;
    }
  },
};
