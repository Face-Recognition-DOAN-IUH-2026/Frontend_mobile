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

export interface AIHealthSummary {
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
  category: 'access' | 'borrow' | 'schedule' | 'inventory' | 'risk';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  evidence: Array<{ label: string; value: string | number }>;
  recommended_actions: string[];
  confidence: number;
  status: 'open' | 'dismissed' | 'resolved';
  generated_at: string;
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
