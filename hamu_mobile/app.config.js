module.exports = {
  expo: {
    name: "hamu_mobile",
    slug: "hamu_mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hamu.mobile",
      infoPlist: {
        // Enhanced iOS HTTP permissions
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSExceptionDomains: {
            "16.170.121.206": {
              NSExceptionAllowsInsecureHTTPLoads: true,
              NSIncludesSubdomains: true
            }
          }
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.ambeyibrian.hamu_mobile",
      permissions: ["INTERNET"],
      config: {
        usesCleartextTraffic: true
      },
      // Add the reference to our custom network security config
      androidManifest: {
        networkSecurityConfig: "@xml/network_security_config"
      }
    },
    // Enable New Architecture 
    newArchEnabled: true,
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router"
    ],    experiments: {
      typedRoutes: true
    },
    // Add explicit scheme configuration for better deep linking
    scheme: "hamu",
    // Add comprehensive linking configuration
    extra: {
      router: {
        origin: false
      }
    },
    extra: {
      apiUrl: process.env.API_URL || "http://16.170.121.206/api",
      allowInsecureConnections: true, // Add a flag to explicitly allow insecure connections
      eas: {
        projectId: "6cb4e0cd-1754-4041-bff2-2d0c172015aa"
      }
    }
  }
};
