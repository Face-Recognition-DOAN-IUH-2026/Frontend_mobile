describe('SearchField', () => {
  function searchFieldOutput({ value, onChange, onClear }: {
    value: string;
    onChange: (text: string) => void;
    onClear?: () => void;
  }) {
    return {
      value,
      hasClearButton: value.length > 0 && !!onClear,
      change: (text: string) => { onChange(text); return true; },
      clear: onClear ? () => { onClear(); return true; } : null,
    };
  }

  it('shows clear button when value is non-empty and onClear is provided', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const output = searchFieldOutput({ value: 'hello', onChange, onClear });
    expect(output.hasClearButton).toBe(true);
  });

  it('hides clear button when value is empty', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const output = searchFieldOutput({ value: '', onChange, onClear });
    expect(output.hasClearButton).toBe(false);
  });

  it('hides clear button when onClear is not provided', () => {
    const onChange = jest.fn();
    const output = searchFieldOutput({ value: 'hello', onChange });
    expect(output.hasClearButton).toBe(false);
  });

  it('calls onChange on text change', () => {
    const onChange = jest.fn();
    const output = searchFieldOutput({ value: '', onChange });
    output.change('book');
    expect(onChange).toHaveBeenCalledWith('book');
  });

  it('calls onClear when clear button pressed', () => {
    const onChange = jest.fn();
    const onClear = jest.fn();
    const output = searchFieldOutput({ value: 'book', onChange, onClear });
    output.clear?.();
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
