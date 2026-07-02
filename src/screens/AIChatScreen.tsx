import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Text, TextInput, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIMessage, AIPendingAction } from '../types/ai';
import { aiApi } from '../api/ai';
import { reserveBook } from '../api/borrow';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';
import { GradientHeader } from '../theme/MobileDesignSystem';
import { GRADIENTS } from '../theme/MobileDesignSystem';
import ChatBubble from '../components/ai/ChatBubble';
import ToolResultCard from '../components/ai/ToolResultCard';
import ConfirmDialog from '../components/ai/ConfirmDialog';
import QuickActions from '../components/ai/QuickActions';
import TypingIndicator from '../components/ai/TypingIndicator';

const SESSION_KEY_PREFIX = 'ai-chat-session';
const MESSAGES_KEY_PREFIX = 'ai-chat-messages';

interface AIChatScreenProps {
  navigation: any;
}

const WELCOME_ACTIONS_STAFF = [
  { label: 'Tìm sách', message: 'tìm kiếm sách', icon: 'book-search' },
  { label: 'Lịch trực', message: 'xem lịch trực hôm nay', icon: 'calendar-clock' },
  { label: 'Sách trễ hạn', message: 'kiểm tra sách trễ hạn', icon: 'alert-circle' },
  { label: 'Thẻ thư viện', message: 'tra cứu thông tin thẻ', icon: 'card-account-details' },
];

const WELCOME_ACTIONS_PATRON = [
  { label: 'Tìm sách', message: 'tìm kiếm sách', icon: 'book-search' },
  { label: 'Lịch sử mượn', message: 'xem lịch sử mượn sách', icon: 'history' },
  { label: 'Gợi ý sách', message: 'gợi ý sách phù hợp', icon: 'lightbulb' },
  { label: 'Thẻ thư viện', message: 'tra cứu thông tin thẻ', icon: 'card-account-details' },
];

export default function AIChatScreen({ navigation }: AIChatScreenProps) {
  const theme = useTheme() as AppTheme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, patron } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'staff';

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [pendingAction, setPendingAction] = useState<AIPendingAction | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = useMemo(() => patron?.id || user?.id, [patron?.id, user?.id]);

  const sessionKey = useMemo(() => currentUserId ? `${SESSION_KEY_PREFIX}-${currentUserId}` : null, [currentUserId]);
  const messagesKey = useMemo(() => currentUserId ? `${MESSAGES_KEY_PREFIX}-${currentUserId}` : null, [currentUserId]);

  useEffect(() => {
    setMessages([]);
    setSessionId(undefined);
    loadSession();
  }, [currentUserId]);

  const loadSession = async () => {
    if (!sessionKey || !messagesKey) return;
    try {
      const savedMessages = await AsyncStorage.getItem(messagesKey);
      const savedSessionId = await AsyncStorage.getItem(sessionKey);
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedSessionId) setSessionId(savedSessionId);
    } catch {}
  };

  const saveSession = async (msgs: AIMessage[], sid?: string) => {
    if (!sessionKey || !messagesKey) return;
    try {
      await AsyncStorage.setItem(messagesKey, JSON.stringify(msgs));
      if (sid) await AsyncStorage.setItem(sessionKey, sid);
    } catch {}
  };

  const addMessage = useCallback((msg: AIMessage) => {
    setMessages(prev => {
      const next = [...prev, msg];
      saveSession(next, sessionId);
      return next;
    });
  }, [sessionId]);

  const scrollToBottom = () => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    addMessage(userMessage);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      const patronId = patron?.id || user?.id;
      const response = await aiApi.chat(msg, sessionId, user?.role, patronId);

      if (response.sessionId && response.sessionId !== sessionId) {
        setSessionId(response.sessionId);
        if (sessionKey) await AsyncStorage.setItem(sessionKey, response.sessionId);
      }

      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        toolResults: response.toolResults,
        requiresConfirmation: response.requiresConfirmation,
        pendingAction: response.pendingAction,
        timestamp: new Date(),
      };
      addMessage(assistantMessage);

      if (response.requiresConfirmation && response.pendingAction) {
        setPendingAction(response.pendingAction);
        setConfirmVisible(true);
      }
    } catch (error: any) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleConfirm = async (action: 'approve' | 'reject') => {
    setConfirmVisible(false);
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await aiApi.confirm(sessionId, action, user?.role);
      const msg: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message || (action === 'approve' ? 'Đã thực hiện thành công.' : 'Đã hủy hành động.'),
        timestamp: new Date(),
      };
      addMessage(msg);
    } catch {
      const msg: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Lỗi khi xử lý xác nhận.',
        timestamp: new Date(),
      };
      addMessage(msg);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleReserve = async (bookId: string, title: string) => {
    Alert.alert('Đặt chỗ', `Bạn muốn đặt chỗ "${title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đặt chỗ',
        onPress: async () => {
          try {
            const result = await reserveBook(bookId);
            const msg: AIMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: result.message || 'Đặt chỗ thành công!',
              timestamp: new Date(),
            };
            addMessage(msg);
          } catch (error: any) {
            const msg = error?.response?.data?.detail || error?.message || 'Không thể đặt chỗ';
            const errMsg: AIMessage = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `Lỗi đặt chỗ: ${msg}`,
              timestamp: new Date(),
            };
            addMessage(errMsg);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: AIMessage }) => (
    <View>
      <ChatBubble message={item} />
      {item.toolResults?.map((tr, idx) => (
        <View key={idx} style={styles.toolResultWrapper}>
          <ToolResultCard toolResult={tr} onReserve={handleReserve} />
        </View>
      ))}
    </View>
  );

  const welcomeActions = isStaff ? WELCOME_ACTIONS_STAFF : WELCOME_ACTIONS_PATRON;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.welcomeAvatarOuter}>
        <View style={styles.welcomeAvatarMid}>
          <View style={styles.welcomeAvatarInner}>
            <MaterialCommunityIcons name="robot" size={40} color="#FFFFFF" />
          </View>
        </View>
      </View>
      <Text variant="headlineSmall" style={styles.welcomeTitle}>
        Xin chào! 👋
      </Text>
      <Text variant="bodyLarge" style={styles.welcomeSubtitle}>
        Tôi là Trợ Lý AI của Thư Viện.
      </Text>
      <Text variant="bodyMedium" style={styles.welcomeHint}>
        Bạn muốn tìm sách, kiểm tra thẻ, hay xem lịch sử mượn?
      </Text>
      <View style={styles.welcomeActions}>
        {welcomeActions.map((action, idx) => (
          <Surface key={idx} style={styles.chipSurface} elevation={0}>
            <IconButton
              icon={action.icon}
              size={18}
              onPress={() => sendMessage(action.message)}
              iconColor={GRADIENTS.indigo[0]}
              style={styles.chipIcon}
            />
            <Text
              variant="bodySmall"
              style={styles.welcomeActionText}
              onPress={() => sendMessage(action.message)}
            >
              {action.label}
            </Text>
          </Surface>
        ))}
      </View>
    </View>
  );

  const showWelcome = messages.length === 0 && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <GradientHeader
        title="TVTL AI"
        subtitle="Trợ lý thông minh"
        icon="robot"
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {showWelcome ? (
          renderEmpty()
        ) : (
          <View style={styles.chatArea}>
            {messages.length > 0 ? (
              <QuickActions onSelect={sendMessage} isStaff={isStaff} />
            ) : null}
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderItem}
              keyExtractor={item => item.id}
              style={styles.flatList}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={scrollToBottom}
              ListEmptyComponent={null}
            />
          </View>
        )}

        {loading && !showWelcome ? (
          <View style={styles.typingRow}>
            <View style={styles.typingAvatar}>
              <MaterialCommunityIcons name="robot" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.typingBubble}>
              <TypingIndicator />
            </View>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <MaterialCommunityIcons name="pencil" size={18} color={theme.colors.onSurfaceVariant} style={{ marginLeft: 14 }} />
            <TextInput
              style={styles.input}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              dense
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              textColor={theme.colors.onSurface}
            />
            <View style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}>
              <IconButton
                icon="send"
                size={20}
                onPress={() => sendMessage()}
                disabled={!input.trim() || loading}
                iconColor="#FFFFFF"
                style={{ margin: 0 }}
              />
            </View>
          </View>
        </View>

        <ConfirmDialog
          visible={confirmVisible}
          pendingAction={pendingAction}
          onApprove={() => handleConfirm('approve')}
          onReject={() => handleConfirm('reject')}
          onDismiss={() => setConfirmVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  const c = theme.colors;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    keyboardView: {
      flex: 1,
      backgroundColor: c.background,
    },
    chatArea: {
      flex: 1,
    },
    flatList: {
      flex: 1,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    welcomeAvatarOuter: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: c.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    welcomeAvatarMid: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: c.primary + '25',
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeAvatarInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
    },
    welcomeTitle: {
      color: c.onSurface,
      fontWeight: '800',
      marginBottom: 6,
    },
    welcomeSubtitle: {
      color: c.onSurfaceVariant,
      textAlign: 'center',
      marginBottom: 6,
    },
    welcomeHint: {
      color: c.onSurfaceVariant,
      opacity: 0.8,
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    welcomeActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 10,
    },
    chipSurface: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.outlineVariant,
    },
    chipIcon: {
      margin: 0,
      marginRight: -6,
    },
    welcomeActionText: {
      color: c.onSurfaceVariant,
      fontWeight: '600',
      marginRight: 14,
      fontSize: 13,
    },
    messageList: {
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    messageListEmpty: {
      flex: 1,
    },
    toolResultWrapper: {
      paddingHorizontal: 16,
    },
    typingRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 6,
      gap: 8,
    },
    typingAvatar: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typingBubble: {
      backgroundColor: c.surfaceVariant,
      borderRadius: 18,
      borderBottomLeftRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    inputContainer: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.outlineVariant,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.outlineVariant,
      paddingLeft: 4,
    },
    input: {
      flex: 1,
      backgroundColor: 'transparent',
      fontSize: 14,
      color: c.onSurface,
      minHeight: 44,
    },
    sendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 4,
    },
    sendBtnDisabled: {
      backgroundColor: c.outlineVariant,
    },
  });
}
