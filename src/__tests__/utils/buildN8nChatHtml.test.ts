import {
  buildN8nChatHtml,
  N8N_CHAT_VERSION,
} from '../../features/ai/utils/buildN8nChatHtml';

// Phải tạo U+2028/U+2029 bằng fromCharCode: ký tự thật trong source TS sẽ bị
// coi là line break và làm hỏng chính file test này.
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

describe('buildN8nChatHtml', () => {
  const webhookUrl = 'https://chatairag.app.n8n.cloud/webhook/abc-123/chat';

  it('tạo HTML đầy đủ và nhúng bundle ESM của @n8n/chat từ CDN', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(`@n8n/chat@${N8N_CHAT_VERSION}/dist/style.css`);
    expect(html).toContain(`@n8n/chat@${N8N_CHAT_VERSION}/dist/chat.bundle.es.js`);
    expect(html).toContain('import { createChat }');
    expect(html).toContain('id="n8n-chat"');
  });

  it('nhúng webhookUrl vào createChat', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain(webhookUrl);
  });

  it('dùng mode fullscreen cho màn hình chuyên biệt trên mobile', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain('"mode":"fullscreen"');
  });

  it('ghi đè tiếng Việt làm mặc định cho i18n', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain('Trợ lý AI Thư viện IUH');
    expect(html).toContain('Nhập câu hỏi về sách, tài liệu...');
    expect(html).toContain('Bắt đầu trò chuyện');
  });

  it('chèn initialMessages được cung cấp', () => {
    const html = buildN8nChatHtml({
      webhookUrl,
      initialMessages: ['Xin chào!', 'Mình giúp gì được bạn?'],
    });

    expect(html).toContain('Xin chào!');
    expect(html).toContain('Mình giúp gì được bạn?');
  });

  it('dùng subtitle và placeholder tùy chỉnh khi được cung cấp', () => {
    const html = buildN8nChatHtml({
      webhookUrl,
      subtitle: 'Hỏi đáp về sách',
      placeholder: 'Gõ câu hỏi...',
    });

    expect(html).toContain('Hỏi đáp về sách');
    expect(html).toContain('Gõ câu hỏi...');
  });

  it('đóng gói metadata (định danh người dùng) vào payload gửi webhook', () => {
    const html = buildN8nChatHtml({
      webhookUrl,
      metadata: { patronId: 'p-1', role: 'patron' },
    });

    expect(html).toContain('patronId');
    expect(html).toContain('p-1');
  });

  // --- Security: chống script injection qua metadata / initialMessages ---
  it('escape ký tự "<" trong metadata để không thể đóng thẻ script (chống XSS)', () => {
    const malicious = '</script><script>alert(1)</script>';
    const html = buildN8nChatHtml({
      webhookUrl,
      metadata: { fullName: malicious },
    });

    expect(html).not.toContain(malicious);
    expect(html).toContain('\\u003c/script>');
  });

  it('escape ký tự "<" trong initialMessages (chống XSS)', () => {
    const malicious = '</script><img src=x onerror=alert(1)>';
    const html = buildN8nChatHtml({
      webhookUrl,
      initialMessages: [malicious],
    });

    expect(html).not.toContain(malicious);
    expect(html).toContain('\\u003cimg');
  });

  it('escape chuỗi U+2028/U+2029 vốn hợp lệ trong JSON nhưng hỏng trong JS', () => {
    const sep = `line${LINE_SEP}sep${PARA_SEP}end`;
    const html = buildN8nChatHtml({
      webhookUrl,
      metadata: { note: sep },
    });

    expect(html).toContain('\\u2028');
    expect(html).toContain('\\u2029');
    expect(html).not.toContain(sep);
  });

  // --- Resilience: cần bridge để React Native biết webhook có sống không ---
  it('chèn preflight OPTIONS probe để phát hiện webhook chết ngay khi mở màn hình', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain("method: 'OPTIONS'");
    expect(html).toContain('n8n-chat-probe');
  });

  it('chèn fetch bridge báo kết quả về React Native qua postMessage', () => {
    const html = buildN8nChatHtml({ webhookUrl });

    expect(html).toContain('ReactNativeWebView.postMessage');
    expect(html).toContain('webhook-ok');
    expect(html).toContain('webhook-error');
  });

  it('ném lỗi rõ ràng khi thiếu webhookUrl (tránh widget im lặng hỏng)', () => {
    expect(() => buildN8nChatHtml({ webhookUrl: '' })).toThrow(/webhookUrl/);
    expect(() => buildN8nChatHtml({ webhookUrl: '   ' })).toThrow(/webhookUrl/);
  });
});
