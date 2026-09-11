# Mobile deployment

Development devices must share the PC's Wi-Fi. Set `EXPO_PUBLIC_API_URL` to the PC's current LAN address ending in `/api` and `EXPO_PUBLIC_WEB_URL` to the web frontend origin. Restart Metro after changing `.env`.

For an EAS production build, configure `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_WEB_URL` in the EAS production environment with your deployed HTTPS URLs. The local `.env` is ignored by Git; do not rely on it being present on the build server. Public Expo variables are embedded in the bundle and must never contain secrets. No production hostname is provisioned by this repository.

Before distributing a production build, replace the development HTTP permissions in `app.json` with HTTPS-only native configuration, rebuild the native app, and verify login, session restore, face enrollment, notification reconnect and AI streaming on a physical device. Native dependency updates also require rebuilding the development client.

Local checks:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/jest/bin/jest.js --runInBand
node node_modules/expo/bin/cli install --check
```
