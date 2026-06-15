export interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  student_code?: string;
  password_auto_generated?: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author?: string;
  cover_url?: string;
  shelf_location?: string;
  is_available?: boolean;
  publish_year?: number;
  pages?: number;
  publisher?: string;
}

export interface BorrowRecord {
  id: string;
  patron_id: string;
  book_id: string;
  copy_id?: string;
  borrow_at: string;
  due_at: string;
  return_at?: string;
  shelf_location?: string;
  status: 'borrowed' | 'returned' | 'overdue';
  returned_by_user_id?: string;
  returned_by_email?: string;
  return_method?: string;
  book?: Book;
}

export interface BorrowResponse {
  status: 'success' | 'error';
  message: string;
  record?: BorrowRecord;
  book?: Book;
}

export interface ReturnResponse {
  status: 'success' | 'error';
  message: string;
  record?: BorrowRecord;
}

export interface Patron {
  id: string;
  full_name: string;
  student_code: string;
  email?: string;
  phone?: string;
  card_number: string;
  membership_expiry: string;
  status: string;
  current_status?: string;
  has_face: boolean;
}

export interface StaffPatronSummary {
  id: string;
  full_name?: string;
  student_code: string;
  email?: string;
  card_number?: string;
  current_status?: string;
}

export interface StaffPatronActiveBorrowsResponse {
  patron: StaffPatronSummary;
  records: BorrowRecord[];
  total: number;
  overdue_count: number;
}

export interface OpenLibraryBook {
  title: string;
  authors?: { name: string }[];
  cover?: {
    medium?: string;
    small?: string;
    large?: string;
  };
  publishers?: { name: string }[];
  number_of_pages?: number;
  publish_date?: string;
  subjects?: { name: string }[];
}

export interface CameraEvent {
  camera_id: string;
  status: 'granted' | 'unknown' | 'spoof' | 'expired' | 'wrong_direction' | 'already_granted';
  patron_id?: string;
  full_name?: string;
  student_code?: string;
  score?: number;
  access_type?: 'entry' | 'exit';
  bbox?: number[];
  landmarks?: number[][];
}
