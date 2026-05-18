# Публикация в TestFlight

## Предварительно нужно
- [ ] Apple Developer аккаунт ($99/год) — developer.apple.com
- [ ] EAS CLI: npm install -g eas-cli
- [ ] Expo аккаунт — expo.dev

## Шаги

### 1. Инициализация EAS проекта
```
eas init --id <ваш-expo-project-id>
```
Или создай проект на expo.dev, скопируй Project ID в app.json → extra.eas.projectId

### 2. Конфигурация Apple
В eas.json → submit.production.ios заполни:
- appleId: ваш Apple ID
- ascAppId: ID приложения из App Store Connect (создать на appstoreconnect.apple.com)
- appleTeamId: Team ID из developer.apple.com/account

### 3. Сборка для TestFlight
```
eas build --platform ios --profile production
```
Занимает ~15-20 минут. EAS предложит создать сертификаты автоматически.

### 4. Загрузка в TestFlight
```
eas submit --platform ios --latest
```
Или вручную загрузи .ipa файл через Transporter (macOS).

### 5. Тестирование
- В App Store Connect → TestFlight
- Добавь тестеров через email или создай публичную ссылку

## Переменные окружения на EAS
В expo.dev → проект → Settings → Environment Variables добавь:
- EXPO_PUBLIC_API_URL=https://travel-ai-backend-production-90a0.up.railway.app/api
