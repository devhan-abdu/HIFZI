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
    "production-apk": {
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
    version: "1.0.0",
    runtimeVersion: "1.0.0",
    scheme: active.scheme,
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: "./assets/images/minilogo.png",
    ios: {
      bundleIdentifier: active.iosBundle,
      supportsTablet: true,
      buildNumber: "1",
    },
    android: {
      package: active.androidPackage,
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/minilogo.png",
        backgroundColor: "#E6F4FE",
        monochromeImage: "./assets/images/minilogo.png",
      },
      permissions: [
        "android.permission.INTERNET",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
      ],
    },
    web: {
      bundler: "metro",
      favicon: "./assets/images/favicon.png",
    },
    extra: {
      eas: {
        projectId: "b30fb5cd-a8e2-4463-bbea-5df0ca4348bb",
      },
    },
    plugins: [
      [
        "expo-splash-screen",
        {
          image: "./assets/images/hifzilogowhite.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#276359",
          dark: {
            backgroundColor: "#1e293b",
          },
        },
      ],
      "expo-sqlite",
      "expo-audio",
      "expo-asset",
      [
        "expo-font",
        {
          fonts: [
            "./assets/fonts/rosemary.ttf",
            "./assets/fonts/uthman.ttf",
          ],
        },
      ],
    ],
  };
};