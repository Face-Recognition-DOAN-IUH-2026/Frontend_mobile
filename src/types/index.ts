export type UserRole = 'admin' | 'staff' | 'patron';

export interface User {
  phone?: string;
  permanent_address?: string;
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  student_code?: string;
  password_auto_generated?: boolean;
  avatar_url?: string;
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
  category?: string;
  description?: string;
  cover_url?: string;
  shelf_location?: string;
  is_available?: boolean;
  total_copies?: number;
  available_copies?: number;
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
  note?: string;
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
  note?: string;
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
  course?: string;
  permanent_address?: string;
  class_name?: string;
  date_of_birth?: string;
  faculty?: string;
  identity_number?: string;
  issue_date?: string;
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
  event_id: string;
  event_type: 'camera_event';
  camera_id: string;
  status: 'granted' | 'no_match' | 'spoof' | 'expired' | 'wrong_direction' | 'already_granted' | 'error';
  patron_id?: string;
  full_name?: string;
  student_code?: string;
  score?: number;
  access_type?: 'entry' | 'exit';
  bbox?: number[];
  landmarks?: number[][];
  occurred_at: string;
  source: string;
}

export interface ScheduleStaff {
  id: string;
  fullName?: string | null;
  email: string;
  role: string;
  status: string;
}

export interface LibraryZone {
  id: string;
  floor: number;
  zoneName: string;
  description?: string | null;
  isActive: boolean;
}

export interface StaffShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  minStaff: number;
  isActive: boolean;
}

export interface StaffAttendance {
  id: string;
  scheduleId: string;
  staffId: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  status: string;
  method: string;
}

export interface StaffScheduleAssignment {
  id: string;
  staffId: string;
  shiftId: string;
  zoneId: string;
  workDate: string;
  status: string;
  note?: string | null;
  staff?: ScheduleStaff | null;
  shift?: StaffShift | null;
  zone?: LibraryZone | null;
  attendance?: StaffAttendance | null;
}

export interface ScheduleAssignmentList {
  items: StaffScheduleAssignment[];
  total: number;
}

export interface DayCounts {
  [date: string]: number;
}

export interface BookWithStats {
  id: string;
  isbn: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  description: string | null;
  page_count: number | null;
  categories: string | null;
  average_rating: number | null;
  language: string | null;
  isbn10: string | null;
  isbn13: string | null;
  shelf_location: string | null;
  total_copies: number;
  available_copies: number;
  created_at: string;
}

export interface BookImportResultRow {
  isbn: string;
  title: string;
  quantity: number;
  barcodes: string[];
  status: string;
  message: string | null;
}

export interface BookImportResponse {
  success: boolean;
  total_rows: number;
  imported: number;
  skipped: number;
  errors: number;
  results: BookImportResultRow[];
}

export interface BorrowSlipItem {
  barcode: string;
  isbn?: string;
}

export interface CreateBorrowSlipRequest {
  patron_id: string;
  items: BorrowSlipItem[];
}

export interface BorrowSlip {
  id: string;
  patron_id: string;
  borrow_at: string;
  due_at: string;
  status: string;
  created_by_user_id?: string;
  created_by_email?: string;
  total_items: number;
  created_at: string;
  updated_at: string;
  records?: BorrowRecord[];
}

export interface CreateBorrowSlipResponse {
  status: string;
  message: string;
  slip?: BorrowSlip;
  records?: BorrowRecord[];
}

export interface LookupBorrowSlipRequest {
  patron_id: string;
  items: BorrowSlipItem[];
}

export interface LookupBorrowSlipItem {
  barcode: string;
  isbn?: string;
  can_borrow: boolean;
  reason: string | null;
  book: BookWithStats | null;
  copy: { id: string; book_id: string; barcode: string; is_available: boolean; shelf_location: string | null } | null;
}

export interface LookupBorrowSlipResponse {
  can_create: boolean;
  patron: { id: string; full_name: string | null; student_code: string; email: string | null };
  items: LookupBorrowSlipItem[];
  errors: string[];
  total_items: number;
  available_items: number;
}

export interface ConfirmBorrowSlipItem {
  barcode: string;
  isbn?: string;
  book_id: string;
  copy_id: string;
}

export interface ConfirmBorrowSlipRequest {
  patron_id: string;
  items: ConfirmBorrowSlipItem[];
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread: number;
}
