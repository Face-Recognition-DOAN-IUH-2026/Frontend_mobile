# Mobile deployment

Frontend_mobile được build và phân phối qua **EAS (Expo Application Services)**.
Project: https://expo.dev/accounts/22664321a/projects/LibraryMobileApp

| Giá trị | Nơi khai báo |
|---|---|
| Expo project ID | `app.json` → `expo.extra.eas.projectId` = `7fbf891b-c0a3-414d-ad06-f813882df4a3` |
| Owner | `app.json` → `expo.owner` = `22664321a` |
| Android package | `app.json` → `expo.android.package` = `com.library.app` |
| Runtime version | `app.json` → `expo.runtimeVersion.policy` = `appVersion` (OTA bám theo version 1.0.0) |
| Update URL | `app.json` → `expo.updates.url` |
| Build profiles | `eas.json` → `development`, `preview`, `production` |

---

## 1. Biến môi trường

`EXPO_PUBLIC_*` được nhúng thẳng vào bundle khi build — **tuyệt đối không chứa secret**.

`.env` ở máy local chỉ dùng cho `expo start`, không được Git track.
Bản build trên EAS lấy biến từ `eas.json` → `build.<profile>.env`:

```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://iuhlib-api.duckdns.org/api",
  "EXPO_PUBLIC_WEB_URL": "https://frontend-web-fawn-kappa.vercel.app"
}
```

### Biến môi trường trên EAS (bắt buộc cho CI/CD)

`eas build` đọc biến từ `eas.json` → `build.<profile>.env`.
Nhưng **`eas update` (OTA) KHÔNG đọc `eas.json`** — nó đọc *EAS environment variables*.
Trên GitHub Actions không có file `.env` (bị gitignore) nên nếu thiếu biến trên EAS,
bundle OTA sẽ có `EXPO_PUBLIC_API_URL` = `undefined`.

Đã tạo sẵn cho cả `preview` và `production`:

```powershell
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value "https://iuhlib-api.duckdns.org/api" `
  --environment preview --environment production --visibility plaintext --non-interactive

npx eas-cli env:create --name EXPO_PUBLIC_WEB_URL --value "https://frontend-web-fawn-kappa.vercel.app" `
  --environment preview --environment production --visibility plaintext --non-interactive
```

Kiểm tra:

```powershell
npx eas-cli env:list --environment preview
npx eas-cli env:list --environment production
```

> `eas update` ở chế độ `--non-interactive` **bắt buộc** có `--environment`,
> và giá trị phải khớp tên channel (`preview` / `production`).
> Workflow đã truyền sẵn.

Biến đang được code sử dụng:

| Biến | File |
|---|---|
| `EXPO_PUBLIC_API_URL` | `src/config/api.ts` |
| `EXPO_PUBLIC_WEB_URL` | `src/features/library/screens/LibraryTourScreen.tsx` |

> `EXPO_PUBLIC_CHAT_WEBHOOK_URL` có trong `.env` nhưng **không** được dùng trong `src/` hiện tại.

---

## 2. Kiểm tra trước khi build (bắt buộc)

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/jest/bin/jest.js --runInBand
node node_modules/expo/bin/cli install --check
```

Cả 3 phải pass. CI (`.github/workflows/mobile-ci.yml`) chạy đúng 3 bước này trước mọi lần build/deploy.

---

## 3. Build APK thủ công (local)

```powershell
# Đăng nhập một lần
npx eas-cli login

# APK cài trực tiếp lên máy Android (internal distribution)
npx eas-cli build -p android --profile preview

# Chạy nền, không chờ
npx eas-cli build -p android --profile preview --no-wait

# Xem tiến độ / danh sách build
npx eas-cli build:list
npx eas-cli build:view
```

Kết quả: link tải `.apk` xuất hiện trong terminal và tại
`https://expo.dev/accounts/22664321a/projects/LibraryMobileApp/builds`.

> Build chạy trên server Expo, **không** cần Android Studio hay JDK ở máy local.
> Thư mục `android/` và `ios/` bị gitignore — EAS tự generate khi build (managed workflow).

---

## 4. OTA Update (EAS Update)

`expo-updates` đã được cài. Mỗi lần sửa JS/TS (không đổi native/dependency), không cần build lại APK:

```powershell
npx eas-cli update --channel preview --message "fix: ..."
```

App đã cài sẽ tải bản mới ở lần mở kế tiếp.

**Giới hạn quan trọng:** OTA chỉ áp dụng khi `runtimeVersion` khớp.
- Đổi `version` trong `app.json` → phải build lại APK.
- Thêm/bớt/ nâng native module (expo-*, react-native-*) → phải build lại APK.
- Runtime policy đang là `appVersion`, nên APK 1.0.0 chỉ nhận update của 1.0.0.

---

## 5. CI/CD với GitHub Actions

Workflow: `.github/workflows/mobile-ci.yml`

### Trigger

| Sự kiện | Job chạy |
|---|---|
| Push lên `main` / `master` | `pre-check` → `eas-ota` (OTA lên channel `preview`) |
| Push lên branch ngày (`13-11-26`, ...) | `pre-check` (typecheck + test) |
| Pull request vào `main` / `master` | `pre-check` |
| Chạy tay (workflow_dispatch) | `pre-check` + (`eas-ota` hoặc `eas-build`) |

### Bước cần làm một lần trên GitHub

CI cần **`EXPO_TOKEN`**. Chưa có secret này thì job build/OTA tự bỏ qua (đã guard bằng `if: env.EXPO_TOKEN != ''`), chỉ còn typecheck + test.

1. Tạo token: https://expo.dev/settings/access-tokens → **Create token**
2. Vào repo GitHub → **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `EXPO_TOKEN` — Value: token vừa tạo

### Build APK từ GitHub

**Actions → Mobile App CI & EAS Deploy → Run workflow**
- `action`: `eas-build-apk`
- `profile`: `preview` (APK) hoặc `production` (AAB)

### Push OTA từ GitHub

**Run workflow** → `action`: `eas-ota-update` → `channel`: `preview` | `production`

### Kích hoạt OTA tự động

OTA tự chạy khi merge/push vào `main`. Repo hiện dùng branch theo ngày
(`13-11-26`, ...) nên muốn auto-deploy phải hợp nhất vào `main`:

```powershell
git checkout main
git pull origin main
git merge 13-11-26
git push origin main        # → CI chạy pre-check rồi OTA
```

> Lưu ý: `main` hiện đã phân nhánh so với các branch ngày. Kiểm tra conflict trước khi merge.

---

## 6. Trước khi phát hành production

`app.json` đang bật cấu hình HTTP cho môi trường dev — **phải siết lại** trước khi phát hành thật:

- `expo-build-properties` → `android.usesCleartextTraffic: true`
- `expo-build-properties` → `ios.infoPlist.NSAppTransportSecurity.NSAllowsArbitraryLoads: true`

Đổi sang HTTPS-only, build lại native, rồi kiểm tra trên máy thật:
đăng nhập, khôi phục session, đăng ký khuôn mặt, reconnect notification, AI streaming.

Nâng cấp dependency native cũng bắt buộc build lại (không dùng OTA được).

---

## 7. Troubleshooting

### `Gradle build failed with unknown error`

Lấy log thật (CLI không in ra nguyên nhân):

```powershell
npx eas-cli build:view <build-id>          # chỉ có link, không có log
```

Mở link `Logs`, vào phase **Run gradlew**, tìm dòng `* What went wrong:`.

#### Lỗi đã từng gặp

```
> Field 'version' is required for type with serial name
  'expo.modules.plugin.configuration.Publication', but it was missing
  at path: $.modules[N].projects[0].publication
```

Nghĩa là có **hai bản `expo-image` khác SDK** trong `node_modules`. Nguyên nhân:
`@infinitered/react-native-mlkit-face-detection` khai báo peer dependency
`"expo-image": "*"`. Vì project không có `expo-image` trực tiếp, npm cài bản
`latest` (SDK 58) lồng bên trong package đó, và config plugin của SDK 57 đọc
file `expo-module.config.json` của bản 58 → thiếu field `version` → sập.

Kiểm tra:

```powershell
Get-ChildItem node_modules -Filter expo-module.config.json -Recurse |
  ForEach-Object {
    $j = Get-Content $_.FullName -Raw | ConvertFrom-Json
    if ($j.android.publication -and -not $j.android.publication.version) { $_.FullName }
  }
```

Phải không in ra dòng nào. Cách sửa:

```powershell
npx expo install expo-image   # cài bản đúng SDK 57 ở top-level
npm dedupe                     # gộp, xoá bản 58 lồng bên trong
```

> Bài học: bất kỳ package nào có peer dependency `expo-* : "*"` đều có thể
> kéo về bản SDK mới hơn. Luôn chạy `npx expo install --check` và kiểm tra
> `node_modules/<pkg>/node_modules/` sau khi thêm thư viện native mới.

### Build treo ở `Computing project fingerprint`

```powershell
$env:EAS_SKIP_AUTO_FINGERPRINT=1
```

