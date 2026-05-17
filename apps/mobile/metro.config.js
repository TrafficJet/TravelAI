const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// On web, replace expo-notifications with a no-op stub
const originalResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
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
