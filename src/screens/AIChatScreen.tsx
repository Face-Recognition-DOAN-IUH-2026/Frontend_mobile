import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, Text, TextInput, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIMessage, AIPendingAction } from '../types/ai';
import { aiApi } from '../api/ai';
import { useAuth } from '../context/AuthContext';
import { AppTheme } from '../theme/DarkTheme';
import ChatBubble from '../components/ai/ChatBubble';
import ToolResultCard from '../components/ai/ToolResultCard';
import ConfirmDialog from '../components/ai/ConfirmDialog';
import QuickActions from '../components/ai/QuickActions';
import TypingIndicator from '../components/ai/TypingIndicator';

const SESSION_KEY = 'ai-chat-session';
const MESSAGES_KEY = 'ai-chat-messages';

interface AIChatScreenProps {
  navigation: any;
}

const WELCOME_ACTIONS_STAFF = [
  { label: 'Tim sach', message: 'tim kiem sach', icon: 'book-search' },
  { label: 'Lich truc', message: 'xem lich truc hom nay', icon: 'calendar-clock' },
  { label: 'Sach tre han', message: 'kiem tra sach tre han', icon: 'alert-circle' },
  { label: 'The thu vien', message: 'tra cuu thong tin the', icon: 'card-account-details' },
];

const WELCOME_ACTIONS_PATRON = [
  { label: 'Tim sach', message: 'tim kiem sach', icon: 'book-search' },
  { label: 'Lich su muon', message: 'xem lich su muon sach', icon: 'history' },
  { label: 'Goi y sach', message: 'goi y sach phu hop', icon: 'lightbulb' },
  { label: 'The thu vien', message: 'tra cuu thong tin the', icon: 'card-account-details' },
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

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem(MESSAGES_KEY);
      const savedSessionId = await AsyncStorage.getItem(SESSION_KEY);
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedSessionId) setSessionId(savedSessionId);
    } catch {}
  };

  const saveSession = async (msgs: AIMessage[], sid?: string) => {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs));
      if (sid) await AsyncStorage.setItem(SESSION_KEY, sid);
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
      const response = await aiApi.chat(msg, sessionId, patronId);

      if (response.sessionId && response.sessionId !== sessionId) {
        setSessionId(response.sessionId);
        await AsyncStorage.setItem(SESSION_KEY, response.sessionId);
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
        content: 'Xin loi, da xay ra loi. Vui long thu lai.',
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
      const response = await aiApi.confirm(sessionId, action);
      const msg: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.message || (action === 'approve' ? 'Da thuc hien thanh cong.' : 'Da huy hanh dong.'),
        timestamp: new Date(),
      };
      addMessage(msg);
    } catch {
      const msg: AIMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Loi khi xu ly xac nhan.',
        timestamp: new Date(),
      };
      addMessage(msg);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderItem = ({ item }: { item: AIMessage }) => (
    <View>
      <ChatBubble message={item} />
      {item.toolResults?.map((tr, idx) => (
        <View key={idx} style={styles.toolResultWrapper}>
          <ToolResultCard toolResult={tr} />
        </View>
      ))}
    </View>
  );

  const welcomeActions = isStaff ? WELCOME_ACTIONS_STAFF : WELCOME_ACTIONS_PATRON;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.welcomeAvatarOuter}>
        <View style={styles.welcomeAvatarInner}>
          <MaterialCommunityIcons name="robot" size={40} color="#FFFFFF" />
        </View>
      </View>
      <Text variant="headlineSmall" style={styles.welcomeTitle}>
        Xin chao! 👋
      </Text>
      <Text variant="bodyLarge" style={styles.welcomeSubtitle}>
        Toi la Tro Ly AI cua Thu Vien.
      </Text>
      <Text variant="bodyMedium" style={styles.welcomeHint}>
        Ban muon tim sach, kiem tra the, hay xem lich su muon?
      </Text>
      <View style={styles.welcomeActions}>
        {welcomeActions.map((action, idx) => (
          <View key={idx} style={styles.welcomeActionChip}>
            <IconButton
              icon={action.icon}
              size={18}
              onPress={() => sendMessage(action.message)}
              iconColor={theme.colors.primary}
              style={styles.chipIcon}
            />
            <Text
              variant="bodySmall"
              style={styles.welcomeActionText}
              onPress={() => sendMessage(action.message)}
            >
              {action.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const showWelcome = messages.length === 0 && !loading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}>
            <MaterialCommunityIcons name="robot" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text variant="titleMedium" style={styles.headerTitle}>TVTL AI</Text>
            <Text variant="bodySmall" style={styles.headerSubtitle}>Tro ly thong minh</Text>
          </View>
        </View>
        <IconButton
          icon="dots-vertical"
          size={20}
          onPress={() => {}}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {showWelcome && renderEmpty()}

        {!showWelcome && messages.length > 0 && (
          <QuickActions onSelect={sendMessage} isStaff={isStaff} />
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messageList,
            showWelcome && styles.messageListEmpty,
          ]}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={null}
        />

        {loading && !showWelcome && (
          <View style={styles.typingRow}>
            <View style={styles.typingAvatar}>
              <MaterialCommunityIcons name="robot" size={12} color="#FFFFFF" />
            </View>
            <View style={styles.typingBubble}>
              <TypingIndicator />
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Nhap tin nhan..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              dense
              mode="flat"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
            />
            <IconButton
              icon="send-circle"
              size={32}
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              iconColor={input.trim() ? theme.colors.primary : theme.colors.onSurfaceVariant}
              style={styles.sendButton}
            />
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
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#0D1117',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#161B22',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: '#21262D',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#1A73E8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 15,
    },
    headerSubtitle: {
      color: '#8B949E',
      fontSize: 11,
    },
    keyboardView: {
      flex: 1,
      backgroundColor: '#0D1117',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    welcomeAvatarOuter: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(26, 115, 232, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    welcomeAvatarInner: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#1A73E8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    welcomeTitle: {
      color: '#FFFFFF',
      fontWeight: '700',
      marginBottom: 4,
    },
    welcomeSubtitle: {
      color: '#C9D1D9',
      textAlign: 'center',
      marginBottom: 4,
    },
    welcomeHint: {
      color: '#8B949E',
      textAlign: 'center',
      marginBottom: 32,
      paddingHorizontal: 16,
    },
    welcomeActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    welcomeActionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#161B22',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#21262D',
    },
    chipIcon: {
      margin: 0,
      marginRight: -4,
    },
    welcomeActionText: {
      color: '#C9D1D9',
      marginRight: 12,
    },
    messageList: {
      paddingVertical: 8,
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
      paddingVertical: 4,
      gap: 6,
    },
    typingAvatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#1A73E8',
      alignItems: 'center',
      justifyContent: 'center',
    },
    typingBubble: {
      backgroundColor: '#161B22',
      borderRadius: 16,
      borderBottomLeftRadius: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    inputContainer: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: '#0D1117',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: '#21262D',
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#161B22',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#21262D',
      paddingLeft: 16,
    },
    input: {
      flex: 1,
      backgroundColor: 'transparent',
      fontSize: 14,
      color: '#C9D1D9',
      minHeight: 40,
    },
    sendButton: {
      margin: 0,
      marginRight: 4,
    },
  });
}
