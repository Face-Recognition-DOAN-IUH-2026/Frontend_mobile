import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiApi } from '../../../../api/ai';
import { AICommandCenterSummary, AIMessage, CompanionChunk, CompanionState, VisemeData } from '../../../../types/ai';

interface AIWidgetStore {
  isOpen: boolean;
  isMinimized: boolean;
  activeTab: 'score' | 'chat' | 'actions';
  lastSummary: AICommandCenterSummary | null;
  messages: AIMessage[];
  isLoadingChat: boolean;
  chatSessionId?: string;

  companionState: CompanionState;
  isVoiceActive: boolean;
  visemeData: VisemeData[];
  audioQueue: string[];
  currentAudio: string | null;

  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  setActiveTab: (tab: 'score' | 'chat' | 'actions') => void;
  updateSummary: (summary: AICommandCenterSummary) => void;
  sendMessage: (message: string) => Promise<void>;
  sendVoiceMessage: (audioBase64: string) => Promise<void>;
  setCompanionState: (state: CompanionState) => void;
  setVoiceActive: (active: boolean) => void;
  setVisemeData: (visemes: VisemeData[]) => void;
  setCurrentAudio: (audio: string | null) => void;
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

      companionState: 'idle',
      isVoiceActive: false,
      visemeData: [],
      audioQueue: [],
      currentAudio: null,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      minimize: () => set((state) => ({ isMinimized: !state.isMinimized })),

      setActiveTab: (tab) => set({ activeTab: tab }),

      updateSummary: (summary) => set({ lastSummary: summary }),

      setCompanionState: (state) => set({ companionState: state }),
      setVoiceActive: (active) => set({ isVoiceActive: active }),
      setVisemeData: (visemes) => set({ visemeData: visemes }),
      setCurrentAudio: (audio) => set({ currentAudio: audio }),

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
          companionState: 'thinking',
        }));

        try {
          const { chatSessionId } = get();

          let accumulatedText = '';
          await aiApi.streamCompanionChat(
            message,
            undefined,
            chatSessionId,
            (chunk: CompanionChunk) => {
              switch (chunk.type) {
                case 'text':
                  accumulatedText += chunk.data.content;
                  set((state) => ({
                    messages: [
                      ...state.messages.filter((m) => m.id !== 'streaming'),
                      {
                        id: 'streaming',
                        role: 'assistant',
                        content: accumulatedText,
                        timestamp: new Date(),
                      },
                    ],
                  }));
                  break;
                case 'audio':
                  set({ currentAudio: chunk.data.audioBase64, companionState: 'speaking' });
                  break;
                case 'viseme':
                  set({ visemeData: chunk.data.visemes });
                  break;
                case 'companion_done':
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === 'streaming' ? { ...m, id: `assistant-${Date.now()}` } : m
                    ),
                    isLoadingChat: false,
                    companionState: 'idle',
                    chatSessionId: chunk.data.sessionId || state.chatSessionId,
                  }));
                  break;
              }
            },
            (error) => {
              console.error('Companion stream error:', error);
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
                    timestamp: new Date(),
                  },
                ],
                isLoadingChat: false,
                companionState: 'error',
              }));
            }
          );
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
            companionState: 'error',
          }));
        }
      },

      sendVoiceMessage: async (audioBase64: string) => {
        const userMessage: AIMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: '[Voice message]',
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isLoadingChat: true,
          companionState: 'listening',
        }));

        try {
          const { chatSessionId } = get();

          let accumulatedText = '';
          await aiApi.streamCompanionChat(
            undefined,
            audioBase64,
            chatSessionId,
            (chunk: CompanionChunk) => {
              switch (chunk.type) {
                case 'text':
                  accumulatedText += chunk.data.content;
                  set((state) => ({
                    messages: [
                      ...state.messages.filter((m) => m.id !== 'streaming'),
                      {
                        id: 'streaming',
                        role: 'assistant',
                        content: accumulatedText,
                        timestamp: new Date(),
                      },
                    ],
                  }));
                  break;
                case 'audio':
                  set({ currentAudio: chunk.data.audioBase64, companionState: 'speaking' });
                  break;
                case 'viseme':
                  set({ visemeData: chunk.data.visemes });
                  break;
                case 'companion_done':
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === 'streaming' ? { ...m, id: `assistant-${Date.now()}` } : m
                    ),
                    isLoadingChat: false,
                    companionState: 'idle',
                    chatSessionId: chunk.data.sessionId || state.chatSessionId,
                  }));
                  break;
              }
            },
            (error) => {
              console.error('Companion stream error:', error);
              set((state) => ({
                messages: [
                  ...state.messages,
                  {
                    id: `error-${Date.now()}`,
                    role: 'assistant',
                    content: 'Xin lỗi, đã xảy ra lỗi khi kết nối AI. Vui lòng thử lại.',
                    timestamp: new Date(),
                  },
                ],
                isLoadingChat: false,
                companionState: 'error',
              }));
            }
          );
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
            companionState: 'error',
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
