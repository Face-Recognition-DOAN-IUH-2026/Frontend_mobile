import api from './client';
import {
  AIChatResponse,
  AIConfirmResponse,
  AICommandCenterSummary,
  AIBookRecommendationResponse,
  AICommandCenterChatResponse,
  AIInsight,
  AIInsightExplanation,
  AIInsightList,
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
};
