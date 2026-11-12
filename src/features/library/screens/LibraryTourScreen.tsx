import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Text, Button, useTheme } from 'react-native-paper';
import { AppTheme } from '../../../theme/DarkTheme';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LoadingOverlay } from '../../../components/LoadingOverlay';
import { API_BASE_NO_PATH } from '../../../config/api';

const CLOUD_TOUR_URL = 'https://frontend-web-fawn-kappa.vercel.app/library/vr-tour';
const LOCAL_TOUR_URL = process.env.EXPO_PUBLIC_WEB_URL
  ? `${process.env.EXPO_PUBLIC_WEB_URL.replace(/\/+$/, '')}/library/vr-tour`
  : 'http://localhost:3000/library/vr-tour';

export default function LibraryTourScreen() {
  const theme = useTheme() as AppTheme;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Default WebVR URL based on environment or hosted web domain
  const initialTourUrl = useMemo(() => {
    if (process.env.EXPO_PUBLIC_WEB_URL) {
      return `${process.env.EXPO_PUBLIC_WEB_URL.replace(/\/+$/, '')}/library/vr-tour`;
    }
    return CLOUD_TOUR_URL;
  }, []);

  const [tourUrl, setTourUrl] = useState<string>(initialTourUrl);
  const isCloud = tourUrl.includes('vercel.app') || tourUrl.startsWith('https://');

  const handleReload = () => {
    setError(null);
    setLoading(true);
    setKey(prev => prev + 1);
  };

  const handleSwitchSource = (toCloud: boolean) => {
    setError(null);
    setLoading(true);
    setTourUrl(toCloud ? CLOUD_TOUR_URL : LOCAL_TOUR_URL);
    setKey(prev => prev + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Floating source toggle button */}
      <View style={styles.floatingSourceBar}>
        <Button
          compact
          mode="contained-tonal"
          icon={isCloud ? 'cloud-check' : 'laptop'}
          onPress={() => handleSwitchSource(!isCloud)}
          style={[
            styles.sourceButton,
            { backgroundColor: isCloud ? 'rgba(37,99,235,0.85)' : 'rgba(30,41,59,0.85)' },
          ]}
          textColor="#FFFFFF"
          labelStyle={{ fontSize: 11, fontWeight: '700' }}
        >
          {isCloud ? 'Tour: Cloud Vercel' : 'Tour: Local IP'}
        </Button>
      </View>

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

          {!isCloud && (
            <Button
              mode="outlined"
              onPress={() => handleSwitchSource(true)}
              style={[styles.retryButton, { marginTop: 12 }]}
              textColor={theme.colors.primary}
            >
              Chuyển sang Tour trực tuyến (Cloud Vercel)
            </Button>
          )}

          {isCloud && (
            <Button
              mode="outlined"
              onPress={() => handleSwitchSource(false)}
              style={[styles.retryButton, { marginTop: 12 }]}
              textColor={theme.colors.primary}
            >
              Chuyển về Tour nội bộ (Local IP)
            </Button>
          )}
        </View>
      ) : (
        <View style={styles.flex}>
          <WebView
            key={key}
            source={{ uri: tourUrl }}
            style={styles.flex}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
            allowMixedContent={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scrollEnabled={false}
            deviceMotionPermission={true}
            sharedCookiesEnabled={true}
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
    floatingSourceBar: {
      position: 'absolute',
      top: 10,
      right: 12,
      zIndex: 999,
    },
    sourceButton: {
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
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
