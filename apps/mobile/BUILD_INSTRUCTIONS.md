# TravelAI — Инструкция по сборке

## Предварительные требования
- Node.js 20+
- EAS CLI: `npm install -g eas-cli`
- Аккаунт Expo: https://expo.dev/signup

## Первый запуск (один раз)
```bash
eas login
eas init   # создаст projectId, обнови extra.eas.projectId в app.json
```

## Сборка APK для тестирования (Android)
```bash
cd apps/mobile
eas build --platform android --profile preview
```
Скачает APK-ссылку — установи прямо на Android-устройство.

## Сборка для App Store + Google Play
```bash
# Android AAB для Google Play
eas build --platform android --profile production

# iOS IPA для App Store
eas build --platform ios --profile production
```

## Отправка в магазины
```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## Обновления без пересборки (OTA)
```bash
eas update --branch production --message "Описание обновления"
```
