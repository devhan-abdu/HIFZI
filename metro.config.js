const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
 
const config = getDefaultConfig(__dirname)

config.resolver.assetExts.push('db', 'sqlite', 'sql')
 
module.exports = withNativeWind(config, { input: './src/global.css' })