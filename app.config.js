export default ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? "development";

  const profiles = {
    development: {
      androidPackage: "com.devhananabdu.hifzi.dev",
      iosBundle: "com.devhananabdu.hifzi.dev",
      appName: "Hifzi Dev",
      scheme: "hifzi-dev",
    },
    preview: {
      androidPackage: "com.devhananabdu.hifzi.preview",
      iosBundle: "com.devhananabdu.hifzi.preview",
      appName: "Hifzi Preview",
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

  console.log("Active profile:", profile, "→", active.appName);

  return {
    ...config,
    name: active.appName,
    scheme: active.scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: active.iosBundle,
      supportsTablet: true,
      buildNumber: "1",
    },
    android: {
      ...config.android,
      package: active.androidPackage,
      versionCode: 1,
    },
  };
};