export default ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? "development";

  const profiles = {
    development: {
      androidPackage: "com.devhananabdu.hifzi.dev",
      iosBundle: "com.devhananabdu.hifzi.dev",
      appName: "Hifzi (Dev)",
      scheme: "hifzi-dev",
    },
    preview: {
      androidPackage: "com.devhananabdu.hifzi.preview",
      iosBundle: "com.devhananabdu.hifzi.preview",
      appName: "Hifzi (Preview)",
      scheme: "hifzi-preview",
    },
    production: {
      androidPackage: "com.devhananabdu.hifzi",
      iosBundle: "com.devhananabdu.hifzi",
      appName: "Hifzi",
      scheme: "hifzi",
    },
  };

  const active = profiles[profile] || profiles.development;

  return {
    ...config,
    name: active.appName,
    slug: "hifzi",
    scheme: active.scheme,
    version: "1.0.0",
    icon: "./assets/images/minilogo.png", 
    userInterfaceStyle: "automatic",
    
    splash: {
      image: "./assets/images/minilogo.png", 
      resizeMode: "contain",
      backgroundColor: "#276359"
    },

    ios: {
      bundleIdentifier: active.iosBundle,
      supportsTablet: true
    },

    android: {
      package: active.androidPackage,
      adaptiveIcon: {
        foregroundImage: "./assets/images/minilogo.png", 
        backgroundColor: "#276359"
      }
    },

    extra: {
      eas: {
        projectId: "ac7a8e6c-fbf0-4338-935a-6c887e67d6d4"
      }
    },
    plugins: ["expo-sqlite", "expo-audio", "expo-asset"]
  };
};