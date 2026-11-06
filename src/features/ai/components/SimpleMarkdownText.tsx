import React, { useMemo } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';

interface SimpleMarkdownTextProps {
  content: string;
}

interface InlineToken {
  type: 'plain' | 'bold' | 'italic' | 'code' | 'link';
  text: string;
  url?: string;
}

type BlockToken =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'numbered'; index: string; text: string }
  | { type: 'codeblock'; code: string; language?: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'quote'; text: string }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function parseInline(raw: string): InlineToken[] {
  if (!raw) return [];
  const tokens: InlineToken[] = [];
  // Regex matches: `code`, **bold**, *italic*, [text](url)
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', text: raw.substring(lastIndex, match.index) });
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      tokens.push({ type: 'code', text: matchedStr.slice(1, -1) });
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      tokens.push({ type: 'bold', text: matchedStr.slice(2, -2) });
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      tokens.push({ type: 'italic', text: matchedStr.slice(1, -1) });
    } else if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
      const splitIdx = matchedStr.indexOf('](');
      const linkText = matchedStr.substring(1, splitIdx);
      const linkUrl = matchedStr.substring(splitIdx + 2, matchedStr.length - 1);
      tokens.push({ type: 'link', text: linkText, url: linkUrl });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < raw.length) {
    tokens.push({ type: 'plain', text: raw.substring(lastIndex) });
  }

  return tokens;
}

function parseBlocks(content: string): BlockToken[] {
  const lines = content.split('\n');
  const blocks: BlockToken[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code blocks: ```
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({
        type: 'codeblock',
        language: language || undefined,
        code: codeLines.join('\n'),
      });
      i++;
      continue;
    }

    // 2. Markdown Table: starts and ends with |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const splitRow = (rowStr: string) =>
          rowStr
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

        const rawHeaders = splitRow(tableLines[0]);
        // line 1 is separator |---|---|
        const isSeparator = /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(tableLines[1]);
        const startRowIdx = isSeparator ? 2 : 1;
        const rows: string[][] = [];

        for (let r = startRowIdx; r < tableLines.length; r++) {
          rows.push(splitRow(tableLines[r]));
        }

        blocks.push({
          type: 'table',
          headers: rawHeaders,
          rows,
        });
        continue;
      }
    }

    // 3. Horizontal line: --- or ***
    if (/^(\-{3,}|\*{3,}|\_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 4. Headings: #, ##, ###
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // 5. Blockquote: > text
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', text: trimmed.slice(2).trim() });
      i++;
      continue;
    }

    // 6. Bullet list: * , - , •
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const bulletText = trimmed.replace(/^[\*\-\•]\s+/, '');
      blocks.push({ type: 'bullet', text: bulletText });
      i++;
      continue;
    }

    // 7. Numbered list: 1. , 2. 
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({ type: 'numbered', index: numMatch[1], text: numMatch[2] });
      i++;
      continue;
    }

    // 8. Empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 9. Standard paragraph: can merge continuous non-empty lines
    const pLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('> ') &&
      !/^[\*\-\•]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !/^(\-{3,}|\*{3,}|\_{3,})$/.test(lines[i].trim())
    ) {
      pLines.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'p', text: pLines.join(' ') });
  }

  return blocks;
}

export default function SimpleMarkdownText({ content }: SimpleMarkdownTextProps) {
  const theme = useTheme() as AppTheme;
  const isDark = theme.dark;
  const c = theme.colors;

  const blocks = useMemo(() => parseBlocks(content), [content]);

  const renderInlineTokens = (text: string, baseStyle?: any) => {
    const tokens = parseInline(text);
    return (
      <Text style={[styles.inlineRoot, { color: isDark ? c.onSurface : '#1E293B' }, baseStyle]} selectable>
        {tokens.map((tok, idx) => {
          if (tok.type === 'bold') {
            return (
              <Text key={idx} style={[styles.bold, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                {tok.text}
              </Text>
            );
          }
          if (tok.type === 'italic') {
            return (
              <Text key={idx} style={styles.italic}>
                {tok.text}
              </Text>
            );
          }
          if (tok.type === 'code') {
            return (
              <Text
                key={idx}
                style={[
                  styles.inlineCode,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F1F5F9',
                    color: c.primary,
                  },
                ]}
              >
                {` ${tok.text} `}
              </Text>
            );
          }
          if (tok.type === 'link') {
            return (
              <Text key={idx} style={[styles.link, { color: c.primary }]}>
                {tok.text}
              </Text>
            );
          }
          return <Text key={idx}>{tok.text}</Text>;
        })}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {blocks.map((block, idx) => {
        if (block.type === 'h1') {
          return (
            <View key={idx} style={styles.h1Wrap}>
              {renderInlineTokens(block.text, styles.h1)}
            </View>
          );
        }
        if (block.type === 'h2') {
          return (
            <View key={idx} style={styles.h2Wrap}>
              {renderInlineTokens(block.text, styles.h2)}
            </View>
          );
        }
        if (block.type === 'h3') {
          return (
            <View key={idx} style={styles.h3Wrap}>
              {renderInlineTokens(block.text, styles.h3)}
            </View>
          );
        }
        if (block.type === 'bullet') {
          return (
            <View key={idx} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: c.primary }]} />
              <View style={styles.bulletTextWrap}>
                {renderInlineTokens(block.text, styles.paragraph)}
              </View>
            </View>
          );
        }
        if (block.type === 'numbered') {
          return (
            <View key={idx} style={styles.numberedRow}>
              <Text style={[styles.numberedIndex, { color: c.primary }]}>
                {block.index}.
              </Text>
              <View style={styles.bulletTextWrap}>
                {renderInlineTokens(block.text, styles.paragraph)}
              </View>
            </View>
          );
        }
        if (block.type === 'quote') {
          return (
            <View
              key={idx}
              style={[
                styles.quoteBox,
                {
                  borderLeftColor: c.primary,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              ]}
            >
              {renderInlineTokens(block.text, styles.quoteText)}
            </View>
          );
        }
        if (block.type === 'hr') {
          return (
            <View
              key={idx}
              style={[
                styles.hr,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' },
              ]}
            />
          );
        }
        if (block.type === 'codeblock') {
          return (
            <ScrollView
              key={idx}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[
                styles.codeBlockScroll,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <Text
                style={[
                  styles.codeBlockText,
                  { color: isDark ? '#E2E8F0' : '#1E293B' },
                ]}
                selectable
              >
                {block.code}
              </Text>
            </ScrollView>
          );
        }
        if (block.type === 'table') {
          return (
            <ScrollView
              key={idx}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[
                styles.tableScroll,
                {
                  backgroundColor: isDark ? c.surface : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.table}>
                {/* Headers */}
                <View
                  style={[
                    styles.tableRow,
                    styles.tableHeaderRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
                    },
                  ]}
                >
                  {block.headers.map((h, hIdx) => (
                    <View key={hIdx} style={styles.tableCell}>
                      <Text
                        style={[
                          styles.tableHeaderText,
                          { color: isDark ? '#FFFFFF' : '#0F172A' },
                        ]}
                      >
                        {h}
                      </Text>
                    </View>
                  ))}
                </View>
                {/* Data Rows */}
                {block.rows.map((row, rIdx) => (
                  <View
                    key={rIdx}
                    style={[
                      styles.tableRow,
                      {
                        backgroundColor:
                          rIdx % 2 === 1
                            ? isDark
                              ? 'rgba(255,255,255,0.02)'
                              : 'rgba(0,0,0,0.015)'
                            : 'transparent',
                        borderBottomColor: isDark
                          ? 'rgba(255,255,255,0.05)'
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    {row.map((cell, cIdx) => (
                      <View key={cIdx} style={styles.tableCell}>
                        <Text
                          style={[
                            styles.tableCellText,
                            { color: isDark ? c.onSurface : '#334155' },
                          ]}
                          selectable
                        >
                          {cell}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        // Paragraph
        return (
          <View key={idx} style={styles.pWrap}>
            {renderInlineTokens(block.text, styles.paragraph)}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  inlineRoot: {
    fontSize: 14,
    lineHeight: 22,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
  pWrap: {
    marginVertical: 2,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 12.5,
    borderRadius: 4,
    fontWeight: '600',
  },
  link: {
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  h1Wrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 25,
  },
  h2Wrap: {
    marginTop: 6,
    marginBottom: 3,
  },
  h2: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 23,
  },
  h3Wrap: {
    marginTop: 4,
    marginBottom: 2,
  },
  h3: {
    fontSize: 14.5,
    fontWeight: '700',
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 8,
    marginRight: 8,
  },
  bulletTextWrap: {
    flex: 1,
  },
  numberedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
    paddingLeft: 2,
  },
  numberedIndex: {
    fontSize: 13.5,
    fontWeight: '700',
    marginRight: 6,
    lineHeight: 22,
  },
  quoteBox: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
    marginVertical: 4,
    borderRadius: 2,
  },
  quoteText: {
    fontStyle: 'italic',
    fontSize: 13.5,
  },
  hr: {
    height: 1,
    marginVertical: 8,
  },
  codeBlockScroll: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginVertical: 6,
  },
  codeBlockText: {
    fontFamily: 'monospace',
    fontSize: 12.5,
    lineHeight: 18,
  },
  tableScroll: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
    maxWidth: '100%',
  },
  table: {
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    borderBottomWidth: 1.5,
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  tableCellText: {
    fontSize: 12.5,
    lineHeight: 17,
  },
});

