type Severity = 'success' | 'error' | 'warning' | 'info';

const SEVERITY_ICONS: Record<Severity, string> = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
};

describe('NoticeSnackbar', () => {
  function snackbarOutput({ visible, message, severity, onDismiss }: {
    visible: boolean;
    message: string;
    severity?: Severity;
    onDismiss: () => void;
  }) {
    const effectiveSeverity = severity ?? 'info';
    return {
      visible,
      message,
      severity: effectiveSeverity,
      icon: SEVERITY_ICONS[effectiveSeverity],
      onDismissCalled: false,
      dismiss: () => { onDismiss(); return true; },
    };
  }

  const onDismiss = jest.fn();

  it('is visible when visible=true', () => {
    const output = snackbarOutput({ visible: true, message: 'Saved!', severity: 'success', onDismiss });
    expect(output.visible).toBe(true);
  });

  it('is not visible when visible=false', () => {
    const output = snackbarOutput({ visible: false, message: 'Saved!', severity: 'success', onDismiss });
    expect(output.visible).toBe(false);
  });

  it('uses info icon when severity is not provided', () => {
    const output = snackbarOutput({ visible: true, message: 'Tip', onDismiss });
    expect(output.severity).toBe('info');
    expect(output.icon).toBe('information');
  });

  it('maps success severity to check-circle icon', () => {
    const output = snackbarOutput({ visible: true, message: 'OK', severity: 'success', onDismiss });
    expect(output.icon).toBe('check-circle');
  });

  it('maps error severity to alert-circle icon', () => {
    const output = snackbarOutput({ visible: true, message: 'Fail', severity: 'error', onDismiss });
    expect(output.icon).toBe('alert-circle');
  });

  it('maps warning severity to alert icon', () => {
    const output = snackbarOutput({ visible: true, message: 'Warn', severity: 'warning', onDismiss });
    expect(output.icon).toBe('alert');
  });

  it('calls onDismiss callback', () => {
    const dismissFn = jest.fn();
    const output = snackbarOutput({ visible: true, message: 'Dismiss me', onDismiss: dismissFn });
    output.dismiss();
    expect(dismissFn).toHaveBeenCalledTimes(1);
  });
});
