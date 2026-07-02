import React, { useState, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button, useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { API_BASE_NO_PATH } from '../../../config/api';

export default function LibraryTourScreen() {
  const theme = useTheme() as AppTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Calculate WebVR URL dynamically based on current API URL to support local development on physical devices
  const tourUrl = useMemo(() => {
    if (process.env.EXPO_PUBLIC_WEB_URL) {
      return `${process.env.EXPO_PUBLIC_WEB_URL}/library/vr-tour`;
    }

    const apiUrl = API_BASE_NO_PATH;
    try {
      const url = new URL(apiUrl);
      url.port = '3000';
      url.pathname = '/library/vr-tour';
      return url.toString();
    } catch (e) {
      console.error('Error building VR tour URL:', e);
    }
    if (__DEV__) return 'http://10.0.2.2:3000/library/vr-tour';
    return '';
  }, []);

  const handleReload = () => {
    setError(null);
    setLoading(true);
    setKey(prev => prev + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Không thể kết nối Tour 3D</Text>
          <Text style={styles.errorDesc}>
            Vui lòng kiểm tra kết nối mạng và đảm bảo máy chủ Web đang hoạt động tại địa chỉ:{"\n"}
            <Text style={{ fontWeight: 'bold' }}>{tourUrl}</Text>
          </Text>
          <Button
            mode="contained"
            onPress={handleReload}
            style={styles.retryButton}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
          >
            Thử lại
          </Button>
        </View>
      ) : (
        <View style={styles.flex}>
          <WebView
            key={key}
            source={{ uri: tourUrl }}
            style={styles.flex}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            scrollEnabled={false}
            deviceMotionPermission={true} // For iOS Gyroscope support inside WebView
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView load error: ', nativeEvent);
              setError(nativeEvent.description || 'Connection failed');
              setLoading(false);
            }}
          />

          {loading ? (
            <LoadingOverlay loading message="Đang mở không gian 3D..." />
          ) : null}
        </View>
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDesc: {
    textAlign: 'center',
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 20,
    paddingHorizontal: 24,
  },
});
}
