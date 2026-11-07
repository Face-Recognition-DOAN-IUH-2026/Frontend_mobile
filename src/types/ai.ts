export type AIInsightCategory = 'access' | 'borrow' | 'schedule' | 'inventory' | 'risk';
export type AIInsightSeverity = 'info' | 'warning' | 'critical';
export type AIInsightStatus = 'open' | 'dismissed' | 'resolved';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolResults?: AIToolResult[];
  requiresConfirmation?: boolean;
  pendingAction?: AIPendingAction;
  timestamp: Date;
}

export interface AIToolResult {
  name: string;
  result: { success: boolean; data?: any; error?: string };
}

export interface AIToolSummary {
  name: string;
  description: string;
}

export interface AIRagDocument {
  source: string;
  docTitle: string;
  audience: 'public' | 'staff_only';
  chunksCount: number;
  uploadedAt?: string;
  fileSize?: string;
  roles?: string;
}

export interface AIPendingAction {
  action: string;
  description: string;
  params: Record<string, any>;
}

export interface AIChatResponse {
  response: string;
  sessionId: string;
  toolResults?: AIToolResult[];
  requiresConfirmation?: boolean;
  pendingAction?: AIPendingAction;
  userRole?: string;
}

export interface AIConfirmResponse {
  success: boolean;
  message?: string;
}

export interface AICommandCenterSummary {
  generated_at: string;
  model: string;
  headline: string;
  operational_score: number;
  insights: AIInsight[];
  snapshot: {
    active_patrons: number;
    today_entries: number;
    today_exits: number;
    active_borrows: number;
    overdue_borrows: number;
    scheduled_staff_today: number;
  };
}

export interface AIInsight {
  id: string;
  category: AIInsightCategory;
  severity: AIInsightSeverity;
  title: string;
  summary: string;
  evidence: Array<{ label: string; value: string | number }>;
  recommended_actions: string[];
  reason: string;
  confidence: number;
  alternatives: string[];
  status: AIInsightStatus;
  generated_at: string;
}

export interface AIInsightExplanation extends AIInsight {
  reasoning_trace: string;
}

export interface AIInsightList {
  items: AIInsight[];
  total: number;
}

export interface AIBookRecommendation {
  book_id: string;
  isbn: string;
  title: string;
  author: string;
  cover_url: string;
  category: string;
  reason: string;
  relevance_score: number;
}

export interface AIBookRecommendationResponse {
  patron_id: string;
  patron_name: string;
  recommendations: AIBookRecommendation[];
  generated_at: string;
  model: string;
}

export interface AICommandCenterChatResponse {
  answer: string;
  model: string;
  generated_at: string;
}

export interface CompanionChunk {
  /**
   * `text_delta`  — a token streamed mid-response (append to the visible text)
   * `text`        — the authoritative full answer when `data.final === true`, otherwise a
   *                 stable transcript prefix (e.g. the `[Voice] …` line)
   */
  type: 'text_delta' | 'text' | 'audio' | 'viseme' | 'tool_result' | 'book_card' | 'companion_done';
  data: any;
}

export interface VisemeData {
  time: number;
  value: number;
}

export type CompanionState = 'idle' | 'listening' | 'speaking' | 'thinking' | 'error';
