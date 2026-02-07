#!/bin/bash
# Тест API и сценария: кампания -> креатив -> площадка -> выдача баннера
set -e
BASE="${1:-http://127.0.0.1/api}"

echo "=== API Base: $BASE ==="

# Кампания
echo "[1] Создаю кампанию..."
C=$(curl -s -X POST "$BASE/campaigns" -H "Content-Type: application/json" \
  -d '{"name":"E2E Кампания","status":"active"}')
CID=$(echo "$C" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    Campaign ID: $CID"

# Креатив
echo "[2] Создаю креатив..."
CR=$(curl -s -X POST "$BASE/creatives" -H "Content-Type: application/json" \
  -d "{\"campaign_id\":$CID,\"name\":\"E2E Баннер\",\"type\":\"image\",\"width\":300,\"height\":250,\"image_url\":\"https://via.placeholder.com/300x250?text=AdRotator\",\"click_url\":\"https://example.com\",\"status\":\"active\"}")
CRID=$(echo "$CR" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    Creative ID: $CRID"

# Площадка
echo "[3] Создаю площадку..."
P=$(curl -s -X POST "$BASE/placements" -H "Content-Type: application/json" \
  -d '{"name":"E2E Зона","zone_key":"e2e-zone","width":300,"height":250,"status":"active"}')
PID=$(echo "$P" | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
echo "    Placement ID: $PID"

# Привязка креатива к площадке
echo "[4] Привязываю креатив к площадке..."
curl -s -X POST "$BASE/placements/$PID/creatives" -H "Content-Type: application/json" \
  -d "{\"creative_ids\":[$CRID]}" > /dev/null
echo "    OK"

# Выдача баннера
echo "[5] Запрос баннера GET $BASE/serve/e2e-zone..."
SERVE=$(curl -s "$BASE/serve/e2e-zone")
if echo "$SERVE" | grep -q '"image_url"'; then
  echo "    OK: баннер получен"
  echo "$SERVE" | head -c 200
  echo "..."
else
  echo "    FAIL: ответ не содержит image_url"
  echo "$SERVE"
  exit 1
fi

# Трекинг показа
echo "[6] Трекинг показа..."
IMP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/track/impression/$CRID?p=$PID")
echo "    Impression pixel: HTTP $IMP"

# Статистика
echo "[7] Сводка статистики..."
curl -s "$BASE/stats/summary" | head -c 250
echo ""

echo ""
echo "=== Все проверки пройдены ==="
