import type { CompanionChunk } from '../../../types/ai';

/**
 * Accumulated assistant text for one companion stream.
 *
 * - `prefix`   — stable text that must survive the answer: non-final `text` chunks such as
 *                the `[Voice] …` transcript.
 * - `streamed` — the answer itself, built from `text_delta` tokens and REPLACED (never
 *                appended to) by the authoritative `final: true` `text` chunk.
 *
 * This split is what keeps a token-by-token answer from doubling on screen once the server
 * sends the complete text as well.
 */
export interface StreamingText {
  prefix: string;
  streamed: string;
}

export function emptyStreamingText(): StreamingText {
  return { prefix: '', streamed: '' };
}

function contentOf(data: unknown): string {
  const value = (data as { content?: unknown } | undefined)?.content;
  return typeof value === 'string' ? value : '';
}

/** Fold one SSE chunk into the accumulator. Non-text chunks leave it untouched. */
export function applyStreamChunk(state: StreamingText, chunk: CompanionChunk): StreamingText {
  if (chunk.type === 'text_delta') {
    return { ...state, streamed: state.streamed + contentOf(chunk.data) };
  }

  if (chunk.type === 'text') {
    if (chunk.data?.final === true) {
      // Authoritative answer: drop whatever we streamed and show the server's text.
      return { ...state, streamed: contentOf(chunk.data) };
    }
    // Stable prefix (e.g. `[Voice] …`), kept in front of everything that streams after it.
    return { ...state, prefix: state.prefix + contentOf(chunk.data) };
  }

  return state;
}

/** `prefix + streamed` — the text to render. Never yields `undefined` or `NaN`. */
export function toDisplayText(state: StreamingText): string {
  return state.prefix + state.streamed;
}

export interface CompanionChunkCallbacks {
  /** Called only when the rendered text actually changes. */
  onTextChange: (text: string) => void;
  onAudio?: (chunk: CompanionChunk) => void;
  onViseme?: (chunk: CompanionChunk) => void;
  onDone?: (sessionId?: string) => void;
}

/**
 * Build the single `onChunk` handler shared by `sendMessage` and `sendVoiceMessage`, so the
 * accumulation rules exist in exactly one place.
 */
export function createCompanionChunkHandler(
  callbacks: CompanionChunkCallbacks,
): (chunk: CompanionChunk) => void {
  let state = emptyStreamingText();

  return (chunk: CompanionChunk) => {
    const previous = toDisplayText(state);
    state = applyStreamChunk(state, chunk);
    const next = toDisplayText(state);
    if (next !== previous) callbacks.onTextChange(next);

    switch (chunk.type) {
      case 'audio':
        callbacks.onAudio?.(chunk);
        break;
      case 'viseme':
        callbacks.onViseme?.(chunk);
        break;
      case 'companion_done':
        callbacks.onDone?.(chunk.data?.sessionId);
        break;
      default:
        break;
    }
  };
}
