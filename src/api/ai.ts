import api from './client';
import { getAccessToken } from './secureStorage';
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
    const endpoint = role === 'admin' ? '/ai/admin/chat'
                   : role === 'staff' ? '/ai/staff/chat'
                   : '/ai/patrons/chat';
    const body: Record<string, any> = { message };
    if (sessionId) body.sessionId = sessionId;
    if (patronId && role !== 'patron') body.patronId = patronId;
    const { data } = await api.post(endpoint, body);
    return data;
  },

  async confirm(_sessionId: string, _action: 'approve' | 'reject', _role?: string): Promise<AIConfirmResponse> {
    // The current backend intentionally exposes read-only AI tools.
    throw new Error('AI hiện chỉ hỗ trợ tra cứu. Vui lòng thực hiện thao tác trực tiếp trên ứng dụng.');
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

  /**
   * Stream AI Companion chat using XMLHttpRequest.onprogress.
   *
   * WHY: React Native's fetch (whatwg-fetch / expo/fetch) is backed by
   * XMLHttpRequest and does NOT expose a ReadableStream body — calling
   * `response.body.getReader()` either returns null or hangs forever on
   * native. XHR itself fires `onprogress` as data arrives, giving the same
   * incremental SSE chunks without any extra dependency. (P1-3 fix)
   */
  streamCompanionChat(
    message: string | undefined,
    audioBase64: string | undefined,
    sessionId: string | undefined,
    onChunk: (chunk: CompanionChunk) => void,
    onError?: (error: Error) => void,
  ): Promise<void> {
    return new Promise(async (resolve) => {
      const token = await getAccessToken();

      const body: Record<string, any> = {};
      if (message) body.message = message;
      if (audioBase64) body.audioBase64 = audioBase64;
      if (sessionId) body.sessionId = sessionId;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${api.defaults.baseURL}/ai/companion/stream`, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Track how many characters we have already parsed so we only process
      // newly arrived data on each progress event.
      let cursor = 0;

      xhr.onprogress = () => {
        const rawText: string = xhr.responseText;
        const newText = rawText.slice(cursor);
        cursor = rawText.length;

        // SSE lines arrive as "data: <json>\n". Split on newlines and process.
        const lines = newText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6)) as CompanionChunk;
            onChunk(parsed);
          } catch {
            // ignore malformed/partial lines
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status < 200 || xhr.status >= 300) {
          onError?.(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
        resolve();
      };

      xhr.onerror = () => {
        onError?.(new Error('Network error during AI stream'));
        resolve();
      };

      xhr.ontimeout = () => {
        onError?.(new Error('AI stream timed out'));
        resolve();
      };

      // 2 minutes — generous enough for TTS generation inside the companion
      xhr.timeout = 120000;

      try {
        xhr.send(JSON.stringify(body));
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
        resolve();
      }
    });
  },
};
