import React, { useEffect, useState, useCallback } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  Portal,
  ProgressBar,
  Text,
  useTheme,
} from 'react-native-paper';
import type { AppTheme } from '../theme/DarkTheme';
import {
  checkForAndroidUpdate,
  downloadAndInstallApk,
  openDownloadInBrowser,
  openUnknownAppSourcesSettings,
  type DownloadProgressInfo,
  type UpdateManifest,
} from '../services/appUpdater';

interface UpdateDialogProps {
  /** When true, checks silently in background on mount without blocking UI */
  silent?: boolean;
}

export default function UpdateDialog({ silent = true }: UpdateDialogProps) {
  const theme = useTheme() as AppTheme;

  const [visible, setVisible] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('1.0.0');
  const [manifest, setManifest] = useState<UpdateManifest | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgressInfo>({
    fraction: 0,
    downloadedMb: 0,
    totalMb: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsUnknownSourcePermission, setNeedsUnknownSourcePermission] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await checkForAndroidUpdate();
        if (!cancelled && res.hasUpdate && res.manifest) {
          setCurrentVersion(res.currentVersion);
          setManifest(res.manifest);
          setVisible(true);
        }
      } catch (err) {
        if (!silent) {
          setErrorMsg(err instanceof Error ? err.message : 'Không thể kiểm tra cập nhật.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [silent]);

  const handleInstall = useCallback(async () => {
    if (!manifest || downloading) return;
    setErrorMsg(null);
    setNeedsUnknownSourcePermission(false);
    setDownloading(true);
    setProgress({ fraction: 0, downloadedMb: 0, totalMb: 0 });

    try {
      await downloadAndInstallApk(manifest, (p) => {
        setProgress(p);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải hoặc cài đặt APK.';
      setErrorMsg(msg);
      if (
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('security') ||
        msg.toLowerCase().includes('unknown')
      ) {
        setNeedsUnknownSourcePermission(true);
      }
    } finally {
      setDownloading(false);
    }
  }, [manifest, downloading]);

  const handleDismiss = useCallback(() => {
    if (manifest?.force_update || downloading) return;
    setVisible(false);
  }, [manifest?.force_update, downloading]);

  if (!manifest) return null;

  const percent = Math.round(progress.fraction * 100);
  const isForce = Boolean(manifest.force_update);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={handleDismiss}
        dismissable={!isForce && !downloading}
      >
        <Dialog.Title>Có bản cập nhật mới</Dialog.Title>
        <Dialog.Content>
          <Text
            variant="titleMedium"
            style={[styles.versionText, { color: theme.colors.primary }]}
          >
            v{currentVersion} → v{manifest.version}
          </Text>

          <Text variant="bodySmall" style={styles.keepDataNote}>
            Cập nhật trực tiếp sẽ giữ nguyên toàn bộ dữ liệu và phiên đăng nhập hiện tại.
          </Text>

          <View
            style={[
              styles.changelogBox,
              {
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text variant="labelMedium" style={styles.changelogHeader}>
              Nội dung thay đổi:
            </Text>
            <ScrollView style={styles.changelogScroll} nestedScrollEnabled>
              <Text variant="bodySmall">
                {manifest.changelog || 'Cải thiện hiệu năng và sửa lỗi.'}
              </Text>
            </ScrollView>
          </View>

          {downloading && (
            <View style={styles.progressContainer}>
              <ProgressBar progress={progress.fraction} style={styles.progressBar} />
              <Text variant="bodySmall" style={styles.progressLabel}>
                Đang tải: {percent}%
                {progress.totalMb > 0
                  ? ` (${progress.downloadedMb.toFixed(1)} / ${progress.totalMb.toFixed(1)} MB)`
                  : ` (${progress.downloadedMb.toFixed(1)} MB)`}
              </Text>
            </View>
          )}

          {errorMsg && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              {errorMsg}
            </Text>
          )}

          {needsUnknownSourcePermission && (
            <Button
              mode="outlined"
              onPress={openUnknownAppSourcesSettings}
              style={styles.fallbackBtn}
              compact
            >
              Mở Cài đặt cấp quyền cài APK
            </Button>
          )}

          <Button
            mode="text"
            onPress={() => openDownloadInBrowser(manifest.download_url)}
            disabled={downloading}
            style={styles.fallbackBtn}
            compact
          >
            🌐 Tải APK bằng trình duyệt
          </Button>
        </Dialog.Content>

        <Dialog.Actions>
          {!isForce && (
            <Button onPress={handleDismiss} disabled={downloading}>
              Để sau
            </Button>
          )}
          <Button
            mode="contained"
            onPress={handleInstall}
            loading={downloading}
            disabled={downloading}
          >
            {downloading ? 'Đang tải...' : 'Tải & Cài đặt ngay'}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  versionText: {
    fontWeight: '700',
    marginBottom: 4,
  },
  keepDataNote: {
    opacity: 0.8,
    marginBottom: 12,
  },
  changelogBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  changelogHeader: {
    fontWeight: '700',
    marginBottom: 4,
  },
  changelogScroll: {
    maxHeight: 130,
  },
  progressContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressLabel: {
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
  },
  fallbackBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
});
