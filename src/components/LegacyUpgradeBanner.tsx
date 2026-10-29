import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bus from '../lib/event-bus';
import type { AppTheme } from '../theme/DarkTheme';

const DISMISS_KEY = 'legacy-upgrade-dismissed';
const DISMISS_DAYS = 7;

export default function LegacyUpgradeBanner() {
  const theme = useTheme() as AppTheme;
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;

    AsyncStorage.getItem(DISMISS_KEY).then((val) => {
      if (val) {
        const dismissedAt = parseInt(val, 10);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) {
          dismissed = true;
        }
      }
    });

    const unsubscribe = bus.on('app:legacy-routed', () => {
      if (!dismissed) {
        setVisible(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleDismiss = useCallback(async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {}
  }, []);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.banner,
        {
          top: Math.max(insets.top + 8, 16),
          backgroundColor: theme.colors.inverseSurface,
        },
      ]}
    >
      <Text style={[styles.text, { color: theme.colors.inverseOnSurface }]}>
        Có bản cập nhật mới. Nâng cấp ứng dụng để có trải nghiệm tốt hơn.
      </Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
        <Text style={[styles.closeText, { color: theme.colors.primary }]}>Đóng</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 99999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    marginRight: 12,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
