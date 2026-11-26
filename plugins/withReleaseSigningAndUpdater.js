const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('expo/config-plugins');

const KEYSTORE_FILENAME = 'library_release.jks';

const RELEASE_SIGNING_BLOCK = `
        release {
            def externalKeystore = rootProject.file("../private_keys/${KEYSTORE_FILENAME}")
            def localKeystore = rootProject.file("private_keys/${KEYSTORE_FILENAME}")
            def ksFile = externalKeystore.exists() ? externalKeystore : localKeystore
            def ksPass = System.getenv("TS_KEYSTORE_PASS") ?: ""
            def kPass = System.getenv("TS_KEY_PASS") ?: ksPass
            if (ksFile.exists() && ksPass) {
                storeFile ksFile
                storePassword ksPass
                keyAlias System.getenv("TS_KEY_ALIAS") ?: "library_release"
                keyPassword kPass
            } else {
                // Fallback to debug signing only when local release keystore is not present
                storeFile signingConfigs.debug.storeFile
                storePassword signingConfigs.debug.storePassword
                keyAlias signingConfigs.debug.keyAlias
                keyPassword signingConfigs.debug.keyPassword
            }
        }`;

function addReleaseSigningToBuildGradle(buildGradle) {
  let updated = buildGradle;

  if (!updated.includes('TS_KEYSTORE_PASS')) {
    updated = updated.replace(
      /signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\}/,
      (match) => `${match}\n${RELEASE_SIGNING_BLOCK}`
    );
  }

  // Ensure release buildType uses signingConfigs.release instead of signingConfigs.debug
  updated = updated.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release'
  );

  return updated;
}

const FILE_PATHS_XML = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="updates" path="Download/" />
    <cache-path name="cache_updates" path="updates/" />
</paths>
`;

const withReleaseSigningAndUpdater = (config) => {
  config = withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language === 'groovy') {
      cfg.modResults.contents = addReleaseSigningToBuildGradle(cfg.modResults.contents);
    }
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    AndroidConfig.Permissions.addPermission(manifest, 'android.permission.INTERNET');
    AndroidConfig.Permissions.addPermission(manifest, 'android.permission.ACCESS_NETWORK_STATE');
    AndroidConfig.Permissions.addPermission(manifest, 'android.permission.REQUEST_INSTALL_PACKAGES');

    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    mainApplication.provider = mainApplication.provider || [];

    const hasUpdaterFileProvider = mainApplication.provider.some(
      (p) =>
        p.$ &&
        (p.$['android:authorities'] === '${applicationId}.fileprovider' ||
          p.$['android:name'] === 'androidx.core.content.FileProvider')
    );

    if (!hasUpdaterFileProvider) {
      mainApplication.provider.push({
        $: {
          'android:name': 'androidx.core.content.FileProvider',
          'android:authorities': '${applicationId}.fileprovider',
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.support.FILE_PROVIDER_PATHS',
              'android:resource': '@xml/file_paths',
            },
          },
        ],
      });
    }

    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'file_paths.xml'), FILE_PATHS_XML, 'utf8');
      return cfg;
    },
  ]);

  return config;
};

module.exports = withReleaseSigningAndUpdater;
