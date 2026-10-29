// jest.setup.js mocks `zustand` with a no-op `create`, which makes real store behaviour
// untestable. This file opts back into the real zustand for the widget store under test.
jest.mock('zustand', () => jest.requireActual('zustand'));

jest.mock('../../api/ai', () => ({
  aiApi: {
    streamCompanionChat: jest.fn(),
    getCommandCenterSummary: jest.fn(),
    getCompanionContext: jest.fn(),
  },
}));

// The store drops chunks whose session generation no longer matches (logout guard).
jest.mock('../../api/secureStorage', () => ({
  getSessionGeneration: () => 'gen-test',
}));

import type { CompanionChunk } from '../../types/ai';
import { aiApi } from '../../api/ai';
import { useAIWidgetStore } from '../../features/ai/components/AIWidget/useAIWidgetStore';

const streamMock = aiApi.streamCompanionChat as jest.Mock;

function delta(content: string): CompanionChunk {
  return { type: 'text_delta', data: { content } };
}

function text(content: string, final = false): CompanionChunk {
  return { type: 'text', data: { content, final } };
}

/** Drives the stream chunk by chunk, snapshotting rendered text after each chunk. */
async function runStream(
  chunks: CompanionChunk[],
  sessionId = 'sess-1',
): Promise<string[]> {
  const snapshots: string[] = [];

  streamMock.mockImplementation(
    (_message: any, _audio: any, _sessionId: any, onChunk: (c: CompanionChunk) => void) => {
      for (const chunk of chunks) {
        onChunk(
          chunk.type === 'companion_done'
            ? { ...chunk, data: { ...chunk.data, sessionId } }
            : chunk,
        );
        snapshots.push(
          useAIWidgetStore
            .getState()
            .messages.filter((m) => m.role === 'assistant')
            .map((m) => m.content)
            .join('|'),
        );
      }
      return Promise.resolve();
    },
  );

  await useAIWidgetStore.getState().sendMessage('Thu vien mo cua gio nao?');
  return snapshots;
}

function assistantContents(): string[] {
  return useAIWidgetStore.getState().messages.filter((m) => m.role === 'assistant').map((m) => m.content);
}

describe('useAIWidgetStore companion streaming (mobile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAIWidgetStore.setState({
      messages: [],
      chatSessionId: undefined,
      isLoadingChat: false,
      companionState: 'idle',
      currentAudio: null,
      visemeData: [],
    });
  });

  it('appends the user message and enters loading/thinking while the stream is open', async () => {
    let closeStream!: () => void;
    streamMock.mockImplementation(
      () => new Promise<void>((resolve) => { closeStream = resolve; }),
    );

    const pending = useAIWidgetStore.getState().sendMessage('hello');

    const mid = useAIWidgetStore.getState();
    expect(mid.messages[0].role).toBe('user');
    expect(mid.messages[0].content).toBe('hello');
    expect(mid.isLoadingChat).toBe(true);
    expect(mid.companionState).toBe('thinking');

    closeStream();
    await pending;
  });

  it('renders text_delta chunks DURING the stream (token-by-token, before any final text)', async () => {
    const snapshots = await runStream([delta('Thu '), delta('vien '), text('Thu vien', true)]);

    expect(snapshots[0]).toContain('Thu ');
    expect(snapshots[1]).toContain('vien ');
    expect(snapshots[2]).toContain('Thu vien');
  });

  it('does NOT double the answer when a final text repeats the streamed deltas', async () => {
    const snapshots = await runStream([delta('Thu '), delta('vien mo cua.'), text('Thu vien mo cua.', true)]);

    expect(snapshots[1]).toContain('Thu vien mo cua.');
    expect(assistantContents()).toEqual(['Thu vien mo cua.']);
  });

  it('keeps a non-final text prefix (voice transcript) in front of the streamed answer', async () => {
    const snapshots = await runStream([
      text('[Voice] sach react'),
      delta('Toi tim thay.'),
      text('Toi tim thay.', true),
    ]);

    expect(snapshots[1]).toContain('[Voice] sach reactToi tim thay.');
    expect(assistantContents()).toEqual(['[Voice] sach reactToi tim thay.']);
  });

  it('finalizes the message id and stores the session id from companion_done', async () => {
    await runStream([delta('Xin chao'), text('Xin chao', true), { type: 'companion_done', data: {} }], 'sess-42');

    const state = useAIWidgetStore.getState();
    expect(state.chatSessionId).toBe('sess-42');
    expect(state.isLoadingChat).toBe(false);
    expect(state.companionState).toBe('idle');
    expect(state.messages.some((m) => m.id === 'streaming')).toBe(false);
  });

  it('never renders raw tool-call JSON as visible chat text', async () => {
    await runStream([
      delta('Tim thay sach.'),
      text('Tim thay sach.', true),
      { type: 'tool_result', data: { name: 'search_books', result: { success: true } } },
      { type: 'companion_done', data: {} },
    ]);

    const visible = assistantContents().join('');
    expect(visible).not.toContain('"tool"');
    expect(visible).not.toContain('search_books');
  });
});
