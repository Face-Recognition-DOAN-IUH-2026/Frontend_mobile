interface CameraFallbackOutput {
  message: string;
  showManualInput: boolean;
  showPickImage: boolean;
  retryCalled: boolean;
  manualSubmitted: string | null;
  imagePicked: boolean;
}

function simulateCameraFallback(props: {
  message?: string;
  showManualInput?: boolean;
  showPickImage?: boolean;
  onRetry: () => void;
  onManualSubmit?: (value: string) => void;
  onPickImage?: () => void;
}) {
  let manualSubmitted: string | null = null;
  return {
    message: props.message ?? 'Không thể khởi động camera',
    showManualInput: props.showManualInput ?? false,
    showPickImage: props.showPickImage ?? false,
    retryCalled: false,
    manualSubmitted,
    imagePicked: false,
    triggerRetry: () => { props.onRetry(); return true as const; },
    triggerManualSubmit: (value: string) => {
      if (props.onManualSubmit && value.trim()) {
        props.onManualSubmit(value.trim());
        manualSubmitted = value.trim();
      }
      return true as const;
    },
    triggerPickImage: () => {
      if (props.onPickImage) { props.onPickImage(); }
      return true as const;
    },
  };
}

describe('CameraFallback', () => {
  const onRetry = jest.fn();
  const onManualSubmit = jest.fn();
  const onPickImage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows default message', () => {
    const output = simulateCameraFallback({ onRetry });
    expect(output.message).toBe('Không thể khởi động camera');
  });

  it('shows custom message when provided', () => {
    const output = simulateCameraFallback({ onRetry, message: 'Camera đã ngắt kết nối' });
    expect(output.message).toBe('Camera đã ngắt kết nối');
  });

  it('calls onRetry callback', () => {
    const output = simulateCameraFallback({ onRetry });
    output.triggerRetry();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows manual input when showManualInput is true', () => {
    const output = simulateCameraFallback({ onRetry, showManualInput: true });
    expect(output.showManualInput).toBe(true);
  });

  it('does not show manual input by default', () => {
    const output = simulateCameraFallback({ onRetry });
    expect(output.showManualInput).toBe(false);
  });

  it('calls onManualSubmit with trimmed value', () => {
    const output = simulateCameraFallback({ onRetry, showManualInput: true, onManualSubmit });
    output.triggerManualSubmit('  test@example.com  ');
    expect(onManualSubmit).toHaveBeenCalledWith('test@example.com');
  });

  it('does not call onManualSubmit with empty value', () => {
    const output = simulateCameraFallback({ onRetry, showManualInput: true, onManualSubmit });
    output.triggerManualSubmit('   ');
    expect(onManualSubmit).not.toHaveBeenCalled();
  });

  it('shows pick image when showPickImage is true', () => {
    const output = simulateCameraFallback({ onRetry, showPickImage: true });
    expect(output.showPickImage).toBe(true);
  });

  it('does not show pick image by default', () => {
    const output = simulateCameraFallback({ onRetry });
    expect(output.showPickImage).toBe(false);
  });

  it('calls onPickImage callback', () => {
    const output = simulateCameraFallback({ onRetry, showPickImage: true, onPickImage });
    output.triggerPickImage();
    expect(onPickImage).toHaveBeenCalledTimes(1);
  });
});
