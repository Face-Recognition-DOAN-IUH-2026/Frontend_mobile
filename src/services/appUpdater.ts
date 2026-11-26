import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

export const GITHUB_RELEASES_REPO = 'Face-Recognition-DOAN-IUH-2026/Frontend_mobile';
export const ANDROID_MANIFEST_URL = `https://github.com/${GITHUB_RELEASES_REPO}/releases/download/latest-android/latest_android.json`;
export const ANDROID_RELEASES_PAGE_URL = `https://github.com/${GITHUB_RELEASES_REPO}/releases/tag/latest-android`;

export interface UpdateManifest {
  platform: string;
  version: string;
  version_code: number;
  download_url: string;
  sha256?: string;
  changelog?: string;
  force_update?: boolean;
}

export interface DownloadProgressInfo {
  fraction: number;
  downloadedMb: number;
  totalMb: number;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  currentVersionCode: number;
  manifest: UpdateManifest | null;
}

/**
 * Parses a version string such as "1.0.0" or "1.0.0.2" (with optional "v" prefix)
 * into a normalized 4-segment numeric tuple.
 */
export function parseVersionSegments(version: string): number[] {
  const cleaned = version.trim().replace(/^[vV]/, '').split('-')[0];
  if (!cleaned) return [0, 0, 0, 0];
  const parts = cleaned.split('.').map((part) => {
    const num = parseInt(part.replace(/\D/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  });
  while (parts.length < 4) {
    parts.push(0);
  }
  return parts.slice(0, 4);
}

/**
 * Compares two flexible SemVer strings (3 or 4 numeric segments).
 * Returns > 0 if remote > current, 0 if equal, < 0 if remote < current.
 */
export function compareVersions(remoteVersion: string, currentVersion: string): number {
  const remote = parseVersionSegments(remoteVersion);
  const current = parseVersionSegments(currentVersion);
  for (let i = 0; i < 4; i += 1) {
    if (remote[i] !== current[i]) {
      return remote[i] - current[i];
    }
  }
  return 0;
}

export function getCurrentAppVersion(): string {
  return (
    Application.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    '1.0.0'
  );
}

export function getCurrentVersionCode(): number {
  const nativeCode = Application.nativeBuildVersion
    ? parseInt(Application.nativeBuildVersion, 10)
    : NaN;
  if (Number.isFinite(nativeCode)) return nativeCode;
  return Constants.expoConfig?.android?.versionCode ?? 1;
}

export function getAndroidPackageId(): string {
  return (
    Application.applicationId ||
    Constants.expoConfig?.android?.package ||
    'com.library.app'
  );
}

/**
 * Checks GitHub Releases (latest-android/latest_android.json) for a newer Android APK.
 */
export async function checkForAndroidUpdate(): Promise<CheckUpdateResult> {
  const currentVersion = getCurrentAppVersion();
  const currentVersionCode = getCurrentVersionCode();

  if (Platform.OS !== 'android') {
    return { hasUpdate: false, currentVersion, currentVersionCode, manifest: null };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${ANDROID_MANIFEST_URL}?t=${Date.now()}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when fetching update manifest`);
    }

    const data = (await response.json()) as Partial<UpdateManifest>;
    if (!data || typeof data.version !== 'string' || typeof data.download_url !== 'string') {
      throw new Error('Invalid update manifest schema');
    }

    const manifest: UpdateManifest = {
      platform: data.platform || 'android',
      version: data.version,
      version_code: typeof data.version_code === 'number' ? data.version_code : 0,
      download_url: data.download_url,
      sha256: data.sha256,
      changelog: data.changelog || 'Cải thiện hiệu năng và sửa lỗi.',
      force_update: Boolean(data.force_update),
    };

    const versionDiff = compareVersions(manifest.version, currentVersion);
    const hasNewerCode = manifest.version_code > currentVersionCode;
    const hasUpdate = versionDiff > 0 || (versionDiff === 0 && hasNewerCode);

    return {
      hasUpdate,
      currentVersion,
      currentVersionCode,
      manifest,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Opens Android Settings -> "Install unknown apps" directly for this app's packageName.
 */
export async function openUnknownAppSourcesSettings(): Promise<void> {
  const packageId = getAndroidPackageId();
  try {
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_UNKNOWN_APP_SOURCES', {
      data: `package:${packageId}`,
    });
  } catch {
    await Linking.openSettings();
  }
}

/**
 * Downloads the APK to cache/updates/ and launches the Android system package installer.
 */
export async function downloadAndInstallApk(
  manifest: UpdateManifest,
  onProgress?: (progress: DownloadProgressInfo) => void
): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new Error('APK installation is only supported on Android');
  }

  const cacheRoot = FileSystem.cacheDirectory;
  if (!cacheRoot) {
    throw new Error('Cache directory unavailable');
  }

  const updatesDir = `${cacheRoot}updates/`;
  await FileSystem.makeDirectoryAsync(updatesDir, { intermediates: true });

  const safeVersion = manifest.version.replace(/[^0-9A-Za-z._-]/g, '_');
  const localApkUri = `${updatesDir}ThuVien-v${safeVersion}.apk`;

  const existing = await FileSystem.getInfoAsync(localApkUri);
  if (existing.exists) {
    await FileSystem.deleteAsync(localApkUri, { idempotent: true });
  }

  const downloadResumable = FileSystem.createDownloadResumable(
    manifest.download_url,
    localApkUri,
    {},
    (progressEvent) => {
      if (!onProgress) return;
      const written = progressEvent.totalBytesWritten;
      const total = progressEvent.totalBytesExpectedToWrite;
      const downloadedMb = written / (1024 * 1024);
      const totalMb = total > 0 ? total / (1024 * 1024) : 0;
      const fraction = total > 0 ? Math.min(Math.max(written / total, 0), 1) : 0;
      onProgress({ fraction, downloadedMb, totalMb });
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || result.status < 200 || result.status >= 300) {
    throw new Error(`Tải APK thất bại (HTTP ${result?.status ?? 'unknown'})`);
  }

  const fileInfo = await FileSystem.getInfoAsync(result.uri);
  if (!fileInfo.exists || (fileInfo.size ?? 0) < 1024 * 100) {
    throw new Error('File APK tải về không hợp lệ hoặc bị lỗi.');
  }

  const contentUri = await FileSystem.getContentUriAsync(result.uri);

  try {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
      type: 'application/vnd.android.package-archive',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('security') ||
      message.toLowerCase().includes('unknown')
    ) {
      await openUnknownAppSourcesSettings();
    }
    throw err;
  }
}

export async function openDownloadInBrowser(url?: string): Promise<void> {
  const target = url || ANDROID_RELEASES_PAGE_URL;
  await Linking.openURL(target);
}
