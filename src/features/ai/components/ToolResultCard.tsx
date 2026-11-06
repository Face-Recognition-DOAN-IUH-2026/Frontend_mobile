import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIToolResult } from '../../../types/ai';
import { AppTheme } from '../../../theme/DarkTheme';

interface ToolResultCardProps {
  toolResult: AIToolResult;
  onReserve?: (bookId: string, title: string) => void;
}

export default function ToolResultCard({ toolResult, onReserve }: ToolResultCardProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { name, result } = toolResult;

  if (!result.success) {
    return (
      <View style={styles.errorCard}>
        <View style={styles.errorIconWrap}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#EF4444" />
        </View>
        <Text variant="bodySmall" style={styles.errorText}>
          {result.error || 'Lỗi không xác định'}
        </Text>
      </View>
    );
  }

  const data = result.data;

  switch (name) {
    case 'search_books':
      return <BookSearchCard data={data} theme={theme} styles={styles} onReserve={onReserve} />;
    case 'get_overdue_borrows':
      return <OverdueCard data={data} theme={theme} styles={styles} />;
    case 'get_patron_borrows':
      return <PatronBorrowsCard data={data} theme={theme} styles={styles} />;
    case 'get_shelf_location':
      return <ShelfLocationCard data={data} theme={theme} styles={styles} />;
    case 'get_schedule_today':
      return <ScheduleCard data={data} theme={theme} styles={styles} />;
    case 'get_patron_info':
      return <PatronInfoCard data={data} theme={theme} styles={styles} />;
    case 'get_library_hours':
      return <LibraryHoursCard data={data} theme={theme} styles={styles} />;
    case 'lookup_book':
      return <BookLookupCard data={data} theme={theme} styles={styles} />;
    case 'return_book':
    case 'batch_return':
      return <ReturnSuccessCard data={data} name={name} theme={theme} styles={styles} />;
    case 'renew_borrow':
      return <RenewSuccessCard data={data} theme={theme} styles={styles} />;
    case 'add_book':
      return <AddBookSuccessCard data={data} theme={theme} styles={styles} />;
    case 'update_book_quantity':
      return <UpdateQuantityCard data={data} theme={theme} styles={styles} />;
    case 'create_borrow_slip':
      return <BorrowSlipCard data={data} theme={theme} styles={styles} />;
    case 'get_patron_history':
      return <PatronHistoryCard data={data} theme={theme} styles={styles} />;
    default:
      // An cac tool payload chua co card chuyen biet de tranh vo layout bang JSON tho
      return null;
  }
}

function PatronInfoCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  if (!data) return null;
  const d = Array.isArray(data) ? data[0] : data;

  const statusKey = d.current_status || d.status || '';
  const isActive = statusKey === 'active' || statusKey === 'Active';
  const isSuspended = statusKey === 'suspended';
  const statusColor = isActive ? '#10B981' : isSuspended ? '#F59E0B' : '#EF4444';
  const statusLabel = isActive ? 'Hoạt động' : isSuspended ? 'Đình chỉ' : statusKey || 'N/A';

  return (
    <View style={styles.libraryCard}>
      <View style={styles.libraryCardHeader}>
        <View style={styles.libraryCardHeaderLeft}>
          <MaterialCommunityIcons name="library" size={18} color="#FFFFFF" />
          <Text style={styles.libraryCardHeaderText}>THẺ THƯ VIỆN</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '30' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.libraryCardBody}>
        <InfoRow icon="account" label="Họ tên" value={d.full_name || d.fullName || 'N/A'} styles={styles} />
        <InfoRow icon="badge-account" label="MSSV" value={d.student_code || d.studentCode || 'N/A'} styles={styles} />
        {d.card_number && <InfoRow icon="card-text" label="Số thẻ" value={d.card_number} styles={styles} />}
        <InfoRow icon="school" label="Lớp" value={d.class || d.className || 'N/A'} styles={styles} />
        {d.cohort && <InfoRow icon="calendar" label="Khóa" value={d.cohort} styles={styles} />}
        {d.address && <InfoRow icon="map-marker" label="Địa chỉ" value={d.address} styles={styles} />}
        <InfoRow icon="email" label="Email" value={d.email || 'N/A'} styles={styles} />
        {d.phone && <InfoRow icon="phone" label="Điện thoại" value={d.phone} styles={styles} />}
        {d.membership_expiry && (
          <InfoRow icon="calendar-check" label="Hạn thẻ" value={new Date(d.membership_expiry).toLocaleDateString('vi-VN')} styles={styles} />
        )}
      </View>
    </View>
  );
}

function BookSearchCard({ data, theme, styles, onReserve }: { data: any; theme: AppTheme; styles: any; onReserve?: (bookId: string, title: string) => void }) {
  const books = data?.books || data || [];
  const items = Array.isArray(books) ? books.slice(0, 5) : [];
  const total = Array.isArray(books) ? books.length : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="book-search" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>
          Kết quả tìm sách {total > 5 ? `(${items.length}/${total})` : `(${items.length})`}
        </Text>
      </View>
      {items.length === 0 ? (
        <Text variant="bodySmall" style={styles.noData}>Không tìm thấy sách</Text>
      ) : (
        items.map((book: any, idx: number) => (
          <SearchBookItem key={idx} book={book} theme={theme} styles={styles} isLast={idx === items.length - 1} onReserve={onReserve} />
        ))
      )}
    </View>
  );
}

function SearchBookItem({ book, theme, styles, isLast, onReserve }: { book: any; theme: AppTheme; styles: any; isLast: boolean; onReserve?: (bookId: string, title: string) => void }) {
  const [imageError, setImageError] = React.useState(false);
  const canReserve = book.available_copies !== undefined && book.available_copies === 0 && onReserve;

  return (
    <View style={[styles.bookItem, isLast && styles.bookItemLast]}>
      <View style={styles.bookAccentBar} />
      <View style={styles.bookContent}>
        <View style={styles.bookRow}>
          {book.cover_url && !imageError ? (
            <Image
              source={{ uri: book.cover_url }}
              style={styles.coverThumbImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverThumbPlaceholder, { backgroundColor: theme.colors.primary + '12' }]}>
              <MaterialCommunityIcons name="book" size={18} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.bookInfo}>
            <Text variant="bodyMedium" style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
            {book.author && <Text variant="bodySmall" style={styles.bookMeta} numberOfLines={1}>{book.author}</Text>}
          </View>
        </View>
        <View style={styles.bookMetaRow}>
          {book.isbn && (
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>ISBN: {book.isbn}</Text>
            </View>
          )}
          {book.shelf_location && (
            <View style={styles.metaTag}>
              <Text style={styles.metaTagText}>{book.shelf_location}</Text>
            </View>
          )}
          {book.available_copies !== undefined && (
            <View style={[styles.metaTag, book.available_copies > 0 ? styles.metaTagSuccess : styles.metaTagError]}>
              <Text style={[styles.metaTagText, book.available_copies > 0 ? styles.metaTagSuccessText : styles.metaTagErrorText]}>
                {book.available_copies > 0 ? `Còn ${book.available_copies}` : 'Hết bản'}
              </Text>
            </View>
          )}
          {canReserve && (
            <View
              style={[styles.metaTag, { backgroundColor: '#6366F118', borderWidth: 1, borderColor: '#6366F130' }]}
              onTouchEnd={() => onReserve!(book.id, book.title)}
            >
              <Text style={[styles.metaTagText, { color: '#6366F1', fontWeight: '700' }]}>Đặt chỗ</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function OverdueCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const items = Array.isArray(data) ? data.slice(0, 5) : data?.records?.slice(0, 5) || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="alert-circle" size={14} color="#EF4444" />
        <Text variant="labelSmall" style={[styles.cardLabel, { color: '#EF4444' }]}>
          Sách trễ hạn ({items.length})
        </Text>
      </View>
      {items.map((item: any, idx: number) => {
        const dueDate = item.due_at ? new Date(item.due_at) : null;
        const daysOverdue = dueDate ? Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        return (
          <View key={idx} style={[styles.bookItem, idx === items.length - 1 && styles.bookItemLast]}>
            <View style={[styles.bookAccentBar, { backgroundColor: '#EF4444' }]} />
            <View style={styles.bookContent}>
              <Text variant="bodyMedium" style={styles.bookTitle}>{item.book?.title || item.title || 'Sách'}</Text>
              <View style={styles.bookMetaRow}>
                <Text variant="bodySmall" style={styles.overdueDate}>
                  Hạn trả: {dueDate ? dueDate.toLocaleDateString('vi-VN') : 'N/A'}
                </Text>
                {daysOverdue > 0 && (
                  <View style={[styles.metaTag, styles.metaTagError]}>
                    <Text style={[styles.metaTagText, styles.metaTagErrorText]}>Trễ {daysOverdue} ngày</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PatronBorrowsCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const items = Array.isArray(data) ? data.slice(0, 5) : data?.records?.slice(0, 5) || [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="book-check" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>Sách đang mượn ({items.length})</Text>
      </View>
      {items.map((item: any, idx: number) => {
        const dueDate = item.due_at ? new Date(item.due_at) : null;
        const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        return (
          <View key={idx} style={[styles.bookItem, idx === items.length - 1 && styles.bookItemLast]}>
            <View style={styles.bookAccentBar} />
            <View style={styles.bookContent}>
              <Text variant="bodyMedium" style={styles.bookTitle}>{item.book?.title || item.title || 'Sách'}</Text>
              <View style={styles.bookMetaRow}>
                <Text variant="bodySmall" style={styles.bookMeta}>
                  {item.status === 'borrowed' ? 'Đang mượn' : item.status}
                </Text>
                {dueDate && (
                  <Text variant="bodySmall" style={styles.bookMeta}>
                    · Hạn: {dueDate.toLocaleDateString('vi-VN')}
                  </Text>
                )}
                {daysLeft > 0 && daysLeft <= 3 && (
                  <View style={[styles.metaTag, styles.metaTagWarning]}>
                    <Text style={[styles.metaTagText, styles.metaTagWarningText]}>Còn {daysLeft} ngày</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ShelfLocationCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const shelves = data?.shelves || data || [];
  const items = Array.isArray(shelves) ? shelves.slice(0, 5) : [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="map-marker" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>Vị trí kệ sách</Text>
      </View>
      {items.map((item: any, idx: number) => (
        <View key={idx} style={[styles.bookItem, idx === items.length - 1 && styles.bookItemLast]}>
          <View style={styles.bookAccentBar} />
          <View style={styles.bookContent}>
            <Text variant="bodyMedium" style={styles.bookTitle}>{item.shelf_location || item.location || 'N/A'}</Text>
            {item.books && (
              <Text variant="bodySmall" style={styles.bookMeta}>
                {Array.isArray(item.books) ? item.books.length : 0} cuốn sách
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function ScheduleCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const shifts = data?.shifts || data?.assignments || data || [];
  const items = Array.isArray(shifts) ? shifts.slice(0, 5) : [];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="calendar-clock" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>Lịch trực hôm nay ({items.length})</Text>
      </View>
      {items.map((item: any, idx: number) => (
        <View key={idx} style={[styles.bookItem, idx === items.length - 1 && styles.bookItemLast]}>
          <View style={styles.bookAccentBar} />
          <View style={styles.bookContent}>
            <Text variant="bodyMedium" style={styles.bookTitle}>
              {item.shift?.name || item.shiftName || 'Ca'} - {item.zone?.zoneName || item.zoneName || 'KV'}
            </Text>
            <Text variant="bodySmall" style={styles.bookMeta}>
              {item.shift?.startTime || item.startTime || ''}{item.shift?.endTime || item.endTime ? ` - ${item.shift?.endTime || item.endTime}` : ''}
              {' · '}{item.staff?.fullName || item.staffName || 'Nhân viên'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function LibraryHoursCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const schedule = data?.schedule || data || [];
  const items = Array.isArray(schedule) ? schedule : [];
  const note = data?.note;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="clock-outline" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>Giờ mở cửa</Text>
      </View>
      {items.map((item: any, idx: number) => (
        <View key={idx} style={[styles.bookItem, idx === items.length - 1 && !note && styles.bookItemLast]}>
          <View style={styles.bookAccentBar} />
          <View style={styles.bookContent}>
            <Text variant="bodyMedium" style={styles.bookTitle}>{item.days || item.day}</Text>
            <Text variant="bodySmall" style={styles.bookMeta}>{item.hours || item.time}</Text>
          </View>
        </View>
      ))}
      {note && (
        <View style={[styles.bookItem, styles.bookItemLast]}>
          <View style={[styles.bookAccentBar, { backgroundColor: theme.colors.primary }]} />
          <View style={styles.bookContent}>
            <Text variant="bodySmall" style={[styles.bookMeta, { fontStyle: 'italic' }]}>{note}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function BookLookupCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  if (!data) return null;
  const book = Array.isArray(data) ? data[0] : data;
  const [imageError, setImageError] = React.useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="book-open-variant" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>Thông tin sách</Text>
      </View>
      <View style={styles.bookLookup}>
        {book.cover_url && !imageError ? (
          <Image
            source={{ uri: book.cover_url }}
            style={styles.coverLargeImage}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.coverLargePlaceholder, { backgroundColor: theme.colors.primary + '12' }]}>
            <MaterialCommunityIcons name="book" size={28} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.bookLookupInfo}>
          <Text variant="titleSmall" style={styles.bookTitle}>{book.title || 'N/A'}</Text>
          {book.author && <Text variant="bodySmall" style={styles.bookMeta}>{book.author}</Text>}
          {book.isbn && <Text variant="bodySmall" style={styles.bookMeta}>ISBN: {book.isbn}</Text>}
          {book.categories && <Text variant="bodySmall" style={styles.bookMeta}>{book.categories}</Text>}
          {book.page_count && <Text variant="bodySmall" style={styles.bookMeta}>{book.page_count} trang</Text>}
        </View>
      </View>
      {book.description && (
        <Text variant="bodySmall" style={[styles.bookMeta, { marginTop: 8, marginHorizontal: 14 }]} numberOfLines={4}>
          {book.description}
        </Text>
      )}
    </View>
  );
}

function PatronHistoryCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const items = Array.isArray(data) ? data.slice(0, 5) : data?.records?.slice(0, 5) || [];
  const total = Array.isArray(data) ? data.length : data?.records?.length || 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons name="history" size={14} color={theme.colors.primary} />
        <Text variant="labelSmall" style={styles.cardLabel}>
          Lịch sử mượn {total > 5 ? `(${items.length}/${total})` : `(${items.length})`}
        </Text>
      </View>
      {items.map((item: any, idx: number) => {
        const statusColor = item.status === 'returned' ? '#10B981' : item.status === 'overdue' ? '#EF4444' : '#3B82F6';
        return (
          <View key={idx} style={[styles.bookItem, idx === items.length - 1 && styles.bookItemLast]}>
            <View style={styles.bookContent}>
              <Text variant="bodyMedium" style={styles.bookTitle}>{item.book?.title || item.title || 'Sách'}</Text>
              <View style={styles.bookMetaRow}>
                <Text variant="bodySmall" style={styles.bookMeta}>
                  {item.borrow_at ? new Date(item.borrow_at).toLocaleDateString('vi-VN') : ''}
                </Text>
                <View style={[styles.metaTag, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.metaTagText, { color: statusColor }]}>
                    {item.status === 'returned' ? 'Đã trả' : item.status === 'overdue' ? 'Trễ hạn' : 'Đang mượn'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function ReturnSuccessCard({ data, name, theme, styles }: { data: any; name: string; theme: AppTheme; styles: any }) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successHeader}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text variant="labelSmall" style={styles.successLabel}>
          {name === 'batch_return' ? 'Trả sách thành công' : 'Trả sách thành công'}
        </Text>
      </View>
      {data?.message && <Text variant="bodySmall" style={styles.successMessage}>{data.message}</Text>}
      {data?.record && (
        <View style={styles.bookItem}>
          <View style={styles.bookContent}>
            <Text variant="bodyMedium" style={styles.bookTitle}>{data.record.book?.title || 'Sách'}</Text>
            <Text variant="bodySmall" style={styles.bookMeta}>
              Đã trả: {data.record.return_at ? new Date(data.record.return_at).toLocaleString('vi-VN') : 'N/A'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function RenewSuccessCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successHeader}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text variant="labelSmall" style={styles.successLabel}>Gia hạn thành công</Text>
      </View>
      {data?.message && <Text variant="bodySmall" style={styles.successMessage}>{data.message}</Text>}
      {data?.new_due_date && (
        <Text variant="bodySmall" style={styles.bookMeta}>Hạn mới: {new Date(data.new_due_date).toLocaleDateString('vi-VN')}</Text>
      )}
    </View>
  );
}

function AddBookSuccessCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successHeader}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text variant="labelSmall" style={styles.successLabel}>Thêm sách thành công</Text>
      </View>
      {data?.title && <Text variant="bodyMedium" style={styles.bookTitle}>{data.title}</Text>}
      {data?.message && <Text variant="bodySmall" style={styles.bookMeta}>{data.message}</Text>}
    </View>
  );
}

function UpdateQuantityCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successHeader}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text variant="labelSmall" style={styles.successLabel}>Cập nhật số lượng thành công</Text>
      </View>
      {data?.message && <Text variant="bodySmall" style={styles.successMessage}>{data.message}</Text>}
    </View>
  );
}

function BorrowSlipCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <View style={styles.successCard}>
      <View style={styles.successHeader}>
        <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
        <Text variant="labelSmall" style={styles.successLabel}>Tạo phiếu mượn thành công</Text>
      </View>
      {data?.slip && (
        <View style={styles.bookItem}>
          <View style={styles.bookContent}>
            <Text variant="bodySmall" style={styles.bookMeta}>Mã phiếu: {data.slip.id?.slice(0, 8)}</Text>
            <Text variant="bodySmall" style={styles.bookMeta}>Số lượng: {data.slip.total_items || data.records?.length || 0} cuốn</Text>
            {data.slip.due_at && (
              <Text variant="bodySmall" style={styles.bookMeta}>Hạn trả: {new Date(data.slip.due_at).toLocaleDateString('vi-VN')}</Text>
            )}
          </View>
        </View>
      )}
      {data?.message && <Text variant="bodySmall" style={styles.bookMeta}>{data.message}</Text>}
    </View>
  );
}

function InfoRow({ icon, label, value, styles }: { icon: string; label: string; value: string; styles: any }) {
  return (
    <View style={styles.infoRow}>
      <MaterialCommunityIcons name={icon as any} size={14} color="rgba(255,255,255,0.5)" style={styles.infoRowIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const isDark = theme.dark;

  return StyleSheet.create({
    card: {
      marginVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#2A2A3C' : '#E5E7EB',
      overflow: 'hidden',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 8,
      gap: 6,
    },
    cardLabel: {
      fontWeight: '700',
      fontSize: 12,
      color: theme.colors.onSurface,
    },
    noData: {
      opacity: 0.5,
      color: theme.colors.onSurfaceVariant,
      paddingHorizontal: 14,
      paddingBottom: 10,
    },

    // Library card (patron info)
    libraryCard: {
      marginVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#1C1C2E' : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? '#2A2A3C' : '#E5E7EB',
      overflow: 'hidden',
    },
    libraryCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isDark ? '#2D2D44' : '#6366F1',
    },
    libraryCardHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    libraryCardHeaderText: {
      color: '#FFFFFF',
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    libraryCardBody: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 2,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      gap: 4,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 5,
      gap: 8,
    },
    infoRowIcon: {
      width: 16,
    },
    infoLabel: {
      fontSize: 12,
      color: isDark ? 'rgba(255,255,255,0.45)' : '#6B7280',
      width: 72,
    },
    infoValue: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.onSurface,
      flex: 1,
    },

    // Book items with accent bar
    bookItem: {
      flexDirection: 'row',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? '#2A2A3C' : '#F3F4F6',
    },
    bookItemLast: {
      borderBottomWidth: 0,
    },
    bookContent: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    coverThumb: {
      width: 36,
      height: 48,
      borderRadius: 6,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverThumbImage: {
      width: 36,
      height: 48,
      borderRadius: 6,
    },
    coverThumbPlaceholder: {
      width: 36,
      height: 48,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverLarge: {
      width: 64,
      height: 86,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
    },
    coverLargeImage: {
      width: 64,
      height: 86,
      borderRadius: 8,
    },
    coverLargePlaceholder: {
      width: 64,
      height: 86,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bookInfo: {
      flex: 1,
    },
    bookTitle: {
      fontWeight: '600',
      fontSize: 13,
      color: theme.colors.onSurface,
    },
    bookMeta: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 12,
      marginTop: 2,
    },
    bookMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 6,
      gap: 4,
    },
    metaTag: {
      backgroundColor: isDark ? '#2A2A3C' : '#F3F4F6',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    metaTagText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.onSurfaceVariant,
    },
    metaTagSuccess: {
      backgroundColor: isDark ? '#0D2818' : '#ECFDF5',
    },
    metaTagSuccessText: {
      color: '#10B981',
    },
    metaTagError: {
      backgroundColor: isDark ? '#3D1111' : '#FEF2F2',
    },
    metaTagErrorText: {
      color: '#EF4444',
    },
    metaTagWarning: {
      backgroundColor: isDark ? '#3D2E00' : '#FFFBEB',
    },
    metaTagWarningText: {
      color: '#F59E0B',
    },

    // Overdue
    overdueDate: {
      color: '#EF4444',
      fontSize: 12,
    },

    // Book lookup
    bookLookup: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      gap: 12,
    },
    bookLookupInfo: {
      flex: 1,
    },

    // Error card
    errorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#3D1111' : '#FEF2F2',
      borderWidth: 1,
      borderColor: isDark ? '#5C1D1D' : '#FECACA',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    errorIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#EF444420',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      color: '#EF4444',
      flex: 1,
    },

    // Success card
    successCard: {
      marginVertical: 4,
      borderRadius: 14,
      backgroundColor: isDark ? '#0D2818' : '#ECFDF5',
      borderWidth: 1,
      borderColor: isDark ? '#1A4D2E' : '#A7F3D0',
      paddingHorizontal: 14,
      paddingVertical: 10,
      overflow: 'hidden',
    },
    successHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 6,
    },
    successLabel: {
      fontWeight: '700',
      fontSize: 12,
      color: '#10B981',
    },
    successMessage: {
      fontSize: 12,
      color: theme.colors.onSurfaceVariant,
    },

    // JSON fallback
    jsonText: {
      color: theme.colors.onSurfaceVariant,
      fontFamily: 'monospace',
      fontSize: 11,
      paddingHorizontal: 14,
      paddingBottom: 10,
    },
  });
}
