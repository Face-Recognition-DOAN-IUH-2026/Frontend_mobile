import React from 'react';
import { render, act } from '@testing-library/react-native';
import MobileVietQrPaymentModal from '../../components/MobileVietQrPaymentModal';
import { paymentApi } from '../../api/payment';
import { PaymentOrderResponse } from '../../types/payment';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
  };
});

jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return {
    ...actual,
    Portal: ({ children }: any) => children,
    useTheme: () => ({
      colors: {
        primary: '#8B0000',
        surface: '#ffffff',
        onSurface: '#000000',
        onSurfaceVariant: '#666666',
      },
    }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

jest.mock('../../api/payment', () => ({
  paymentApi: {
    getOrderStatus: jest.fn(),
  },
}));

jest.mock('../../utils/haptics', () => ({
  triggerHaptic: {
    selection: jest.fn(),
    success: jest.fn(),
  },
}));

describe('MobileVietQrPaymentModal', () => {
  const mockOrder: PaymentOrderResponse = {
    id: 'ord-mob-1',
    orderCode: 'ORD-MOB-20261005',
    patronId: 'pat-1',
    amount: 45000,
    status: 'pending',
    paymentMethod: 'vietqr',
    qrData: 'qr-sample',
    qrUrl: 'https://img.vietqr.io/image/970422-10203040506-compact2.png',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    recordIds: ['rec-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders order code, amount, and student information', async () => {
    const { getByText } = await render(
      <MobileVietQrPaymentModal
        visible={true}
        order={mockOrder}
        patronName="Trần Văn C"
        studentCode="20054321"
        onDismiss={jest.fn()}
        onSuccess={jest.fn()}
      />
    );

    expect(getByText(/Thanh toán VietQR Napas/)).toBeTruthy();
    expect(getByText('45.000 đ')).toBeTruthy();
    expect(getByText(/Trần Văn C/)).toBeTruthy();
    expect(getByText(/20054321/)).toBeTruthy();
    expect(getByText(/ORD-MOB-20261005/)).toBeTruthy();
  });

  it('polls status and triggers onSuccess when status becomes completed', async () => {
    (paymentApi.getOrderStatus as jest.Mock).mockResolvedValue({
      orderCode: mockOrder.orderCode,
      status: 'completed',
      amount: 45000,
      paidAt: new Date().toISOString(),
    });

    const onSuccess = jest.fn();

    await render(
      <MobileVietQrPaymentModal
        visible={true}
        order={mockOrder}
        onDismiss={jest.fn()}
        onSuccess={onSuccess}
      />
    );

    // Fast forward polling interval
    await act(async () => {
      jest.advanceTimersByTime(2600);
    });

    expect(paymentApi.getOrderStatus).toHaveBeenCalledWith(mockOrder.orderCode);

    // Fast forward success timeout
    await act(async () => {
      jest.advanceTimersByTime(1600);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockOrder.orderCode);
  });
});
