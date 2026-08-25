import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SwipeReserveRow from '../../components/SwipeReserveRow';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { ...props }, props.name);
});

const renderRow = async (props: any) =>
  render(
    <PaperProvider>
      <SwipeReserveRow {...props}>
        <></>
      </SwipeReserveRow>
    </PaperProvider>,
  );

describe('SwipeReserveRow variant', () => {
  it('cancel variant invokes onCancel when the action is pressed', async () => {
    const onCancel = jest.fn();
    const { getByTestId } = await renderRow({ variant: 'cancel', onCancel });
    fireEvent.press(getByTestId('swipe-action'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('reserve variant invokes onReserve when the action is pressed', async () => {
    const onReserve = jest.fn();
    const { getByTestId } = await renderRow({ variant: 'reserve', onReserve });
    fireEvent.press(getByTestId('swipe-action'));
    expect(onReserve).toHaveBeenCalledTimes(1);
  });

  it('defaults to reserve variant', async () => {
    const onReserve = jest.fn();
    const { getByTestId } = await renderRow({ onReserve });
    fireEvent.press(getByTestId('swipe-action'));
    expect(onReserve).toHaveBeenCalledTimes(1);
  });
});
