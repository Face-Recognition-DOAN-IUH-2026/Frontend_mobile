import axios from 'axios';
import { devError } from '../utils/logger';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

export interface GoogleBooksMeta {
  title: string;
  subtitle?: string | null;
  author?: string | null;
  publisher?: string | null;
  publishedDate?: string | null;
  description?: string | null;
  pageCount?: number | null;
  categories?: string | null;
  averageRating?: number | null;
  language?: string | null;
  coverUrl?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
}

export const googleBooksApi = {
  getBookByIsbn: async (isbn: string): Promise<GoogleBooksMeta | null> => {
    try {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      const response = await axios.get(GOOGLE_BOOKS_API, {
        params: { q: `isbn:${cleanIsbn}`, maxResults: 1 },
        timeout: 10000,
      });

      const data = response.data;
      if (!data.items || data.items.length === 0) return null;

      const info = data.items[0].volumeInfo;
      if (!info) return null;

      const isbn10 = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier || null;
      const isbn13 = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier || null;

      const thumbnail = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;

      const authors = Array.isArray(info.authors) ? info.authors.join(', ') : null;
      const categories = Array.isArray(info.categories) ? info.categories.join(', ') : null;

      return {
        title: info.title || `ISBN ${isbn}`,
        subtitle: info.subtitle || null,
        author: authors,
        publisher: info.publisher || null,
        publishedDate: info.publishedDate || null,
        description: info.description || null,
        pageCount: info.pageCount || null,
        categories,
        averageRating: info.averageRating || null,
        language: info.language || null,
        coverUrl: thumbnail,
        isbn10,
        isbn13,
      };
    } catch (error) {
      devError('Google Books API error:', error);
      return null;
    }
  },
};
