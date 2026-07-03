interface EmptyStateProps {
  icon: string;
  message?: string;
  title?: string;
  description?: string;
  action?: unknown;
}

function renderEmptyState(props: EmptyStateProps) {
  const hasTitle = !!props.title;
  const hasDescription = !!props.description;
  const hasAction = !!props.action;
  const hasMessage = !!props.message;

  return {
    icon: props.icon,
    message: props.message ?? null,
    title: props.title ?? null,
    description: props.description ?? null,
    hasAction,
    hasTitle,
    hasDescription,
    hasMessage,
  };
}

describe('EmptyState (enhanced)', () => {
  it('renders icon and message (backward compat)', () => {
    const result = renderEmptyState({ icon: 'book-open', message: 'No books found' });
    expect(result.icon).toBe('book-open');
    expect(result.message).toBe('No books found');
    expect(result.hasTitle).toBe(false);
    expect(result.hasDescription).toBe(false);
    expect(result.hasAction).toBe(false);
  });

  it('renders icon, title, and description', () => {
    const result = renderEmptyState({
      icon: 'book-open',
      title: 'No Books',
      description: 'Try adjusting your search',
    });
    expect(result.icon).toBe('book-open');
    expect(result.title).toBe('No Books');
    expect(result.description).toBe('Try adjusting your search');
  });

  it('renders action button when provided', () => {
    const action = { type: 'Text', props: { children: 'Retry' } };
    const result = renderEmptyState({
      icon: 'wifi-off',
      title: 'Offline',
      description: 'Check your connection',
      action,
    });
    expect(result.hasAction).toBe(true);
  });

  it('prefers title over message when both provided', () => {
    const result = renderEmptyState({
      icon: 'book-open',
      message: 'Fallback message',
      title: 'Primary title',
    });
    expect(result.title).toBe('Primary title');
    expect(result.message).toBe('Fallback message');
  });

  it('works with icon only and no text', () => {
    const result = renderEmptyState({ icon: 'magnify' });
    expect(result.icon).toBe('magnify');
    expect(result.hasMessage).toBe(false);
    expect(result.hasTitle).toBe(false);
  });
});
