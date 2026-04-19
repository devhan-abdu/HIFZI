export default ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE ?? "development";

  let androidPackage = "com.devhananabdu.hifzi.dev";
  let iosBundle = "com.devhananabdu.hifzi.dev";
  let appName = "Hifzi (Dev)";

  if (profile === "preview") {
    androidPackage = "com.devhananabdu.hifzi.preview";
    iosBundle = "com.devhananabdu.hifzi.preview";
    appName = "Hifzi (Preview)";
  }

  if (profile === "production") {
    androidPackage = "com.devhananabdu.hifzi";
    iosBundle = "com.devhananabdu.hifzi";
    appName = "Hifzi";
  }

  console.log("🔥 Active profile:", profile);

  return {
    ...config,

    name: appName,
    slug: "hifzi",

    ios: {
      ...config.ios,
      bundleIdentifier: iosBundle,
    },

    android: {
      ...config.android,
      package: androidPackage,
    },
  };
};
