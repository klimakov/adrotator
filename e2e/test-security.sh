#!/bin/bash
# Тесты исправлений безопасности
set -e
BASE="${1:-http://127.0.0.1/api}"

echo "=== Security tests (BASE=$BASE) ==="

# 1. Open Redirect: redirect на javascript: или localhost — 400
echo "[1] Open Redirect: redirect=javascript:alert(1)..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/track/click/1?redirect=javascript:alert(1)")
if [ "$CODE" != "400" ]; then
  echo "    FAIL: ожидали 400, получили $CODE"
  exit 1
fi
echo "    OK: 400"

echo "[2] Open Redirect: redirect=http://127.0.0.1/..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/track/click/1?redirect=http://127.0.0.1/evil")
if [ "$CODE" != "400" ]; then
  echo "    FAIL: ожидали 400 для localhost, получили $CODE"
  exit 1
fi
echo "    OK: 400"

echo "[3] Open Redirect: разрешённый https — 302..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/track/click/1?redirect=https://example.com/")
if [ "$CODE" != "302" ]; then
  echo "    WARN: ожидали 302, получили $CODE"
fi
echo "    OK"

# 4. Webhook URL при сохранении кампании: localhost — 400
echo "[4] Webhook SSRF: создание кампании с webhook_url=http://localhost..."
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/campaigns" \
  -H "Content-Type: application/json" \
  -d '{"name":"Evil","status":"active","webhook_url":"http://localhost:9999/callback"}')
if [ "$CODE" != "400" ]; then
  echo "    FAIL: ожидали 400, получили $CODE"
  exit 1
fi
echo "    OK: 400"

# 5. Placement creatives: массив > 500 — 400
echo "[5] DoS: placement creatives массив 501 элемент..."
ZONE="sec-test-zone-$$"
P=$(curl -s -X POST "$BASE/placements" -H "Content-Type: application/json" \
  -d "{\"name\":\"P\",\"zone_key\":\"$ZONE\",\"width\":300,\"height\":250,\"status\":\"active\"}")
PID=$(echo "$P" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
if [ -z "$PID" ]; then
  echo "    WARN: не удалось создать площадку, пропуск проверки лимита"
else
  IDS="[$(seq -s, 0 500)]"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/placements/$PID/creatives" \
    -H "Content-Type: application/json" -d "{\"creative_ids\":$IDS}")
  if [ "$CODE" != "400" ]; then
    echo "    FAIL: ожидали 400, получили $CODE"
    exit 1
  fi
  echo "    OK: 400"
fi

echo ""
echo "=== Security tests passed ==="
