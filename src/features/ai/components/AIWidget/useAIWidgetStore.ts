import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiApi } from '../../../../api/ai';
import { AICommandCenterSummary, AIMessage } from '../../../../types/ai';

interface AIWidgetStore {
  isOpen: boolean;
  isMinimized: boolean;
  activeTab: 'score' | 'chat' | 'actions';
  lastSummary: AICommandCenterSummary | null;
  messages: AIMessage[];
  isLoadingChat: boolean;
  chatSessionId?: string;

  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  setActiveTab: (tab: 'score' | 'chat' | 'actions') => void;
  updateSummary: (summary: AICommandCenterSummary) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

const storage = createJSONStorage(() => AsyncStorage, {
  reviver: (key: string, value: unknown) => {
    if (key === 'timestamp' && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  },
});

export const useAIWidgetStore = create<AIWidgetStore>()(
  persist(
    (set, get) => ({
      isOpen: false,
      isMinimized: false,
      activeTab: 'score',
      lastSummary: null,
      messages: [],
      isLoadingChat: false,
      chatSessionId: undefined,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      minimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSummary: (summary) => set({ lastSummary: summary }),

      sendMessage: async (message: string) => {
        const userMessage: AIMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isLoadingChat: true,
        }));

        try {
          const { chatSessionId } = get();
          const data = await aiApi.chat(message, chatSessionId);

          const assistantMessage: AIMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response || 'Xin lỗi, tôi không thể trả lời lúc này.',
            timestamp: new Date(),
          };

          set((state) => ({
            messages: [...state.messages, assistantMessage],
            isLoadingChat: false,
            chatSessionId: data.sessionId || state.chatSessionId,
          }));
        } catch {
          const errorMessage: AIMessage = {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
            timestamp: new Date(),
          };

          set((state) => ({
            messages: [...state.messages, errorMessage],
            isLoadingChat: false,
          }));
        }
      },

      clearMessages: () => set({ messages: [], chatSessionId: undefined }),
    }),
    {
      name: 'ai-widget-storage',
      storage,
      partialize: (state) => ({
        isMinimized: state.isMinimized,
        activeTab: state.activeTab,
        messages: state.messages,
      }),
    }
  )
);
