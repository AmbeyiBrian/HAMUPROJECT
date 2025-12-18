module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Removed expo-router/babel as it's deprecated in SDK 50+
    plugins: [
      // Make sure Reanimated plugin is listed last
      '@babel/plugin-proposal-export-namespace-from',
      'react-native-reanimated/plugin'
    ]
  };
};
