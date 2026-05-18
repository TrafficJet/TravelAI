// Network monitoring test for demo login
const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 }
  });

  // Capture all network requests
  const requests = [];
  page.on('request', req => {
    if (req.url().includes('railway.app') || req.url().includes('localhost:80')) {
      requests.push({ method: req.method(), url: req.url() });
    }
  });

  const responses = [];
  page.on('response', async resp => {
    if (resp.url().includes('railway.app')) {
      let body = '';
      try { body = await resp.text(); } catch(e) {}
      responses.push({ status: resp.status(), url: resp.url(), body: body.substring(0, 200) });
    }
  });

  // Handle dialogs (Alert.alert on web becomes window.alert)
  page.on('dialog', async dialog => {
    console.log('DIALOG [' + dialog.type() + ']:', dialog.message());
    await dialog.accept();
  });

  await page.goto('http://localhost:8081', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Skip onboarding
  try {
    const skip = page.getByText('Пропустить').first();
    await skip.waitFor({ state: 'visible', timeout: 5000 });
    await skip.click();
    await page.waitForTimeout(2000);
    console.log('Skipped onboarding');
  } catch(e) {
    console.log('No onboarding or already past it');
  }

  console.log('\n--- CLICKING TRY DEMO ---');
  try {
    const demoBtn = page.getByText('Try Demo').first();
    await demoBtn.waitFor({ state: 'visible', timeout: 5000 });
    await demoBtn.click();
    await page.waitForTimeout(6000);
    console.log('Clicked Try Demo');
  } catch(e) {
    console.log('ERROR clicking Try Demo:', e.message);
  }

  console.log('\n--- NETWORK REQUESTS TO BACKEND ---');
  requests.forEach(r => console.log(' ', r.method, r.url));

  console.log('\n--- BACKEND RESPONSES ---');
  responses.forEach(r => console.log(' ', r.status, r.url, '\n   body:', r.body));

  const pageText = await page.locator('body').innerText().catch(() => '');
  console.log('\n--- PAGE STATE AFTER LOGIN ATTEMPT ---');
  console.log(pageText.substring(0, 400));

  await browser.close();
})();
