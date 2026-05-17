const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Zustand ESM files (esm/*.mjs) use `import.meta.env` which Metro
// cannot handle on web — force all zustand imports to their CJS equivalents.
const ZUSTAND_CJS_MAP = {
  'zustand':             'zustand/index.js',
  'zustand/vanilla':     'zustand/vanilla.js',
  'zustand/middleware':  'zustand/middleware.js',
  'zustand/shallow':     'zustand/shallow.js',
  'zustand/react':       'zustand/react.js',
  'zustand/context':     'zustand/context.js',
};

// On web, replace expo-notifications with a no-op stub
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force zustand → CJS on web to avoid import.meta errors
  if (platform === 'web' && ZUSTAND_CJS_MAP[moduleName]) {
    return {
      filePath: path.resolve(__dirname, 'node_modules', ZUSTAND_CJS_MAP[moduleName]),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && moduleName === 'expo-notifications') {
    return {
      filePath: path.resolve(__dirname, 'lib/expo-notifications-web-stub.ts'),
      type: 'sourceFile',
    };
  }
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      filePath: path.resolve(__dirname, 'lib/react-native-maps-web-stub.ts'),
      type: 'sourceFile',
    };
  }
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
