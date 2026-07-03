import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, useTheme, TouchableRipple, ActivityIndicator, SegmentedButtons } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAIWidgetStore } from './useAIWidgetStore';
import { aiApi } from '../../../../api/ai';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.75;

export default function AIWidgetPanel({ role }: { role: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isOpen, close, activeTab, setActiveTab, messages, sendMessage, isLoadingChat, clearMessages } = useAIWidgetStore();
  const [input, setInput] = useState('');
  const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
  const flatListRef = useRef<FlatList>(null);
  const isPatron = role === 'patron';

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOpen ? 0 : PANEL_HEIGHT,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [isOpen, slideAnim]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoadingChat) return;
    setInput('');
    await sendMessage(trimmed);
  }, [input, isLoadingChat, sendMessage]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={close} />
      <Animated.View
        style={[
          styles.panel,
          {
            paddingBottom: insets.bottom + 8,
            backgroundColor: theme.colors.surface,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.outlineVariant }]}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="robot" size={22} color={theme.colors.primary} />
            <Text variant="titleMedium" style={styles.headerTitle}>AI Library Helper</Text>
          </View>
          <Pressable onPress={close} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurface} />
          </Pressable>
        </View>

        {!isPatron && (
          <SegmentedButtons
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            buttons={[
              { value: 'score', label: 'Score' },
              { value: 'chat', label: 'Chat' },
              { value: 'actions', label: 'Actions' },
            ]}
            style={styles.tabs}
          />
        )}

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {isPatron ? (
            <ChatTabContent
              messages={messages}
              isLoadingChat={isLoadingChat}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              clearMessages={clearMessages}
              flatListRef={flatListRef}
            />
          ) : (
            <>
              {activeTab === 'score' && <ScoreTabContent />}
              {activeTab === 'chat' && (
                <ChatTabContent
                  messages={messages}
                  isLoadingChat={isLoadingChat}
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  clearMessages={clearMessages}
                  flatListRef={flatListRef}
                />
              )}
              {activeTab === 'actions' && <ActionsTabContent />}
            </>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

function ScoreTabContent() {
  const theme = useTheme();
  const { lastSummary, updateSummary } = useAIWidgetStore();
  const [loading, setLoading] = useState(false);

  const loadScore = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await aiApi.getHealthSummary();
      updateSummary(raw);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [updateSummary]);

  useEffect(() => {
    if (!lastSummary) loadScore();
  }, []);

  const score = lastSummary?.operational_score ?? 0;
  const scoreColor = score >= 80 ? '#4CAF50' : score >= 60 ? '#FF9800' : '#F44336';

  return (
    <View style={styles.tabContent}>
      <View style={[styles.scoreCard, { borderColor: scoreColor }]}>
        <Text variant="labelSmall" style={styles.scoreLabel}>Điểm vận hành</Text>
        <Text style={[styles.scoreValue, { color: scoreColor }]}>{score}</Text>
        <Text style={styles.scoreMax}>/ 100</Text>
      </View>
      {lastSummary && (
        <View style={styles.metricsRow}>
          <MetricItem icon="account-group" label="Patron" value={String(lastSummary.snapshot.active_patrons)} theme={theme} />
          <MetricItem icon="book-alert" label="Quá hạn" value={String(lastSummary.snapshot.overdue_borrows)} theme={theme} />
          <MetricItem icon="calendar-clock" label="Trực" value={String(lastSummary.snapshot.scheduled_staff_today)} theme={theme} />
        </View>
      )}
      <Pressable onPress={loadScore} style={[styles.refreshButton, { borderColor: theme.colors.outline }]}>
        <MaterialCommunityIcons name="refresh" size={16} color={theme.colors.primary} />
        <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4 }}>Refresh</Text>
      </Pressable>
    </View>
  );
}

function MetricItem({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: any }) {
  return (
    <View style={styles.metricItem}>
      <MaterialCommunityIcons name={icon as any} size={18} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{label}</Text>
      <Text variant="titleSmall" style={{ fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function ChatTabContent({
  messages, isLoadingChat, input, setInput, handleSend, clearMessages, flatListRef,
}: {
  messages: any[]; isLoadingChat: boolean; input: string; setInput: (v: string) => void;
  handleSend: () => void; clearMessages: () => void; flatListRef: any;
}) {
  const theme = useTheme();

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[styles.bubbleRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
      <View style={[
        styles.bubble,
        item.role === 'user'
          ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
          : [styles.assistantBubble, { backgroundColor: theme.colors.surfaceVariant }],
      ]}>
        <Text variant="bodyMedium" style={{ color: item.role === 'user' ? '#fff' : theme.colors.onSurface }}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.chatList}
        contentContainerStyle={messages.length === 0 ? styles.emptyChat : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="robot" size={40} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 8 }}>
              Xin chào! Tôi là AI Library Helper.{'\n'}Hỏi tôi về thư viện, lịch trực, sách...
            </Text>
          </View>
        }
      />
      {isLoadingChat && <ActivityIndicator style={styles.loadingIndicator} />}
      <View style={[styles.inputRow, { borderTopColor: theme.colors.outlineVariant }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.surfaceVariant, color: theme.colors.onSurface }]}
          placeholder="Hỏi AI..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || isLoadingChat}
          style={[styles.sendButton, { backgroundColor: theme.colors.primary, opacity: !input.trim() || isLoadingChat ? 0.5 : 1 }]}
        >
          <MaterialCommunityIcons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function ActionsTabContent() {
  const theme = useTheme();
  const actions = [
    { icon: 'calendar-clock' as const, title: 'Xem lịch trực', desc: 'Kiểm tra lịch trực nhân viên hôm nay', color: '#4A8C5C' },
    { icon: 'book-alert' as const, title: 'Sách quá hạn', desc: 'Danh sách sách quá hạn chưa trả', color: '#B85C4A' },
    { icon: 'account-group' as const, title: 'Độc giả trong thư viện', desc: 'Xem ai đang ở trong thư viện', color: '#3B82F6' },
  ];

  return (
    <View style={styles.tabContent}>
      {actions.map((action) => (
        <TouchableRipple
          key={action.title}
          style={[styles.actionCard, { borderColor: theme.colors.outlineVariant }]}
          onPress={() => {}}
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <MaterialCommunityIcons name={action.icon} size={20} color={action.color} />
            </View>
            <View style={styles.actionInfo}>
              <Text variant="bodyMedium" style={{ fontWeight: '700' }}>{action.title}</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{action.desc}</Text>
            </View>
          </View>
        </TouchableRipple>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: PANEL_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: '700',
  },
  tabs: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 12,
  },
  scoreCard: {
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 12,
  },
  scoreLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.7,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '900',
    lineHeight: 52,
  },
  scoreMax: {
    fontSize: 14,
    opacity: 0.6,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  chatList: {
    flex: 1,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingIndicator: {
    paddingVertical: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
  },
  actionCard: {
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: {
    flex: 1,
  },
});
