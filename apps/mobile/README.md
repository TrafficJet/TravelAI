# Travel AI — Mobile App

AI-ассистент для планирования путешествий. React Native + Expo SDK 51.

## Быстрый старт

```bash
cd travel-ai/apps/mobile
npm install
npx expo start
```

Отсканируйте QR-код в приложении **Expo Go** (iOS / Android).

## Переменные окружения

Создайте файл `.env` в папке `mobile/`:

```
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

## Стек

- Expo SDK 51 + Expo Router v3 (файловая маршрутизация)
- TypeScript (strict)
- Zustand (state management)
- NativeWind v4 (Tailwind CSS)
- axios + SecureStore (HTTP + токены)
- fetch ReadableStream (SSE стриминг чата)
