import api from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AIChatResponse,
  AIConfirmResponse,
  AICommandCenterSummary,
  AIBookRecommendationResponse,
  AICommandCenterChatResponse,
  AIInsight,
  AIInsightExplanation,
  AIInsightList,
  CompanionChunk,
} from '../types/ai';

export const aiApi = {
  async chat(message: string, sessionId?: string, role?: string, patronId?: string): Promise<AIChatResponse> {
    const endpoint = role === 'patron' ? '/ai/patrons/chat'
                   : role === 'staff' ? '/ai/staff/chat'
                   : '/ai/admin/chat';
    const body: Record<string, any> = { message };
    if (sessionId) body.sessionId = sessionId;
    if (patronId && role !== 'patron') body.patronId = patronId;
    const { data } = await api.post(endpoint, body);
    return data;
  },

  async confirm(sessionId: string, action: 'approve' | 'reject', role?: string): Promise<AIConfirmResponse> {
    const endpoint = role === 'patron' ? '/ai/patrons/confirm'
                   : role === 'staff' ? '/ai/staff/confirm'
                   : role === 'admin' ? '/ai/admin/confirm'
                   : '/ai/confirm';
    const { data } = await api.post(endpoint, { sessionId, action });
    return data;
  },

  async getHealthSummary(): Promise<AICommandCenterSummary> {
    const { data } = await api.get('/ai/command-center/summary');
    return data;
  },

  async commandCenterChat(question: string): Promise<AICommandCenterChatResponse> {
    const { data } = await api.post('/ai/command-center/chat', { question });
    return data;
  },

  async getBookRecommendations(studentCode: string): Promise<AIBookRecommendationResponse> {
    const { data } = await api.get(`/ai/recommendations/patron/${studentCode}`);
    return data;
  },

  async getInsights(params?: { status?: string; category?: string; severity?: string }): Promise<AIInsightList> {
    const { data } = await api.get('/ai/insights', { params });
    return data;
  },

  async dismissInsight(id: string): Promise<AIInsight> {
    const { data } = await api.post(`/ai/insights/${id}/dismiss`);
    return data;
  },

  async explainInsight(id: string): Promise<AIInsightExplanation> {
    const { data } = await api.get(`/ai/insights/${id}/explain`);
    return data;
  },

  async streamCompanionChat(
    message: string | undefined,
    audioBase64: string | undefined,
    sessionId: string | undefined,
    onChunk: (chunk: CompanionChunk) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    const token = await AsyncStorage.getItem('accessToken');

    const body: Record<string, any> = {};
    if (message) body.message = message;
    if (audioBase64) body.audioBase64 = audioBase64;
    if (sessionId) body.sessionId = sessionId;

    try {
      const response = await fetch(`${api.defaults.baseURL}/ai/companion/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onChunk(data);
            } catch {}
          }
        }
      }
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  },
};
