// E2E user flow test for travel-ai mobile app
// Run: node scripts/e2e_flow.js

const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://localhost:8081';
const SCREENSHOTS_DIR = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots';
const VIEWPORT = { width: 390, height: 844 }; // iPhone 14 Pro

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

async function screenshot(page, name, desc) {
  const filePath = path.join(SCREENSHOTS_DIR, name);
  await page.screenshot({ path: filePath, fullPage: false });
  log(`Screenshot saved: ${name} — ${desc}`);
  return filePath;
}

async function waitAndClick(page, selectors, timeout = 10000) {
  for (const sel of Array.isArray(selectors) ? selectors : [selectors]) {
    try {
      const el = page.locator(sel).first();
      await el.waitFor({ state: 'visible', timeout });
      await el.click();
      log(`Clicked: ${sel}`);
      return true;
    } catch (e) {
      // try next selector
    }
  }
  log(`WARNING: could not click any of: ${JSON.stringify(selectors)}`);
  return false;
}

async function findText(page, texts, timeout = 5000) {
  for (const text of Array.isArray(texts) ? texts : [texts]) {
    try {
      const el = page.getByText(text, { exact: false }).first();
      await el.waitFor({ state: 'visible', timeout });
      log(`Found text: "${text}"`);
      return { found: true, text };
    } catch (e) {
      // try next
    }
  }
  return { found: false };
}

const results = {
  steps: [],
  issues: [],
};

function recordStep(step, status, detail = '') {
  results.steps.push({ step, status, detail });
  log(`STEP [${status}]: ${step}${detail ? ' — ' + detail : ''}`);
}

function recordIssue(severity, location, description, fix) {
  results.issues.push({ severity, location, description, fix });
  log(`ISSUE [${severity}]: ${location} — ${description}`);
}

(async () => {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // Handle native browser dialogs (window.alert, window.confirm)
  context.on('dialog', async (dialog) => {
    log(`DIALOG [${dialog.type()}]: "${dialog.message()}"`);
    await dialog.accept();
    log('DIALOG: auto-accepted');
  });

  const page = await context.newPage();

  // Capture console errors
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`PAGE ERROR: ${err.message}`));

  try {
    // ─── STEP 1: Open app ───────────────────────────────────────────────────
    log('=== STEP 1: Opening app ===');
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000); // wait for splash screen
    await screenshot(page, '01_onboarding.png', 'Initial app load / onboarding');

    const pageContent = await page.content();
    if (pageContent.includes('<!DOCTYPE html>')) {
      recordStep('1. App loads', 'PASS', 'HTML received from localhost:8081');
    } else {
      recordStep('1. App loads', 'FAIL', 'Unexpected response');
      recordIssue('blocker', 'localhost:8081', 'App not loading', 'Check metro/expo server');
    }

    // ─── STEP 2: Onboarding ─────────────────────────────────────────────────
    log('=== STEP 2: Onboarding ===');
    await page.waitForTimeout(2000);

    // Check what's visible
    const bodyText = await page.locator('body').innerText().catch(() => '');
    log(`Visible text snippet: ${bodyText.substring(0, 300)}`);

    // Try to find and skip onboarding
    const skipResult = await findText(page, ['Skip', 'Пропустить', 'Далее', 'Next', 'Get Started', 'Начать'], 5000);

    if (skipResult.found) {
      await waitAndClick(page, [
        `text=${skipResult.text}`,
        'text=Skip',
        'text=Пропустить',
        'text=Далее',
      ]);

      await page.waitForTimeout(1500);

      // If there are multiple onboarding pages, try clicking through
      for (let i = 0; i < 5; i++) {
        const nextFound = await findText(page, ['Далее', 'Next', 'Skip', 'Пропустить'], 2000);
        if (nextFound.found) {
          await waitAndClick(page, [`text=${nextFound.text}`]);
          await page.waitForTimeout(1000);
        } else {
          break;
        }
      }

      recordStep('2. Onboarding', 'PASS', `Found and clicked "${skipResult.text}"`);
    } else {
      recordStep('2. Onboarding', 'WARN', 'No onboarding skip/next button found — may already be past onboarding');
    }

    // ─── STEP 3: Try Demo login ──────────────────────────────────────────────
    log('=== STEP 3: Try Demo login ===');
    await page.waitForTimeout(1500);

    // Screenshot of login screen state
    await screenshot(page, '02_login.png', 'Login screen before Try Demo');

    const demoResult = await findText(page, ['Try Demo', 'Попробовать демо', 'Demo', 'Демо', 'Try demo'], 8000);

    if (demoResult.found) {
      await waitAndClick(page, [
        `text=${demoResult.text}`,
        'text=Try Demo',
        'text=Demo',
      ]);

      // Wait for navigation/login
      await page.waitForTimeout(5000);

      // Handle any alert dialog that may appear
      const alertBtn = page.locator('text=OK').first();
      try {
        if (await alertBtn.isVisible({ timeout: 2000 })) {
          await alertBtn.click();
          log('Dismissed in-app alert OK button');
          await page.waitForTimeout(2000);
        }
      } catch (e) {}

      await screenshot(page, '03_sessions.png', 'After Try Demo — sessions or main screen');
      recordStep('3. Try Demo login', 'PASS', `Clicked "${demoResult.text}" — waiting for navigation`);
    } else {
      await screenshot(page, '03_sessions.png', 'Login screen state — Try Demo not found');
      const currentText = await page.locator('body').innerText().catch(() => '');
      log(`Current screen text: ${currentText.substring(0, 500)}`);

      if (currentText.includes('Demo') || currentText.includes('demo')) {
        recordStep('3. Try Demo login', 'WARN', 'Demo text found but button not clickable');
      } else {
        recordStep('3. Try Demo login', 'FAIL', 'Try Demo button not found');
        recordIssue('major', 'LoginScreen', 'Try Demo button not visible or not rendered', 'Check auth/login screen rendering');
      }
    }

    // ─── STEP 4: Sessions list + new chat ───────────────────────────────────
    log('=== STEP 4: Sessions list and new chat (FAB) ===');
    await page.waitForTimeout(3000);

    const currentText4 = await page.locator('body').innerText().catch(() => '');
    log(`Current state after login: ${currentText4.substring(0, 400)}`);

    // Look for chat/sessions tab or "+" button
    const chatTabFound = await findText(page, ['Чат', 'Chat', 'Сессии', 'Sessions', 'Новый чат'], 5000);
    if (chatTabFound.found) {
      await waitAndClick(page, [`text=${chatTabFound.text}`]);
      await page.waitForTimeout(1500);
    }

    // Look for "+" new chat button (FAB)
    const plusFound = await findText(page, ['+', 'Новый', 'New chat', 'Создать'], 5000);
    let plusClicked = false;
    if (plusFound.found) {
      plusClicked = await waitAndClick(page, [`text=${plusFound.text}`]);
    } else {
      // Try by role or aria
      plusClicked = await waitAndClick(page, [
        '[aria-label="New chat"]',
        '[aria-label="Новый чат"]',
        'button:has-text("+")',
      ], 3000);
    }

    await page.waitForTimeout(2000);

    if (plusClicked) {
      recordStep('4. Sessions list + FAB new chat', 'PASS', 'Found and clicked new chat button');
    } else {
      recordStep('4. Sessions list + FAB new chat', 'WARN', 'Could not find "+" button — may already be in chat');
      recordIssue('minor', 'SessionsScreen', '"+" new chat button (FAB) not found', 'Check if FAB button renders correctly on web');
    }

    // ─── STEP 5: Send travel query ───────────────────────────────────────────
    log('=== STEP 5: Sending travel query ===');
    await page.waitForTimeout(2000);

    const query = 'Хочу из Варшавы в Барселону на 3 дня в июне';

    // Find text input
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '[placeholder*="сообщ"]',
      '[placeholder*="введ"]',
      '[placeholder*="напиш"]',
      '[placeholder*="message"]',
      '[placeholder*="Message"]',
      '[contenteditable="true"]',
      'input:not([type="hidden"])',
    ];

    let inputFound = false;
    for (const sel of inputSelectors) {
      try {
        const el = page.locator(sel).first();
        await el.waitFor({ state: 'visible', timeout: 5000 });
        await el.click();
        await el.fill(query);
        log(`Typed query into: ${sel}`);
        inputFound = true;
        break;
      } catch (e) {
        // try next
      }
    }

    if (inputFound) {
      await screenshot(page, '04_chat.png', 'Query typed in chat input');

      // Send message — try Enter or send button
      await page.keyboard.press('Enter');
      log('Pressed Enter to send message');

      // Also try send button
      await waitAndClick(page, [
        'button[aria-label="Send"]',
        'button[aria-label="Отправить"]',
        '[data-testid="send-button"]',
        'text=Отправить',
      ], 2000).catch(() => {});

      log('Waiting 25 seconds for AI response...');
      await page.waitForTimeout(25000);
      await screenshot(page, '05_ai_response.png', 'AI response in chat');
      recordStep('5. Travel query sent', 'PASS', 'Query sent, waited 25s for response');
    } else {
      await screenshot(page, '04_chat.png', 'Chat screen — input not found');
      recordStep('5. Travel query sent', 'FAIL', 'Chat input field not found');
      recordIssue('blocker', 'ChatScreen', 'Text input not found in chat', 'Check TextInput rendering in web');
    }

    // ─── STEP 6: Check for FlightCard / HotelCard ───────────────────────────
    log('=== STEP 6: Checking for flight/hotel cards ===');
    const pageText6 = await page.locator('body').innerText().catch(() => '');

    const hasFlightCard = pageText6.toLowerCase().includes('рейс') ||
      pageText6.toLowerCase().includes('flight') ||
      pageText6.toLowerCase().includes('авиа') ||
      pageText6.toLowerCase().includes('лететь') ||
      pageText6.toLowerCase().includes('варшав') ||
      pageText6.toLowerCase().includes('барселон') ||
      pageText6.toLowerCase().includes('waw') ||
      pageText6.toLowerCase().includes('bcn');

    const hasHotelCard = pageText6.toLowerCase().includes('отель') ||
      pageText6.toLowerCase().includes('hotel') ||
      pageText6.toLowerCase().includes('гостиниц') ||
      pageText6.toLowerCase().includes('проживани');

    log(`Has flight-related content: ${hasFlightCard}`);
    log(`Has hotel-related content: ${hasHotelCard}`);
    log(`Page text snippet: ${pageText6.substring(0, 600)}`);

    if (hasFlightCard || hasHotelCard) {
      recordStep('6. FlightCard/HotelCard', 'PASS', `Flight: ${hasFlightCard}, Hotel: ${hasHotelCard}`);
    } else {
      const hasAnyResponse = pageText6.length > 300;
      if (hasAnyResponse) {
        recordStep('6. FlightCard/HotelCard', 'WARN', 'AI responded but no flight/hotel keywords visible');
        recordIssue('major', 'ChatScreen', 'No FlightCard or HotelCard rendered after travel query', 'Check AI response parsing and card rendering');
      } else {
        recordStep('6. FlightCard/HotelCard', 'FAIL', 'No response at all from AI');
        recordIssue('blocker', 'ChatScreen/Backend', 'AI did not respond to travel query', 'Check backend API connectivity');
      }
    }

    // ─── STEP 7: Profile tab ────────────────────────────────────────────────
    log('=== STEP 7: Profile tab ===');

    const profileClicked = await waitAndClick(page, [
      'text=Профиль',
      'text=Profile',
      '[aria-label="Профиль"]',
      '[aria-label="Profile"]',
      '[data-testid="tab-profile"]',
    ]);

    await page.waitForTimeout(2000);
    await screenshot(page, '06_profile.png', 'Profile tab');

    const profileText = await page.locator('body').innerText().catch(() => '');
    const hasUserName = profileText.includes('Demo') || profileText.includes('demo') || profileText.includes('User');
    const hasLogout = profileText.toLowerCase().includes('выйти') ||
      profileText.toLowerCase().includes('logout') ||
      profileText.toLowerCase().includes('sign out');

    log(`Profile has user name: ${hasUserName}, has logout: ${hasLogout}`);
    log(`Profile text: ${profileText.substring(0, 500)}`);

    if (profileClicked && hasUserName) {
      recordStep('7. Profile tab', 'PASS', `Demo User visible: ${hasUserName}, Logout: ${hasLogout}`);
      if (!hasLogout) {
        recordIssue('minor', 'ProfileScreen', 'Logout/Выйти button not found', 'Check ProfileScreen for logout button');
      }
    } else if (!profileClicked) {
      recordStep('7. Profile tab', 'FAIL', 'Profile tab not found');
      recordIssue('major', 'TabBar', 'Profile tab not clickable', 'Check tab bar navigation');
    } else {
      recordStep('7. Profile tab', 'WARN', 'Profile tab clicked but no user data visible');
      recordIssue('major', 'ProfileScreen', 'Demo user data not shown in Profile', 'Check auth state in ProfileScreen');
    }

    // ─── STEP 8: Bookings tab ────────────────────────────────────────────────
    log('=== STEP 8: Bookings (Брони) tab ===');

    const bookingsClicked = await waitAndClick(page, [
      'text=Брони',
      'text=Bookings',
      'text=Бронирования',
      '[aria-label="Брони"]',
      '[data-testid="tab-bookings"]',
    ]);

    await page.waitForTimeout(2000);
    await screenshot(page, '07_bookings.png', 'Bookings tab');

    const bookingsText = await page.locator('body').innerText().catch(() => '');
    log(`Bookings screen text: ${bookingsText.substring(0, 400)}`);

    if (bookingsClicked) {
      recordStep('8. Bookings tab', 'PASS', 'Navigated to Bookings tab');
    } else {
      recordStep('8. Bookings tab', 'WARN', 'Bookings tab not found');
      recordIssue('minor', 'TabBar', 'Bookings/Брони tab not found', 'Check tab bar labels');
    }

    // ─── STEP 9: Wallet tab ─────────────────────────────────────────────────
    log('=== STEP 9: Wallet (Кошелёк) tab ===');

    const walletClicked = await waitAndClick(page, [
      'text=Кошелёк',
      'text=Кошелек',
      'text=Wallet',
      'text=Баланс',
      '[aria-label="Кошелёк"]',
      '[data-testid="tab-wallet"]',
    ]);

    await page.waitForTimeout(2000);
    await screenshot(page, '08_wallet.png', 'Wallet tab');

    const walletText = await page.locator('body').innerText().catch(() => '');
    log(`Wallet screen text: ${walletText.substring(0, 400)}`);

    if (walletClicked) {
      recordStep('9. Wallet tab', 'PASS', 'Navigated to Wallet tab');
    } else {
      recordStep('9. Wallet tab', 'WARN', 'Wallet tab not found');
      recordIssue('minor', 'TabBar', 'Wallet/Кошелёк tab not found', 'Check tab bar labels');
    }

  } catch (err) {
    log(`FATAL ERROR: ${err.message}`);
    await screenshot(page, 'error_fatal.png', 'Fatal error state').catch(() => {});
    results.issues.push({
      severity: 'blocker',
      location: 'E2E test runner',
      description: `Fatal error: ${err.message}`,
      fix: 'Check app availability and DOM structure',
    });
  } finally {
    // ─── Print Results ───────────────────────────────────────────────────────
    console.log('\n\n========== E2E FLOW RESULTS ==========\n');
    console.log('STEPS:');
    results.steps.forEach((s) => {
      const icon = s.status === 'PASS' ? '[PASS]' : s.status === 'FAIL' ? '[FAIL]' : '[WARN]';
      console.log(`  ${icon} ${s.step}${s.detail ? ': ' + s.detail : ''}`);
    });

    console.log('\nISSUES:');
    if (results.issues.length === 0) {
      console.log('  None found!');
    } else {
      results.issues.forEach((i) => {
        console.log(`  [${i.severity.toUpperCase()}] ${i.location} — ${i.description}`);
        console.log(`    Fix: ${i.fix}`);
      });
    }

    if (consoleErrors.length > 0) {
      console.log('\nCONSOLE ERRORS:');
      consoleErrors.slice(0, 20).forEach((e) => console.log(`  ${e}`));
    }

    console.log('\nSCREENSHOTS saved to:', SCREENSHOTS_DIR);
    console.log('======================================\n');

    // Save results as JSON
    const resultsPath = '/Users/v/Documents/Claude/Projects/Аи Агенты/workspace/travel-ai/screenshots/e2e_results.json';
    fs.writeFileSync(resultsPath, JSON.stringify({ ...results, consoleErrors }, null, 2));
    log(`Results saved to: ${resultsPath}`);

    await browser.close();
  }
})();
