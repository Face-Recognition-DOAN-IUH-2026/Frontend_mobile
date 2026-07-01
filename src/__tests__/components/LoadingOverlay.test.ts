describe('LoadingOverlay', () => {
  type LoadingOverlayLogic = {
    loading: boolean;
    message?: string;
  };

  function loadingOverlayOutput({ loading, message }: LoadingOverlayLogic) {
    if (!loading) return { mode: 'children' as const, spinnerVisible: false, messageText: null };
    return { mode: 'loading' as const, spinnerVisible: true, messageText: message ?? null };
  }

  it('renders children when not loading', () => {
    const output = loadingOverlayOutput({ loading: false });
    expect(output.mode).toBe('children');
    expect(output.spinnerVisible).toBe(false);
  });

  it('renders spinner when loading', () => {
    const output = loadingOverlayOutput({ loading: true });
    expect(output.mode).toBe('loading');
    expect(output.spinnerVisible).toBe(true);
  });

  it('renders spinner with message when loading and message provided', () => {
    const output = loadingOverlayOutput({ loading: true, message: 'Loading books...' });
    expect(output.mode).toBe('loading');
    expect(output.messageText).toBe('Loading books...');
  });

  it('renders spinner without message when loading and no message', () => {
    const output = loadingOverlayOutput({ loading: true });
    expect(output.mode).toBe('loading');
    expect(output.messageText).toBeNull();
  });

  it('defaults to not loading when loading prop is undefined', () => {
    const output = loadingOverlayOutput({ loading: false });
    expect(output.mode).toBe('children');
  });
});
