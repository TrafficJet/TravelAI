/**
 * SVIT Brand Asset Generator
 * Uses Playwright (from project node_modules) to render SVG to PNG
 * Concept C: S-Horizon symbol — teal top arc + amber bottom arc + amber center dot
 */

const { chromium } = require('./node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, 'apps/mobile/assets');

// SVIT Abstract Symbol — Concept C (adapted from icon-SVIT.svg)
// Colors per spec: indigo top arc, teal bottom arc, amber center dot
// Using brand colors from icon-SVIT.svg: teal #14B8A6, amber #F59E0B
// Per task: indigo #6C63FF top arc, teal #00B4D8 bottom arc, amber #FFB347 center dot

function buildIconHtml(size, bgColor, includeBg) {
  const padding = Math.round(size * 0.12);
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 512;

  // S-curve paths scaled to the target size
  // Original paths from icon-SVIT.svg scaled from 512px base
  const s = (n) => n * scale;

  // Top arc of S: from center sweeping up-right
  const topArc = `M ${s(256)} ${s(256)}
    C ${s(310)} ${s(256)}, ${s(342)} ${s(230)}, ${s(342)} ${s(192)}
    C ${s(342)} ${s(154)}, ${s(310)} ${s(118)}, ${s(256)} ${s(118)}
    C ${s(220)} ${s(118)}, ${s(190)} ${s(132)}, ${s(175)} ${s(152)}`;

  // Bottom arc of S: from center sweeping down-left
  const bottomArc = `M ${s(256)} ${s(256)}
    C ${s(202)} ${s(256)}, ${s(170)} ${s(282)}, ${s(170)} ${s(320)}
    C ${s(170)} ${s(358)}, ${s(202)} ${s(394)}, ${s(256)} ${s(394)}
    C ${s(292)} ${s(394)}, ${s(322)} ${s(380)}, ${s(337)} ${s(360)}`;

  const strokeW = Math.round(s(28));
  const dotOuter = Math.round(s(22));
  const dotMid = Math.round(s(14));
  const dotInner = Math.round(s(9));

  const bg = includeBg
    ? `<rect width="${size}" height="${size}" fill="${bgColor}"/>`
    : `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}

  <!-- TOP HALF of S — indigo #6C63FF, bulges right -->
  <path
    d="${topArc}"
    fill="none"
    stroke="#6C63FF"
    stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- BOTTOM HALF of S — teal #00B4D8, bulges left -->
  <path
    d="${bottomArc}"
    fill="none"
    stroke="#00B4D8"
    stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- CENTER DOT — amber #FFB347 -->
  <circle cx="${s(256)}" cy="${s(256)}" r="${dotOuter}" fill="none" stroke="#FFB347" stroke-width="2" opacity="0.4"/>
  <circle cx="${s(256)}" cy="${s(256)}" r="${dotMid}" fill="${bgColor}"/>
  <circle cx="${s(256)}" cy="${s(256)}" r="${dotInner}" fill="#FFB347"/>
</svg>
</body>
</html>`;
}

function buildSplashHtml(width, height) {
  const bgColor = '#060B18';
  // Logo rendered at 320x320 in center of splash
  const logoSize = 320;
  const cx = width / 2;
  const cy = height / 2;
  const scale = logoSize / 512;

  const s = (n) => cx - logoSize / 2 + n * scale;
  const sy = (n) => cy - logoSize / 2 + n * scale;

  const topArc = `M ${s(256)} ${sy(256)}
    C ${s(310)} ${sy(256)}, ${s(342)} ${sy(230)}, ${s(342)} ${sy(192)}
    C ${s(342)} ${sy(154)}, ${s(310)} ${sy(118)}, ${s(256)} ${sy(118)}
    C ${s(220)} ${sy(118)}, ${s(190)} ${sy(132)}, ${s(175)} ${sy(152)}`;

  const bottomArc = `M ${s(256)} ${sy(256)}
    C ${s(202)} ${sy(256)}, ${s(170)} ${sy(282)}, ${s(170)} ${sy(320)}
    C ${s(170)} ${sy(358)}, ${s(202)} ${sy(394)}, ${s(256)} ${sy(394)}
    C ${s(292)} ${sy(394)}, ${s(322)} ${sy(380)}, ${s(337)} ${sy(360)}`;

  const strokeW = Math.round(scale * 28);
  const dotOuter = Math.round(scale * 22);
  const dotMid = Math.round(scale * 14);
  const dotInner = Math.round(scale * 9);
  const centerX = s(256);
  const centerY = sy(256);

  // SVIT text below logo
  const textY = cy + logoSize / 2 + 56;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; overflow: hidden; background: ${bgColor}; }
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>

  <!-- TOP HALF of S — indigo -->
  <path
    d="${topArc}"
    fill="none"
    stroke="#6C63FF"
    stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- BOTTOM HALF of S — teal -->
  <path
    d="${bottomArc}"
    fill="none"
    stroke="#00B4D8"
    stroke-width="${strokeW}"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- CENTER DOT — amber -->
  <circle cx="${centerX}" cy="${centerY}" r="${dotOuter}" fill="none" stroke="#FFB347" stroke-width="2" opacity="0.4"/>
  <circle cx="${centerX}" cy="${centerY}" r="${dotMid}" fill="${bgColor}"/>
  <circle cx="${centerX}" cy="${centerY}" r="${dotInner}" fill="#FFB347"/>

  <!-- SVIT wordmark -->
  <text
    x="${width / 2}"
    y="${textY}"
    font-family="'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-weight="700"
    font-size="72"
    letter-spacing="-2"
    fill="#F4F4F8"
    text-anchor="middle"
  >SVIT</text>

  <!-- Tagline -->
  <text
    x="${width / 2}"
    y="${textY + 52}"
    font-family="'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    font-weight="400"
    font-size="28"
    letter-spacing="5"
    fill="#6B7280"
    text-anchor="middle"
  >THE WHOLE WORLD</text>
</svg>
</body>
</html>`;
}

async function main() {
  console.log('Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ deviceScaleFactor: 1 });

  // 1. icon.png — 1024x1024, dark bg #060B18
  {
    const size = 1024;
    const page = await context.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(buildIconHtml(size, '#060B18', true));
    await page.waitForTimeout(100);
    const outPath = path.join(ASSETS_DIR, 'icon.png');
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const stat = fs.statSync(outPath);
    console.log(`icon.png — ${size}x${size} — ${stat.size} bytes`);
  }

  // 2. adaptive-icon.png — 1024x1024, dark bg #060B18
  {
    const size = 1024;
    const page = await context.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(buildIconHtml(size, '#060B18', true));
    await page.waitForTimeout(100);
    const outPath = path.join(ASSETS_DIR, 'adaptive-icon.png');
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const stat = fs.statSync(outPath);
    console.log(`adaptive-icon.png — ${size}x${size} — ${stat.size} bytes`);
  }

  // 3. splash.png — 1284x2778, dark bg #060B18, logo centered + wordmark
  {
    const width = 1284;
    const height = 2778;
    const page = await context.newPage();
    await page.setViewportSize({ width, height });
    await page.setContent(buildSplashHtml(width, height));
    await page.waitForTimeout(100);
    const outPath = path.join(ASSETS_DIR, 'splash.png');
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width, height } });
    await page.close();
    const stat = fs.statSync(outPath);
    console.log(`splash.png — ${width}x${height} — ${stat.size} bytes`);
  }

  // 4. favicon.png — 64x64, dark bg #060B18
  {
    const size = 64;
    const page = await context.newPage();
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(buildIconHtml(size, '#060B18', true));
    await page.waitForTimeout(100);
    const outPath = path.join(ASSETS_DIR, 'favicon.png');
    await page.screenshot({ path: outPath, clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
    const stat = fs.statSync(outPath);
    console.log(`favicon.png — ${size}x${size} — ${stat.size} bytes`);
  }

  await browser.close();
  console.log('Done. All assets written to apps/mobile/assets/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
