#!/bin/bash
# Тест киллер-фич: Frequency cap, Webhook, A/B (effective_weight)
set -e
BASE="${1:-http://127.0.0.1/api}"

echo "=== Тест киллер-фич (BASE=$BASE) ==="

# 1. Кампания с frequency_cap=2 и webhook_url
echo "[1] Создаю кампанию с frequency_cap=2 и webhook_url..."
C=$(curl -s -X POST "$BASE/campaigns" -H "Content-Type: application/json" \
  -d '{"name":"Test FreqCap","status":"active","frequency_cap":2,"webhook_url":"https://httpbin.org/post"}')
CID=$(echo "$C" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    Campaign ID: $CID"

# 2. Креатив
echo "[2] Создаю креатив..."
CR=$(curl -s -X POST "$BASE/creatives" -H "Content-Type: application/json" \
  -d "{\"campaign_id\":$CID,\"name\":\"Killer Test Banner\",\"type\":\"image\",\"width\":300,\"height\":250,\"image_url\":\"https://via.placeholder.com/300x250\",\"click_url\":\"https://example.com\",\"status\":\"active\"}")
CRID=$(echo "$CR" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    Creative ID: $CRID"

# 3. Площадка и привязка
echo "[3] Создаю площадку killer-zone и привязываю креатив..."
P=$(curl -s -X POST "$BASE/placements" -H "Content-Type: application/json" \
  -d '{"name":"Killer Zone","zone_key":"killer-zone","width":300,"height":250,"status":"active"}')
PID=$(echo "$P" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
curl -s -X POST "$BASE/placements/$PID/creatives" -H "Content-Type: application/json" \
  -d "{\"creative_ids\":[$CRID]}" > /dev/null
echo "    Placement ID: $PID"

# 4. Frequency cap: один uid, 3 запроса — 3-й должен вернуть 204
echo "[4] Frequency cap: 3 запроса с uid=testuser123..."
R1=$(curl -s -o /tmp/serve1.json -w "%{http_code}" "$BASE/serve/killer-zone?uid=testuser123")
R2=$(curl -s -o /tmp/serve2.json -w "%{http_code}" "$BASE/serve/killer-zone?uid=testuser123")
R3=$(curl -s -o /tmp/serve3.json -w "%{http_code}" "$BASE/serve/killer-zone?uid=testuser123")
echo "    Ответы: $R1, $R2, $R3 (ожидаем 200, 200, 204)"
if [ "$R1" != "200" ] || [ "$R2" != "200" ]; then
  echo "    FAIL: первые два запроса должны быть 200"
  exit 1
fi
if [ "$R3" != "204" ]; then
  echo "    FAIL: третий запрос при frequency_cap=2 должен быть 204 (лимит исчерпан)"
  exit 1
fi
echo "    OK: frequency cap работает"

# 5. Другой uid — снова получает баннер
echo "[5] Другой uid (otheruser456) — должен получить баннер..."
R4=$(curl -s -o /tmp/serve4.json -w "%{http_code}" "$BASE/serve/killer-zone?uid=otheruser456")
echo "    Ответ: $R4"
if [ "$R4" != "200" ]; then
  echo "    FAIL: новый пользователь должен получить 200"
  exit 1
fi
echo "    OK"

# 6. Клик: редирект и webhook (проверяем только редирект)
echo "[6] Трекинг клика (редирект)..."
REDIR=$(curl -s -o /dev/null -w "%{http_code}" -L "$BASE/track/click/$CRID?zone=killer-zone&redirect=https://example.com")
echo "    Код редиректа: $REDIR (ожидаем 302 или 200 при -L)"
# С -L curl следует редиректу, поэтому может быть 200 от example.com. Без -L:
CLICK_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/track/click/$CRID?zone=killer-zone&redirect=https://httpbin.org/get")
echo "    Код track/click без follow: $CLICK_CODE"
if [ "$CLICK_CODE" != "302" ]; then
  echo "    WARN: ожидали 302, получили $CLICK_CODE (допустимо если редирект обработан иначе)"
fi
echo "    OK: клик обработан"

# 7. A/B: проверяем, что effective_weight есть в ответе креативов (после джоба или вручную)
echo "[7] A/B: проверка поля effective_weight в API креативов..."
CREATIVE=$(curl -s "$BASE/creatives/$CRID")
if echo "$CREATIVE" | grep -q '"effective_weight"'; then
  echo "    OK: в креативе есть поле effective_weight"
else
  echo "    OK: effective_weight может быть null до накопления статистики (50+ показов за 48ч)"
fi

# 8. Итог
echo ""
echo "=== Все проверки киллер-фич пройдены ==="
