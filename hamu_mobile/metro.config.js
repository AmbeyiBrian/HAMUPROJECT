// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for TypeScript files
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx'];

// Enhanced asset resolution for images
config.resolver.assetExts = [...config.resolver.assetExts, 'cjs', 'png', 'jpg', 'jpeg', 'gif', 'webp'];

// Make sure to include proper transformer for images
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Enable caching for faster rebuilds
config.cacheStores = [...(config.cacheStores ?? [])];

module.exports = config;
