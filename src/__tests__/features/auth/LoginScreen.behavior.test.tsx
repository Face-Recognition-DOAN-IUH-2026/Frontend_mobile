import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../../features/auth/screens/LoginScreen';

const mockPatronLogin = jest.fn();
const mockStaffLogin = jest.fn();

jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    patronLogin: (a: string, b: string) => mockPatronLogin(a, b),
    staffLogin: (a: string, b: string) => mockStaffLogin(a, b),
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: any) => React.createElement(View, null, children),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: View,
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => React.createElement(Text, { testID: `icon-${props.name}` }, props.name);
});

function invalidCredentialsError() {
  return Object.assign(new Error('Request failed with status code 401'), {
    response: { status: 401, data: { error: 'Invalid credentials' } },
  });
}

function networkError() {
  return Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', response: undefined });
}

const navigation = { navigate: jest.fn() };

async function fillAndSubmit(utils: any) {
  const inputs = utils.container.queryAll(
    (i: any) => typeof i.props?.onChangeText === 'function',
  );
  await fireEvent.changeText(inputs[0], 'SV123');
  await fireEvent.changeText(inputs[1], 'wrong-pass');
  await fireEvent.press(utils.getByText('Đăng nhập'));
}

describe('LoginScreen - behavioral error feedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Vietnamese error message when credentials are rejected', async () => {
    mockPatronLogin.mockRejectedValue(invalidCredentialsError());

    const utils = await render(<LoginScreen navigation={navigation} />);
    await fillAndSubmit(utils);

    await waitFor(() => {
      expect(utils.getAllByText('Sai tài khoản hoặc mật khẩu').length).toBeGreaterThan(0);
    });
  });

  it('shows network error message when server is unreachable', async () => {
    mockPatronLogin.mockRejectedValue(networkError());

    const utils = await render(<LoginScreen navigation={navigation} />);
    await fillAndSubmit(utils);

    await waitFor(() => {
      expect(
        utils.getAllByText('Không thể kết nối server. Vui lòng kiểm tra mạng.').length,
      ).toBeGreaterThan(0);
    });
  });

  it('shows validation message when fields are empty', async () => {
    const utils = await render(<LoginScreen navigation={navigation} />);
    await fireEvent.press(utils.getByText('Đăng nhập'));

    await waitFor(() => {
      expect(utils.getAllByText('Vui lòng nhập mã sinh viên và mật khẩu').length).toBeGreaterThan(0);
    });
    expect(mockPatronLogin).not.toHaveBeenCalled();
  });

  it('clears previous error after a successful retry', async () => {
    mockPatronLogin.mockRejectedValueOnce(invalidCredentialsError());

    const utils = await render(<LoginScreen navigation={navigation} />);
    await fillAndSubmit(utils);
    await waitFor(() => {
      expect(utils.getAllByText('Sai tài khoản hoặc mật khẩu').length).toBeGreaterThan(0);
    });

    mockPatronLogin.mockResolvedValueOnce(undefined);
    await fillAndSubmit(utils);

    await waitFor(() => {
      expect(utils.queryByText('Sai tài khoản hoặc mật khẩu')).toBeNull();
    });
  });

  it('keeps inline helper error after snackbar is dismissed', async () => {
    mockPatronLogin.mockRejectedValue(invalidCredentialsError());

    const utils = await render(<LoginScreen navigation={navigation} />);
    await fillAndSubmit(utils);
    await waitFor(() => {
      expect(utils.getAllByText('Sai tài khoản hoặc mật khẩu').length).toBeGreaterThan(0);
    });

    await fireEvent.press(utils.getByText('OK'));

    await waitFor(() => {
      expect(utils.queryByText('OK')).toBeNull();
    });
    expect(utils.getAllByText('Sai tài khoản hoặc mật khẩu').length).toBeGreaterThan(0);
  });
});
