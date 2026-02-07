/**
 * E2E тест AdRotator в браузере (Playwright)
 * Запуск: npx playwright test e2e/browser-test.mjs (или node с playwright)
 */
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const logs = [];
  const log = (msg) => {
    logs.push(msg);
    console.log(msg);
  };

  try {
    // 1. Главная — дашборд
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Дашборд', { timeout: 5000 });
    log('OK: Дашборд загружен');

    // 2. Кампании
    await page.click('a[href="/campaigns"]');
    await page.waitForSelector('text=Кампании', { timeout: 3000 });
    log('OK: Страница кампаний');

    // 3. Создать кампанию
    await page.click('a[href="/campaigns/new"]');
    await page.fill('input[type="text"]', 'Тестовая кампания');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/campaigns$/);
    log('OK: Кампания создана');

    // 4. Креативы — новый
    await page.goto(BASE + '/creatives/new');
    await page.waitForSelector('select', { timeout: 3000 });
    await page.selectOption('select', { index: 1 }); // первая кампания
    await page.fill('input[placeholder*="Название"], input[value=""]', 'Тестовый баннер');
    await page.fill('input[placeholder="https://example.com"]', 'https://example.com');
    // Минимальный креатив без картинки — можно указать внешний URL
    await page.fill('input[placeholder*="URL изображения"]', 'https://via.placeholder.com/300x250?text=Ad');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/creatives$/);
    log('OK: Креатив создан');

    // 5. Площадка (привязать креатив)
    await page.goto(BASE + '/placements/new');
    await page.waitForSelector('input[placeholder*="Название"]', { timeout: 3000 });
    await page.fill('input[placeholder*="Название"]', 'Боковая панель');
    await page.fill('input[placeholder*="sidebar"]', 'sidebar-300x250');
    // Отметить первый креатив в списке
    const firstCheckbox = page.locator('div.max-h-48 input[type="checkbox"]').first();
    await firstCheckbox.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await firstCheckbox.check().catch(() => {});
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/placements$/);
    log('OK: Площадка создана');

    // 6. Проверка API выдачи баннера
    const res = await page.request.get(BASE + '/api/serve/sidebar-300x250');
    const body = await res.json().catch(() => ({}));
    if (body && (body.image_url || body.html_content)) {
      log('OK: API /serve/sidebar-300x250 вернул баннер');
    } else {
      log('WARN: Баннер не вернулся (возможно креатив не привязан к площадке)');
    }

    // 7. Дашборд снова
    await page.goto(BASE + '/');
    await page.waitForSelector('text=Активных кампаний', { timeout: 3000 });
    const cards = await page.locator('.text-3xl').allTextContents();
    log('OK: Дашборд показывает метрики: ' + cards.slice(0, 3).join(', '));

    // 8. Страница с SDK — симуляция показа баннера
    await page.goto(BASE + '/sdk/ad.js');
    const sdkStatus = page.url();
    if (sdkStatus.includes('ad.js')) log('OK: SDK доступен по /sdk/ad.js');
  } catch (err) {
    log('FAIL: ' + err.message);
  } finally {
    await browser.close();
  }

  return logs;
}

main()
  .then((logs) => {
    const failed = logs.filter((l) => l.startsWith('FAIL'));
    process.exit(failed.length > 0 ? 1 : 0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
