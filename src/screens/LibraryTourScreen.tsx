import React, { useState, useMemo } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button, useTheme } from 'react-native-paper';
import { AppTheme } from '../theme/DarkTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function LibraryTourScreen() {
  const theme = useTheme() as AppTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0); // Used to reload WebView

  // Calculate WebVR URL dynamically based on current API URL to support local development on physical devices
  const tourUrl = useMemo(() => {
    if (process.env.EXPO_PUBLIC_WEB_URL) {
      return `${process.env.EXPO_PUBLIC_WEB_URL}/library/vr-tour`;
    }

    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:80/api';
    try {
      const match = apiUrl.match(/^(https?:\/\/[^\/:]+)/);
      if (match) {
        // e.g. http://10.68.153.35:80/api -> http://10.68.153.35:3000/library/vr-tour
        return `${match[1]}:3000/library/vr-tour`;
      }
    } catch (e) {
      console.error('Error parsing EXPO_PUBLIC_API_URL:', e);
    }
    return 'http://10.0.2.2:3000/library/vr-tour'; // Android emulator fallback
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

          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: theme.colors.background }]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.onBackground }]}>
                Đang mở không gian 3D...
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
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
    color: '#888',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    borderRadius: 20,
    paddingHorizontal: 24,
  },
});
