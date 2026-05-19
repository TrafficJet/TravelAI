#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run-simulator.sh — запуск SVIT на iOS Simulator через expo run:ios
#
# Использование:
#   chmod +x run-simulator.sh
#   ./run-simulator.sh
#
# Опциональные аргументы передаются прямо в expo run:ios, например:
#   ./run-simulator.sh --device "iPhone 16"
# ---------------------------------------------------------------------------

set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[SVIT]${NC} $*"; }
warn() { echo -e "${YELLOW}[SVIT]${NC} $*"; }
err()  { echo -e "${RED}[SVIT ERROR]${NC} $*" >&2; }

# ── 1. Проверка Xcode ───────────────────────────────────────────────────────
log "Проверка Xcode..."

if ! command -v xcodebuild &>/dev/null; then
  err "Xcode не найден. Установите Xcode из Mac App Store:"
  err "  https://apps.apple.com/app/xcode/id497799835"
  exit 1
fi

XCODE_VERSION=$(xcodebuild -version 2>/dev/null | head -1)
log "Найден: $XCODE_VERSION"

# Проверяем, что Xcode Command Line Tools установлены
if ! xcode-select -p &>/dev/null; then
  err "Xcode Command Line Tools не установлены. Выполните:"
  err "  xcode-select --install"
  exit 1
fi

# Принимаем лицензию автоматически (нужно для первого запуска)
if ! xcodebuild -checkFirstLaunchStatus &>/dev/null 2>&1; then
  warn "Требуется принять лицензию Xcode (может запросить пароль sudo):"
  sudo xcodebuild -license accept || {
    err "Не удалось принять лицензию Xcode. Выполните вручную: sudo xcodebuild -license accept"
    exit 1
  }
fi

# ── 2. Проверка симулятора ──────────────────────────────────────────────────
log "Проверка доступных iOS Simulator..."

if ! xcrun simctl list devices available 2>/dev/null | grep -q "iPhone"; then
  err "Нет доступных iPhone симуляторов."
  err "Откройте Xcode → Window → Devices and Simulators и добавьте симулятор."
  exit 1
fi

# ── 3. node_modules ─────────────────────────────────────────────────────────
cd "$MOBILE_DIR"

if [ ! -d "node_modules" ]; then
  log "node_modules не найдены — запускаем npm install..."
  npm install || {
    err "npm install завершился с ошибкой."
    exit 1
  }
else
  log "node_modules найдены — пропускаем npm install."
fi

# ── 4. Проверка .env ─────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  warn ".env не найден — создаю из значений по умолчанию (Railway)."
  cat > .env <<'EOF'
EXPO_PUBLIC_API_URL=https://travel-ai-backend-production-90a0.up.railway.app/api
EXPO_PUBLIC_WS_URL=wss://travel-ai-backend-production-90a0.up.railway.app
EOF
  log ".env создан."
fi

# Убеждаемся что API URL указывает на Railway, а не localhost
CURRENT_API_URL=$(grep -E '^EXPO_PUBLIC_API_URL=' .env | cut -d'=' -f2- || echo "")
if echo "$CURRENT_API_URL" | grep -q "localhost"; then
  warn "EXPO_PUBLIC_API_URL в .env указывает на localhost — заменяю на Railway URL."
  warn "(iOS Simulator не может достучаться до localhost хоста Mac без дополнительных настроек)"
  # macOS-совместимая замена через perl
  perl -i -pe 's|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://travel-ai-backend-production-90a0.up.railway.app/api|' .env
  perl -i -pe 's|^EXPO_PUBLIC_WS_URL=.*|EXPO_PUBLIC_WS_URL=wss://travel-ai-backend-production-90a0.up.railway.app|' .env
  log "URL обновлены в .env."
fi

# ── 5. Запуск expo run:ios ───────────────────────────────────────────────────
log "Запуск: npx expo run:ios $*"
log ""
log "Первый нативный билд занимает 5-15 минут — это нормально."
log "Последующие запуски будут значительно быстрее."
log ""
log "Если появится ошибка 'Could not find iPhone simulator':"
log "  Откройте Xcode → Simulator и запустите любой iPhone симулятор вручную,"
log "  затем повторите этот скрипт."
log ""

npx expo run:ios "$@" || {
  EXIT_CODE=$?
  echo ""
  err "expo run:ios завершился с ошибкой (код $EXIT_CODE)."
  err ""
  err "Частые причины и решения:"
  err ""
  err "  1. CocoaPods не установлен:"
  err "       sudo gem install cocoapods"
  err "     или через Homebrew:"
  err "       brew install cocoapods"
  err ""
  err "  2. Первая установка pods — запустите:"
  err "       cd ios && pod install && cd .."
  err ""
  err "  3. Xcode не открыт / симулятор не запущен:"
  err "       open -a Simulator"
  err ""
  err "  4. Нет прав на bundleIdentifier com.getsvit.app:"
  err "     Для локального симулятора сертификат не нужен — это не должно блокировать."
  err ""
  err "  5. Конфликт версий Metro — попробуйте:"
  err "       npx expo run:ios --clear"
  err ""
  err "  6. Полная очистка сборки:"
  err "       rm -rf ios/build && npx expo run:ios"
  exit $EXIT_CODE
}
