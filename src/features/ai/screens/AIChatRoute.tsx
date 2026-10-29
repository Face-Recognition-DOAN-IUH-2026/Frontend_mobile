import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { isStaffRole } from '../../../navigation/roleGuard';
import AIChatScreen from './AIChatScreen';
import N8nChatScreen from './N8nChatScreen';

/**
 * Route "AIChat" dùng chung cho cả hai role, nhưng mỗi role đi vào một backend:
 *
 * - staff/admin -> AIChatScreen native, gọi backend theo role (/ai/staff|admin/chat),
 *   giữ nguyên tool-result cards, confirm dialog, AI Command Center.
 * - patron/guest -> N8nChatScreen (@n8n/chat trong WebView) qua webhook n8n public,
 *   giống hệt chatbot trên Frontend_Web.
 *
 * Lý do tách: webhook n8n không có auth, còn backend staff/admin cần JWT theo role.
 * Gộp chung một màn hình sẽ phá either-both.
 */
export default function AIChatRoute(props: any) {
  const { user } = useAuth();

  if (isStaffRole(user?.role)) {
    return <AIChatScreen {...props} />;
  }

  return <N8nChatScreen user={user} />;
}
