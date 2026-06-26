import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIToolResult } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

interface ToolResultCardProps {
  toolResult: AIToolResult;
}

export default function ToolResultCard({ toolResult }: ToolResultCardProps) {
  const theme = useTheme() as AppTheme;
  const { name, result } = toolResult;

  if (!result.success) {
    return (
      <Card style={styles.errorCard}>
        <Card.Content style={styles.cardContent}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={theme.colors.error} />
          <Text variant="bodySmall" style={{ color: theme.colors.error, marginLeft: 8 }}>
            {result.error || 'Lỗi không xác định'}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const data = result.data;

  switch (name) {
    case 'search_books':
      return <BookSearchCard data={data} theme={theme} styles={styles} />;
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
    default:
      return (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.toolHeader}>
              <MaterialCommunityIcons name="information-outline" size={16} color={theme.colors.primary} />
              <Text variant="labelSmall" style={styles.toolLabel}>{name}</Text>
            </View>
            <Text variant="bodySmall" style={styles.jsonText}>{JSON.stringify(data, null, 2)}</Text>
          </Card.Content>
        </Card>
      );
  }
}

function BookSearchCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const books = data?.books || data || [];
  const items = Array.isArray(books) ? books.slice(0, 5) : [];
  const total = Array.isArray(books) ? books.length : 0;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="book-search" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>
            Kết quả tìm sách {total > 5 ? `(${items.length}/${total})` : `(${items.length})`}
          </Text>
        </View>
        {items.length === 0 ? (
          <Text variant="bodySmall" style={styles.noData}>Không tìm thấy sách</Text>
        ) : (
          items.map((book: any, idx: number) => (
            <View key={idx} style={styles.bookItem}>
              <View style={styles.bookRow}>
                {book.cover_url ? (
                  <View style={styles.coverThumb}>
                    <MaterialCommunityIcons name="book" size={20} color={theme.colors.primary} />
                  </View>
                ) : null}
                <View style={styles.bookInfo}>
                  <Text variant="bodyMedium" style={styles.bookTitle}>{book.title}</Text>
                  {book.author && <Text variant="bodySmall" style={styles.bookMeta}>{book.author}</Text>}
                </View>
              </View>
              <View style={styles.bookMetaRow}>
                {book.isbn && <Chip compact style={styles.metaChip} textStyle={styles.chipText}>ISBN: {book.isbn}</Chip>}
                {book.shelf_location && <Chip compact style={styles.metaChip} textStyle={styles.chipText}>📍 {book.shelf_location}</Chip>}
                {book.available_copies !== undefined && (
                  <Chip compact style={[styles.metaChip, book.available_copies > 0 ? styles.chipSuccess : styles.chipError]} textStyle={styles.chipText}>
                    {book.available_copies > 0 ? `Còn ${book.available_copies} cuốn` : 'Hết'}
                  </Chip>
                )}
              </View>
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

function OverdueCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const items = Array.isArray(data) ? data.slice(0, 5) : data?.records?.slice(0, 5) || [];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={theme.colors.error} />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: theme.colors.error }]}>
            Sách trễ hạn ({items.length})
          </Text>
        </View>
        {items.map((item: any, idx: number) => {
          const dueDate = item.due_at ? new Date(item.due_at) : null;
          const daysOverdue = dueDate ? Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          return (
            <View key={idx} style={styles.overdueItem}>
              <Text variant="bodyMedium">{item.book?.title || item.title || 'Sách'}</Text>
              <View style={styles.overdueRow}>
                <Text variant="bodySmall" style={styles.overdueDate}>
                  Hạn trả: {dueDate ? dueDate.toLocaleDateString('vi-VN') : 'N/A'}
                </Text>
                {daysOverdue > 0 && (
                  <Chip compact style={styles.chipError} textStyle={styles.chipText}>
                    Trễ {daysOverdue} ngày
                  </Chip>
                )}
              </View>
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

function PatronBorrowsCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const items = Array.isArray(data) ? data.slice(0, 5) : data?.records?.slice(0, 5) || [];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="book-check" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Sách đang mượn ({items.length})</Text>
        </View>
        {items.map((item: any, idx: number) => {
          const dueDate = item.due_at ? new Date(item.due_at) : null;
          const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
          return (
            <View key={idx} style={styles.bookItem}>
              <Text variant="bodyMedium">{item.book?.title || item.title || 'Sách'}</Text>
              <View style={styles.bookMetaRow}>
                <Text variant="bodySmall" style={styles.bookMeta}>
                  Trạng thái: {item.status === 'borrowed' ? 'Đang mượn' : item.status}
                </Text>
                {dueDate && (
                  <Text variant="bodySmall" style={styles.bookMeta}>
                    · Hạn: {dueDate.toLocaleDateString('vi-VN')}
                  </Text>
                )}
                {daysLeft > 0 && daysLeft <= 3 && (
                  <Chip compact style={styles.chipWarning} textStyle={styles.chipText}>
                    Còn {daysLeft} ngày
                  </Chip>
                )}
              </View>
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

function ShelfLocationCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const shelves = data?.shelves || data || [];
  const items = Array.isArray(shelves) ? shelves.slice(0, 5) : [];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Vị trí kệ sách</Text>
        </View>
        {items.map((item: any, idx: number) => (
          <View key={idx} style={styles.bookItem}>
            <Text variant="bodyMedium">{item.shelf_location || item.location || 'N/A'}</Text>
            {item.books && (
              <Text variant="bodySmall" style={styles.bookMeta}>
                {Array.isArray(item.books) ? item.books.length : 0} cuốn sách
              </Text>
            )}
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

function ScheduleCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const shifts = data?.shifts || data?.assignments || data || [];
  const items = Array.isArray(shifts) ? shifts.slice(0, 5) : [];

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="calendar-clock" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Lịch trực hôm nay ({items.length})</Text>
        </View>
        {items.map((item: any, idx: number) => (
          <View key={idx} style={styles.bookItem}>
            <Text variant="bodyMedium">
              {item.shift?.name || item.shiftName || 'Ca'} - {item.zone?.zoneName || item.zoneName || 'KV'}
            </Text>
            <Text variant="bodySmall" style={styles.bookMeta}>
              {item.shift?.startTime || item.startTime || ''}{item.shift?.endTime || item.endTime ? ` - ${item.shift?.endTime || item.endTime}` : ''}
              {' · '}{item.staff?.fullName || item.staffName || 'Nhân viên'}
            </Text>
          </View>
        ))}
      </Card.Content>
    </Card>
  );
}

function PatronInfoCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  if (!data) return null;
  const d = Array.isArray(data) ? data[0] : data;

  const statusColor = d.status === 'active' || d.current_status === 'active'
    ? '#4CAF50' : d.status === 'suspended' ? '#FF9800' : theme.colors.error;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="card-account-details" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Thông tin thẻ</Text>
        </View>
        <View style={styles.infoGrid}>
          <InfoRow label="Họ tên" value={d.full_name || d.fullName || 'N/A'} />
          <InfoRow label="MSSV" value={d.student_code || d.studentCode || 'N/A'} />
          <InfoRow label="Email" value={d.email || 'N/A'} />
          {d.phone && <InfoRow label="Điện thoại" value={d.phone} />}
          {d.card_number && <InfoRow label="Số thẻ" value={d.card_number} />}
          <View style={styles.infoRow}>
            <Text variant="bodySmall" style={styles.infoLabel}>Trạng thái</Text>
            <Chip compact style={[styles.statusChip, { backgroundColor: statusColor + '20' }]} textStyle={[styles.chipText, { color: statusColor }]}>
              {d.current_status || d.status || 'N/A'}
            </Chip>
          </View>
          {d.membership_expiry && (
            <InfoRow label="Hạn thẻ" value={new Date(d.membership_expiry).toLocaleDateString('vi-VN')} />
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

function LibraryHoursCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  const schedule = data?.schedule || data || [];
  const items = Array.isArray(schedule) ? schedule : [];
  const note = data?.note;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Giờ mở cửa</Text>
        </View>
        {items.map((item: any, idx: number) => (
          <View key={idx} style={styles.bookItem}>
            <Text variant="bodyMedium" style={styles.bookTitle}>{item.days || item.day}</Text>
            <Text variant="bodySmall" style={styles.bookMeta}>{item.hours || item.time}</Text>
          </View>
        ))}
        {note && (
          <Text variant="bodySmall" style={[styles.bookMeta, { marginTop: 8, fontStyle: 'italic' }]}>
            {note}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

function BookLookupCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  if (!data) return null;
  const book = Array.isArray(data) ? data[0] : data;

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="book-open-variant" size={16} color={theme.colors.primary} />
          <Text variant="labelSmall" style={styles.toolLabel}>Thông tin sách</Text>
        </View>
        <View style={styles.bookLookup}>
          {book.cover_url && (
            <View style={styles.coverLarge}>
              <MaterialCommunityIcons name="book" size={32} color={theme.colors.primary} />
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
          <Text variant="bodySmall" style={[styles.bookMeta, { marginTop: 8 }]} numberOfLines={4}>
            {book.description}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

function ReturnSuccessCard({ data, name, theme, styles }: { data: any; name: string; theme: AppTheme; styles: any }) {
  return (
    <Card style={styles.successCard}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: '#4CAF50' }]}>
            {name === 'batch_return' ? 'Trả sách thành công' : 'Trả sách thành công'}
          </Text>
        </View>
        {data?.message && <Text variant="bodySmall">{data.message}</Text>}
        {data?.record && (
          <View style={styles.bookItem}>
            <Text variant="bodyMedium">{data.record.book?.title || 'Sách'}</Text>
            <Text variant="bodySmall" style={styles.bookMeta}>Đã trả lúc: {data.record.return_at ? new Date(data.record.return_at).toLocaleString('vi-VN') : 'N/A'}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

function RenewSuccessCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <Card style={styles.successCard}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: '#4CAF50' }]}>Gia hạn thành công</Text>
        </View>
        {data?.message && <Text variant="bodySmall">{data.message}</Text>}
        {data?.new_due_date && (
          <Text variant="bodySmall" style={styles.bookMeta}>Hạn mới: {new Date(data.new_due_date).toLocaleDateString('vi-VN')}</Text>
        )}
      </Card.Content>
    </Card>
  );
}

function AddBookSuccessCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <Card style={styles.successCard}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: '#4CAF50' }]}>Thêm sách thành công</Text>
        </View>
        {data?.title && <Text variant="bodyMedium">{data.title}</Text>}
        {data?.message && <Text variant="bodySmall" style={styles.bookMeta}>{data.message}</Text>}
      </Card.Content>
    </Card>
  );
}

function UpdateQuantityCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <Card style={styles.successCard}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: '#4CAF50' }]}>Cập nhật số lượng thành công</Text>
        </View>
        {data?.message && <Text variant="bodySmall">{data.message}</Text>}
      </Card.Content>
    </Card>
  );
}

function BorrowSlipCard({ data, theme, styles }: { data: any; theme: AppTheme; styles: any }) {
  return (
    <Card style={styles.successCard}>
      <Card.Content>
        <View style={styles.toolHeader}>
          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
          <Text variant="labelSmall" style={[styles.toolLabel, { color: '#4CAF50' }]}>Tạo phiếu mượn thành công</Text>
        </View>
        {data?.slip && (
          <View style={styles.bookItem}>
            <Text variant="bodySmall">Mã phiếu: {data.slip.id?.slice(0, 8)}</Text>
            <Text variant="bodySmall">Số lượng: {data.slip.total_items || data.records?.length || 0} cuốn</Text>
            {data.slip.due_at && (
              <Text variant="bodySmall">Hạn trả: {new Date(data.slip.due_at).toLocaleDateString('vi-VN')}</Text>
            )}
          </View>
        )}
        {data?.message && <Text variant="bodySmall" style={styles.bookMeta}>{data.message}</Text>}
      </Card.Content>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="bodySmall" style={styles.infoLabel}>{label}</Text>
      <Text variant="bodySmall" style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#21262D',
  },
  errorCard: {
    marginVertical: 4,
    backgroundColor: '#3D1111',
    borderWidth: 1,
    borderColor: '#5C1D1D',
  },
  successCard: {
    marginVertical: 4,
    backgroundColor: '#0D2818',
    borderWidth: 1,
    borderColor: '#1A4D2E',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontWeight: '600',
    marginLeft: 6,
    color: '#C9D1D9',
  },
  noData: {
    opacity: 0.6,
    color: '#8B949E',
  },
  bookItem: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262D',
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coverThumb: {
    width: 32,
    height: 42,
    borderRadius: 4,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLarge: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#0D1117',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontWeight: '500',
    color: '#C9D1D9',
  },
  bookMeta: {
    color: '#8B949E',
    marginTop: 2,
  },
  bookMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  metaChip: {
    height: 24,
    backgroundColor: '#21262D',
  },
  chipText: {
    fontSize: 11,
    color: '#C9D1D9',
  },
  chipSuccess: {
    backgroundColor: '#0D2818',
  },
  chipError: {
    backgroundColor: '#3D1111',
  },
  chipWarning: {
    backgroundColor: '#3D2E00',
  },
  overdueItem: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#21262D',
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  overdueDate: {
    color: '#F85149',
  },
  bookLookup: {
    flexDirection: 'row',
    gap: 12,
  },
  bookLookupInfo: {
    flex: 1,
  },
  infoGrid: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    color: '#8B949E',
  },
  infoValue: {
    color: '#C9D1D9',
    fontWeight: '500',
  },
  statusChip: {
    height: 24,
  },
  jsonText: {
    color: '#8B949E',
    fontFamily: 'monospace',
    fontSize: 11,
  },
});
