import api from './client';
import {
  AIChatResponse,
  AIConfirmResponse,
  AIHealthSummary,
  AIBookRecommendationResponse,
  AICommandCenterChatResponse,
} from '../types/ai';

export const aiApi = {
  async chat(message: string, sessionId?: string, patronId?: string): Promise<AIChatResponse> {
    const body: Record<string, any> = { message };
    if (sessionId) body.sessionId = sessionId;
    if (patronId) body.patronId = patronId;
    const { data } = await api.post('/ai/chat', body);
    return data;
  },

  async confirm(sessionId: string, action: 'approve' | 'reject'): Promise<AIConfirmResponse> {
    const { data } = await api.post('/ai/confirm', { sessionId, action });
    return data;
  },

  async getHealthSummary(): Promise<AIHealthSummary> {
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
};
