export const CACHE_KEYS = {
  PROFILE: 'cache_profile',
  NOTIFICATIONS: 'cache_notifications',
  UNREAD_COUNT: 'cache_unread_count',
  SCHEDULE: 'cache_schedule',
  BOOKS: 'cache_books',
  BORROW_HISTORY: 'cache_borrow_history',
  ACTIVE_BORROWS: 'cache_active_borrows',
  RESERVATIONS: 'cache_reservations',
  BOOK_META_PREFIX: 'cache_book_meta_',
} as const;

export const CACHE_TTL = {
  PROFILE: 3600000,
  NOTIFICATIONS: 300000,
  UNREAD_COUNT: 300000,
  SCHEDULE: 900000,
  BOOKS: 1800000,
  BORROW_HISTORY: 3600000,
  ACTIVE_BORROWS: 900000,
  RESERVATIONS: 900000,
  BOOK_META: 86400000,
} as const;
