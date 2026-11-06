import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIMessage } from '../../../types/ai';
import { AppTheme } from '../../../theme/DarkTheme';
import SimpleMarkdownText from './SimpleMarkdownText';

interface ChatBubbleProps {
  message: AIMessage;
}

type BubblePart =
  | { type: 'text'; text: string }
  | { type: 'book_card'; book: any }
  | { type: 'schedule'; schedule: { schedule: Array<{ days: string; hours: string }>; note?: string } };

function extractMobileSchedule(text: string): {
  before: string;
  schedule: any | null;
  after: string;
} {
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\][\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (Array.isArray(parsed.schedule)) {
        const idx = text.indexOf(codeBlockMatch[0]);
        return {
          before: text.substring(0, idx).trim(),
          schedule: parsed,
          after: text.substring(idx + codeBlockMatch[0].length).trim(),
        };
      }
    } catch {}
  }

  const rawMatch = text.match(/\{[\s\S]*?"schedule"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  if (rawMatch) {
    try {
      const parsed = JSON.parse(rawMatch[0]);
      if (Array.isArray(parsed.schedule)) {
        const idx = text.indexOf(rawMatch[0]);
        return {
          before: text.substring(0, idx).trim(),
          schedule: parsed,
          after: text.substring(idx + rawMatch[0].length).trim(),
        };
      }
    } catch {}
  }

  return { before: text, schedule: null, after: '' };
}

function parseMessageParts(rawContent: string): BubblePart[] {
  if (!rawContent) return [];

  // Check schedule JSON block
  const sched = extractMobileSchedule(rawContent);
  if (sched.schedule) {
    const beforeParts = sched.before ? parseMessageParts(sched.before) : [];
    const afterParts = sched.after ? parseMessageParts(sched.after) : [];
    return [
      ...beforeParts,
      { type: 'schedule', schedule: sched.schedule },
      ...afterParts,
    ];
  }

  // Check book card
  const bookRegex = /:::book_card\s*\n?(\{[\s\S]*?\})\s*\n?:::/;
  const match = rawContent.match(bookRegex);
  if (match) {
    const idx = rawContent.indexOf(match[0]);
    const beforeText = rawContent.substring(0, idx).trim();
    const afterText = rawContent.substring(idx + match[0].length).trim();
    const beforeParts = beforeText ? parseMessageParts(beforeText) : [];
    const afterParts = afterText ? parseMessageParts(afterText) : [];
    try {
      const book = JSON.parse(match[1]);
      return [
        ...beforeParts,
        { type: 'book_card', book },
        ...afterParts,
      ];
    } catch {}
  }

  const trimmed = rawContent.trim();
  return trimmed ? [{ type: 'text', text: trimmed }] : [];
}

function ScheduleCardInline({ scheduleData, theme }: { scheduleData: any; theme: AppTheme }) {
  const isDark = theme.dark;
  const c = theme.colors;

  return (
    <View style={[inlineStyles.card, { backgroundColor: isDark ? c.surface : '#FFFFFF', borderColor: c.outlineVariant }]}>
      <View style={[inlineStyles.header, { backgroundColor: c.primary, justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="clock-outline" size={15} color="#FFFFFF" />
          <Text style={inlineStyles.headerLabel}>Giờ mở cửa thư viện IUH</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
          <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '700' }}>Chính thức</Text>
        </View>
      </View>
      <View style={{ padding: 10, gap: 6 }}>
        {Array.isArray(scheduleData.schedule) &&
          scheduleData.schedule.map((item: any, idx: number) => {
            let days = (item.days || item.day || '').trim();
            days = days
              .replace(/Monday\s*-\s*Friday/i, 'Thứ Hai - Thứ Sáu')
              .replace(/Saturday\s*-\s*Sunday/i, 'Thứ Bảy - Chủ Nhật')
              .replace(/Monday/i, 'Thứ Hai')
              .replace(/Tuesday/i, 'Thứ Ba')
              .replace(/Wednesday/i, 'Thứ Tư')
              .replace(/Thursday/i, 'Thứ Năm')
              .replace(/Friday/i, 'Thứ Sáu')
              .replace(/Saturday/i, 'Thứ Bảy')
              .replace(/Sunday/i, 'Chủ Nhật');
            return (
              <View
                key={idx}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 8,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.onSurface }}>{days}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>{item.hours || item.time}</Text>
              </View>
            );
          })}
        {scheduleData.note ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <MaterialCommunityIcons name="information-outline" size={13} color={c.onSurfaceVariant} />
            <Text style={{ fontSize: 11, color: c.onSurfaceVariant, flex: 1 }}>{scheduleData.note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function BookCardInline({ book, theme }: { book: any; theme: AppTheme }) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <View style={[inlineStyles.card, { backgroundColor: theme.dark ? theme.colors.surface : '#FFFFFF', borderColor: theme.colors.outlineVariant }]}>
      <View style={[inlineStyles.header, { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons name="book-open-variant" size={14} color="#FFFFFF" />
        <Text style={inlineStyles.headerLabel}>Thông tin sách</Text>
      </View>
      <View style={inlineStyles.body}>
        {book.cover_url && !imageError ? (
          <Image
            source={{ uri: book.cover_url }}
            style={inlineStyles.coverImage}
            onError={() => setImageError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[inlineStyles.cover, { backgroundColor: theme.colors.primary + '12' }]}>
            <MaterialCommunityIcons name="book" size={20} color={theme.colors.primary} />
          </View>
        )}
        <View style={inlineStyles.info}>
          <Text style={[inlineStyles.title, { color: theme.colors.onSurface }]} numberOfLines={2}>{book.title}</Text>
          {book.author && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>{book.author}</Text>}
          {book.isbn && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]}>ISBN: {book.isbn}</Text>}
          {book.categories && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]}>{book.categories}</Text>}
          {book.source && (
            <View style={[inlineStyles.sourceChip, { backgroundColor: theme.colors.primary + '15' }]}>
              <Text style={[inlineStyles.sourceText, { color: theme.colors.primary }]}>
                {book.source === 'database' ? 'Cơ sở dữ liệu' : 'Google Books'}
              </Text>
            </View>
          )}
        </View>
      </View>
      {book.description && (
        <Text style={[inlineStyles.description, { color: theme.colors.onSurfaceVariant }]} numberOfLines={3}>
          {book.description}
        </Text>
      )}
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  body: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  cover: {
    width: 48,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: 48,
    height: 64,
    borderRadius: 8,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  sourceChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  sourceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    lineHeight: 17,
  },
});

export default function ChatBubble({ message }: ChatBubbleProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isUser = message.role === 'user';
  const parts = useMemo(() => parseMessageParts(message.content), [message.content]);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {isUser ? (
        <View style={styles.userBubbleWrapper}>
          <View style={styles.userBubble}>
            <Text style={styles.userText} selectable>{message.content}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.assistantRow}>
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="robot" size={13} color="#FFFFFF" />
          </View>
          <View style={styles.assistantContent}>
            {parts.map((part, idx) => {
              if (part.type === 'book_card' && part.book) {
                return <BookCardInline key={idx} book={part.book} theme={theme} />;
              }
              if (part.type === 'schedule' && part.schedule) {
                return <ScheduleCardInline key={idx} scheduleData={part.schedule} theme={theme} />;
              }
              if (part.type === 'text' && part.text) {
                return (
                  <View key={idx} style={styles.assistantBubble}>
                    <SimpleMarkdownText content={part.text} />
                  </View>
                );
              }
              return null;
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const isDark = theme.dark;
  const c = theme.colors;

  return StyleSheet.create({
    container: {
      marginVertical: 4,
    },
    userContainer: {
      alignItems: 'flex-end',
      paddingHorizontal: 12,
    },
    assistantContainer: {
      alignItems: 'flex-start',
      paddingHorizontal: 12,
    },
    userBubbleWrapper: {
      maxWidth: '84%',
    },
    userBubble: {
      backgroundColor: c.primary,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 15,
      paddingVertical: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 2,
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 14,
      lineHeight: 21,
    },
    assistantRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      maxWidth: '92%',
      gap: 8,
    },
    assistantContent: {
      flex: 1,
    },
    assistantBubble: {
      backgroundColor: isDark ? c.surface : '#FFFFFF',
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: isDark ? c.outlineVariant : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    assistantText: {
      color: isDark ? c.onSurface : '#1E293B',
      fontSize: 14,
      lineHeight: 21,
    },
    avatarSmall: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
  });
}
