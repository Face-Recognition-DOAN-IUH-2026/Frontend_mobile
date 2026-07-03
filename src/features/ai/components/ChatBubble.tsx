import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIMessage } from '../../../types/ai';
import { AppTheme } from '../../../theme/DarkTheme';

interface ChatBubbleProps {
  message: AIMessage;
}

function parseBookCards(content: string): Array<{ type: 'text' | 'book_card'; text?: string; book?: any }> {
  const parts: Array<{ type: 'text' | 'book_card'; text?: string; book?: any }> = [];
  const regex = /:::book_card\s*\n?(\{[\s\S]*?\})\s*\n?:::/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', text });
    }
    try {
      const book = JSON.parse(match[1]);
      parts.push({ type: 'book_card', book });
    } catch {
      parts.push({ type: 'text', text: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', text });
  }

  return parts.length > 0 ? parts : [{ type: 'text', text: content }];
}

function BookCardInline({ book, theme }: { book: any; theme: AppTheme }) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <View style={[inlineStyles.card, { backgroundColor: theme.dark ? '#1C1C2E' : '#FFFFFF', borderColor: theme.dark ? '#2A2A3C' : '#E5E7EB' }]}>
      <View style={[inlineStyles.header, { backgroundColor: theme.dark ? '#2D2D44' : '#6366F1' }]}>
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
  const parts = useMemo(() => parseBookCards(message.content), [message.content]);

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      {isUser ? (
        <View style={styles.userBubbleWrapper}>
          <View style={styles.userBubble}>
            <Text style={styles.userText}>{message.content}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.assistantRow}>
          <View style={styles.avatarSmall}>
            <MaterialCommunityIcons name="robot" size={12} color="#FFFFFF" />
          </View>
          <View style={styles.assistantContent}>
            {parts.map((part, idx) => {
              if (part.type === 'book_card' && part.book) {
                return <BookCardInline key={idx} book={part.book} theme={theme} />;
              }
              return part.text ? (
                <View key={idx} style={styles.assistantBubble}>
                  <Text style={styles.assistantText}>{part.text}</Text>
                </View>
              ) : null;
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  const isDark = theme.dark;

  return StyleSheet.create({
    container: {
      marginVertical: 3,
    },
    userContainer: {
      alignItems: 'flex-end',
      paddingHorizontal: 16,
    },
    assistantContainer: {
      alignItems: 'flex-start',
      paddingHorizontal: 16,
    },
    userBubbleWrapper: {
      maxWidth: '82%',
    },
    userBubble: {
      backgroundColor: isDark ? '#6366F1' : '#6366F1',
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userText: {
      color: '#FFFFFF',
      fontSize: 14,
      lineHeight: 21,
    },
    assistantRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      maxWidth: '88%',
      gap: 6,
    },
    assistantContent: {
      flex: 1,
    },
    assistantBubble: {
      backgroundColor: isDark ? '#1C1C2E' : '#F3F4F6',
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    assistantText: {
      color: isDark ? 'rgba(255,255,255,0.85)' : '#374151',
      fontSize: 14,
      lineHeight: 21,
    },
    avatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? '#6366F1' : '#6366F1',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
