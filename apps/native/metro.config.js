const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname, { getDefaultConfig });

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve("@lingui/metro-transformer/expo"),
};
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "po", "pot"],
  // Use pre-compiled ICU message parser for smaller bundles
  // https://formatjs.github.io/docs/guides/react-native-hermes
  resolveRequest(context, moduleName, platform) {
    if (moduleName === "@formatjs/icu-messageformat-parser") {
      return context.resolveRequest(
        context,
        "@formatjs/icu-messageformat-parser/no-parser",
        platform,
      );
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./src/global.css",
  dtsFile: "./uniwind-types.d.ts",
});
