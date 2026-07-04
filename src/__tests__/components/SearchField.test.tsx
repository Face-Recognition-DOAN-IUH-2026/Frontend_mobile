import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SearchField } from '../../components/SearchField';

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    useTheme: () => ({
      colors: {
        outline: '#ccc',
        primary: '#6366f1',
      },
    }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

describe('SearchField', () => {
  it('renders with default placeholder', async () => {
    const { getByPlaceholderText } = await render(
      <SearchField value="" onChange={jest.fn()} />,
    );
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });

  it('renders with custom placeholder', async () => {
    const { getByPlaceholderText } = await render(
      <SearchField value="" onChange={jest.fn()} placeholder="Find books..." />,
    );
    expect(getByPlaceholderText('Find books...')).toBeTruthy();
  });

  it('displays the current value', async () => {
    const { getByDisplayValue } = await render(
      <SearchField value="hello" onChange={jest.fn()} />,
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  it('calls onChangeText when text changes', async () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = await render(
      <SearchField value="" onChange={onChange} />,
    );
    fireEvent.changeText(getByPlaceholderText('Search...'), 'book');
    expect(onChange).toHaveBeenCalledWith('book');
  });

  it('renders without crashing when onClear is provided with value', async () => {
    const onClear = jest.fn();
    const { getByDisplayValue } = await render(
      <SearchField value="hello" onChange={jest.fn()} onClear={onClear} />,
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  it('renders without crashing when onClear is not provided', async () => {
    const { getByDisplayValue } = await render(
      <SearchField value="hello" onChange={jest.fn()} />,
    );
    expect(getByDisplayValue('hello')).toBeTruthy();
  });

  it('renders without crashing when value is empty with onClear', async () => {
    const { getByPlaceholderText } = await render(
      <SearchField value="" onChange={jest.fn()} onClear={jest.fn()} />,
    );
    expect(getByPlaceholderText('Search...')).toBeTruthy();
  });
});
