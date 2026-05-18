const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }
  });
  context.on('dialog', async d => { await d.accept(); });
  const page = await context.newPage();

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Click Пропустить
  try {
    await page.click('text=Пропустить', { timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch(e) { console.log('No skip button'); }

  // Click Try Demo
  try {
    await page.click('text=Try Demo', { timeout: 5000 });
    await page.waitForTimeout(5000);
  } catch(e) { console.log('No Try Demo button'); }

  // Now we should be on main screen - check DOM for tabs
  const tabInfo = await page.evaluate(() => {
    const allText = document.body.innerText;
    
    // Find elements with tab-like text
    const elements = document.querySelectorAll('*');
    const tabElements = [];
    elements.forEach(el => {
      const text = (el.innerText || el.textContent || '').trim();
      if (['Чат', 'Брони', 'Кошелёк', 'Профиль', 'Chat', 'Bookings', 'Wallet', 'Profile'].some(t => text === t)) {
        const rect = el.getBoundingClientRect();
        tabElements.push({
          tag: el.tagName,
          text: text,
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          tabIndex: el.tabIndex,
          x: Math.round(rect.x), y: Math.round(rect.y),
          w: Math.round(rect.width), h: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0,
          pointerEvents: window.getComputedStyle(el).pointerEvents,
          zIndex: window.getComputedStyle(el).zIndex,
          overflow: window.getComputedStyle(el).overflow,
        });
      }
    });
    
    return { 
      bodyText: allText.substring(0, 400),
      tabElements
    };
  });

  console.log('Body text:', tabInfo.bodyText);
  console.log('\nTab elements found:', tabInfo.tabElements.length);
  tabInfo.tabElements.forEach(el => {
    console.log(JSON.stringify(el, null, 2));
  });

  // Try to click Профиль directly by coordinates
  const profileEl = tabInfo.tabElements.find(e => e.text === 'Профиль');
  if (profileEl && profileEl.visible) {
    console.log(`\nTrying to click Профиль at (${profileEl.x + profileEl.w/2}, ${profileEl.y + profileEl.h/2})`);
    await page.mouse.click(profileEl.x + profileEl.w/2, profileEl.y + profileEl.h/2);
    await page.waitForTimeout(2000);
    const afterText = await page.locator('body').innerText().catch(() => '');
    console.log('After click on Профиль:', afterText.substring(0, 300));
  }

  await page.screenshot({ path: '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/debug_tabs.png' });
  await browser.close();
})();
