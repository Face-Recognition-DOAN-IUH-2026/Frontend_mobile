import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AIMessage } from '../../types/ai';
import { AppTheme } from '../../theme/DarkTheme';

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
    <View style={[inlineStyles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
      <View style={inlineStyles.header}>
        <MaterialCommunityIcons name="book-open-variant" size={16} color={theme.colors.primary} />
        <Text style={[inlineStyles.headerLabel, { color: theme.colors.primary }]}>Thông tin sách</Text>
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
          <View style={[inlineStyles.cover, { backgroundColor: theme.colors.surfaceVariant }]}>
            <MaterialCommunityIcons name="book" size={24} color={theme.colors.primary} />
          </View>
        )}
        <View style={inlineStyles.info}>
          <Text style={[inlineStyles.title, { color: theme.colors.onSurface }]}>{book.title}</Text>
          {book.author && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]}>{book.author}</Text>}
          {book.isbn && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]}>ISBN: {book.isbn}</Text>}
          {book.categories && <Text style={[inlineStyles.meta, { color: theme.colors.onSurfaceVariant }]}>{book.categories}</Text>}
          {book.source && (
            <View style={[inlineStyles.sourceChip, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={[inlineStyles.sourceText, { color: theme.colors.onSurfaceVariant }]}>
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
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 6,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
  },
  cover: {
    width: 48,
    height: 64,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: {
    width: 48,
    height: 64,
    borderRadius: 6,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  sourceChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 4,
  },
  sourceText: {
    fontSize: 10,
  },
  description: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    lineHeight: 16,
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
      backgroundColor: theme.colors.primary,
      borderRadius: 18,
      borderBottomRightRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      lineHeight: 20,
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
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    assistantText: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
      lineHeight: 20,
    },
    avatarSmall: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
