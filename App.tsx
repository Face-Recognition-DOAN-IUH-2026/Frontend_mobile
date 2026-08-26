import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, UIManager, Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { MobileThemeProvider, useMobileTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import LegacyUpgradeBanner from './src/components/LegacyUpgradeBanner';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setupGlobalErrorHandlers } from './src/utils/error-reporter';
import { queryClient } from './src/lib/queryClient';

let errorHandlersInitialized = false;
function ensureErrorHandlers() {
  if (errorHandlersInitialized) return;
  errorHandlersInitialized = true;
  setupGlobalErrorHandlers();
}
ensureErrorHandlers();

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function AppContent() {
  const { theme, isDark } = useMobileTheme();

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={theme}>
        <NetworkProvider>
          <AuthProvider>
            <NotificationProvider>
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <LegacyUpgradeBanner />
              <AppNavigator />
            </NotificationProvider>
          </AuthProvider>
        </NetworkProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <MobileThemeProvider>
            <AppContent />
          </MobileThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
