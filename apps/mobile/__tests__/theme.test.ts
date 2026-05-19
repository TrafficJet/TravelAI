/**
 * Unit tests for theme color tokens.
 * Run with: npx jest (after adding jest + @types/jest to devDependencies)
 *
 * What is tested:
 *  1. lightColors has light background, dark text
 *  2. darkColors has dark background, light text
 *  3. Both themes have identical keys (no missing tokens)
 *  4. textSecondary and textMuted exist in both themes (used by notifications/profile)
 */

import { lightColors, darkColors } from '../src/theme/colors';

describe('lightColors', () => {
  test('background is light (#F5F5FA)', () => {
    expect(lightColors.background).toBe('#F5F5FA');
  });

  test('text is dark', () => {
    // text color luminance should be dark (starts with #0 or #1)
    expect(lightColors.text.toLowerCase()).toMatch(/^#(0|1)/);
  });

  test('card is white', () => {
    expect(lightColors.card).toBe('#FFFFFF');
  });
});

describe('darkColors', () => {
  test('background is dark (#0A0A14)', () => {
    expect(darkColors.background).toBe('#0A0A14');
  });

  test('text is light', () => {
    expect(darkColors.text.toLowerCase()).toMatch(/^#[ef]/i);
  });
});

describe('theme token parity', () => {
  test('both themes have identical keys', () => {
    const lightKeys = Object.keys(lightColors).sort();
    const darkKeys = Object.keys(darkColors).sort();
    expect(lightKeys).toEqual(darkKeys);
  });

  test('textSecondary exists in lightColors', () => {
    expect(lightColors).toHaveProperty('textSecondary');
    expect(typeof lightColors.textSecondary).toBe('string');
  });

  test('textSecondary exists in darkColors', () => {
    expect(darkColors).toHaveProperty('textSecondary');
    expect(typeof darkColors.textSecondary).toBe('string');
  });

  test('textMuted exists in both themes', () => {
    expect(lightColors).toHaveProperty('textMuted');
    expect(darkColors).toHaveProperty('textMuted');
  });

  test('no token is an empty string', () => {
    Object.entries(lightColors).forEach(([key, value]) => {
      expect(value, `lightColors.${key} is empty`).not.toBe('');
    });
    Object.entries(darkColors).forEach(([key, value]) => {
      expect(value, `darkColors.${key} is empty`).not.toBe('');
    });
  });
});
