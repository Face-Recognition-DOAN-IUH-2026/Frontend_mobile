/**
 * Build HTML cho @n8n/chat chạy bên trong react-native-webview.
 *
 * @n8n/chat là widget web (Vue + DOM) nên không chạy trực tiếp trong React Native.
 * Cách tiếp cận: nhúng bundle ESM từ CDN + gọi createChat() trong WebView.
 *
 * Trao đổi WebView <-> React Native:
 * - Trang web bọc window.fetch để báo kết quả gọi webhook về qua postMessage.
 * - React Native nghe các tin nhắn đó để biết webhook còn sống hay đã chết,
 *   từ đó hiển thị trạng thái lỗi kèm nút "Thử lại" thay vì im lặng hỏng.
 */

/** Version @n8n/chat phải khớp với Frontend_Web/package.json để hành vi webhook giống nhau. */
export const N8N_CHAT_VERSION = '1.41.5';

export interface BuildN8nChatHtmlOptions {
  /** Webhook Public Streaming Chat Trigger của n8n. Bắt buộc. */
  webhookUrl: string;
  /** Danh sách tin nhắn chào hiển thị trước khi người dùng gõ. */
  initialMessages?: string[];
  /** Dòng phụ dưới tiêu đề. */
  subtitle?: string;
  /** Placeholder của ô nhập. */
  placeholder?: string;
  /** Metadata gửi kèm mỗi tin nhắn (ví dụ định danh người dùng). */
  metadata?: Record<string, string>;
}

const VIETNAMESE_I18N = {
  title: 'Trợ lý AI Thư viện IUH',
  subtitle: 'Hỏi đáp thông minh dựa trên tài liệu',
  inputPlaceholder: 'Nhập câu hỏi về sách, tài liệu...',
  getStarted: 'Bắt đầu trò chuyện',
  closeButtonTooltip: 'Đóng cửa sổ chat',
  footer: '',
};

const DEFAULT_INITIAL_MESSAGES = [
  'Xin chào! 👋 Tôi là trợ lý AI của Thư viện IUH.',
  'Tôi có thể giúp bạn tra cứu tài liệu, trả lời câu hỏi về sách và giải đáp thắc mắc liên quan đến thư viện.',
  'Hãy đặt câu hỏi để bắt đầu! 📓',
];

/**
 * Serialize thành chuỗi JS an toàn để chèn thẳng vào <script>.
 *
 * JSON.stringify sinh chuỗi chưa escape U+2028/U+2029 (hợp lệ trong JSON
 * nhưng là line terminator trong JS -> SyntaxError khi parse). Thay "<" bằng
 * \u003c chặn người dùng đóng thẻ </script> sớm để chèn code lạ (XSS).
 */
function toSafeJsLiteral(value: unknown): string {
  // Dung RegExp constructor de tranh ky tu U+2028/U+2029 that trong nguon.
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

export function buildN8nChatHtml(options: BuildN8nChatHtmlOptions): string {
  const { webhookUrl, metadata = {} } = options;

  if (!webhookUrl || !webhookUrl.trim()) {
    throw new Error('buildN8nChatHtml: webhookUrl là bắt buộc');
  }

  const initialMessages =
    options.initialMessages && options.initialMessages.length > 0
      ? options.initialMessages
      : DEFAULT_INITIAL_MESSAGES;

  const subtitle = options.subtitle ?? VIETNAMESE_I18N.subtitle;
  const placeholder = options.placeholder ?? VIETNAMESE_I18N.inputPlaceholder;

  const chatOptions = {
    webhookUrl,
    target: '#n8n-chat',
    mode: 'fullscreen',
    showWelcomeScreen: true,
    defaultLanguage: 'en',
    initialMessages,
    i18n: {
      en: {
        ...VIETNAMESE_I18N,
        subtitle,
        inputPlaceholder: placeholder,
      },
    },
    enableStreaming: true,
    loadPreviousSession: true,
    allowFileUploads: false,
    metadata,
  };

  const styleHref = `https://cdn.jsdelivr.net/npm/@n8n/chat@${N8N_CHAT_VERSION}/dist/style.css`;
  const scriptSrc = `https://cdn.jsdelivr.net/npm/@n8n/chat@${N8N_CHAT_VERSION}/dist/chat.bundle.es.js`;

  // toSafeJsLiteral đã escape "<" nên hằng số này không thể bị đóng thẻ sớm.
  const webhookLiteral = toSafeJsLiteral(webhookUrl);

  // toSafeJsLiteral đã escape "<" và U+2028/U+2029 — chatOptions chứa dữ liệu
  // người dùng (initialMessages, metadata) nên bắt buộc đi qua đây, không dùng
  // JSON.stringify thường.
  const chatOptionsLiteral = toSafeJsLiteral(chatOptions);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<link rel="stylesheet" href="${styleHref}" />
<style>
  html, body, #n8n-chat { height: 100%; margin: 0; background: transparent; }
  /* Widget fullscreen: chiếm trọn WebView, bỏ padding/margin mặc định. */
  n8n-chat-root { display: block; height: 100%; }
  /* Đưa input xuống đáy trên Android khi bàn phím ảo hiện. */
  .chat-layout { min-height: 100%; }
</style>
</head>
<body>
<div id="n8n-chat"></div>

<script type="module">
  import { createChat } from ${toSafeJsLiteral(scriptSrc)};

  const WEBHOOK_URL = ${webhookLiteral};

  // ---- Bridge: báo trạng thái webhook về React Native --------------------
  function report(status, detail) {
    try {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'n8n-chat-status', status: status, detail: detail || null }));
      }
    } catch (e) { /* bridge không có sẵn lúc trang vừa tải — bỏ qua */ }
  }

  // Preflight: kiểm tra webhook sống ngay khi mở màn hình (không cần gửi tin nhắn).
  // n8n webhook chấp nhận OPTIONS nên probe này không tạo run workflow nào.
  (function probe() {
    fetch(WEBHOOK_URL, { method: 'OPTIONS' })
      .then(function (res) {
        report(res && res.ok ? 'webhook-probe-ok' : 'webhook-probe-warn', 'n8n-chat-probe:' + (res && res.status));
      })
      .catch(function (err) {
        report('webhook-probe-failed', 'n8n-chat-probe:' + (err && err.message));
      });
  })();

  // Bọc fetch: theo dõi mọi request thật sự đi tới webhook (gửi tin nhắn).
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const isWebhookCall = url.indexOf(WEBHOOK_URL) !== -1;
    return originalFetch(input, init).then(
      function (res) {
        if (isWebhookCall) report(res && res.ok ? 'webhook-ok' : 'webhook-error', 'fetch:' + (res && res.status));
        return res;
      },
      function (err) {
        if (isWebhookCall) report('webhook-error', 'fetch:' + (err && err.message));
        throw err;
      }
    );
  };
  // -----------------------------------------------------------------------

  // Script type="module" chạy sau khi DOM đã dựng xong nên gọi thẳng được.
  try {
    createChat(${chatOptionsLiteral});
    report('chat-ready');
  } catch (err) {
    report('chat-init-error', err && err.message);
  }
</script>
</body>
</html>`;
}
