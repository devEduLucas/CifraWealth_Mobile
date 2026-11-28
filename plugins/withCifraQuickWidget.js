const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");

const RECEIVER_NAME_SUFFIX = ".widgets.CifraQuickWidgetProvider";

function withWidgetReceiver(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const packageName = modConfig.android?.package;
    if (!packageName) throw new Error("CifraQuickWidget requires expo.android.package in app.json.");

    const application = manifest.application?.[0];
    if (!application) throw new Error("CifraQuickWidget could not find the Android application manifest entry.");

    application.receiver ??= [];
    const receiverName = \${packageName}\${RECEIVER_NAME_SUFFIX};
    const alreadyRegistered = application.receiver.some(
      (receiver) => receiver.$?.["android:name"] === receiverName
    );

    if (!alreadyRegistered) {
      application.receiver.push({
        $: {
          "android:name": receiverName,
          "android:label": "CifraWealth - Lançamento rápido",
          "android:enabled": "true",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_APPWIDGET"
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }
            ]
          }
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/cifra_quick_widget_info"
            }
          }
        ]
      });
    }

    manifest["uses-feature"] ??= [];
    if (!manifest["uses-feature"].some((item) => item.$?.["android:name"] === "android.software.app_widgets")) {
      manifest["uses-feature"].push({
        $: { "android:name": "android.software.app_widgets", "android:required": "false" }
      });
    }
    return modConfig;
  });
}

function withWidgetFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
      const packageName = modConfig.android?.package;
      if (!packageName) throw new Error("CifraQuickWidget requires expo.android.package in app.json.");

      const sourceRoot = path.join(projectRoot, "widgets", "android");
      const javaPackagePath = packageName.replace(/\\./g, "/");
      const kotlinTarget = path.join(
        platformProjectRoot, "app", "src", "main", "java", javaPackagePath, "widgets"
      );

      fs.mkdirSync(kotlinTarget, { recursive: true });
      const kotlinSource = fs.readFileSync(
        path.join(sourceRoot, "kotlin", "CifraQuickWidgetProvider.kt"), "utf8"
      );
      fs.writeFileSync(
        path.join(kotlinTarget, "CifraQuickWidgetProvider.kt"),
        kotlinSource.replaceAll("__PACKAGE__", packageName)
      );

      for (const folder of ["drawable", "layout", "values", "xml"]) {
        const from = path.join(sourceRoot, "res", folder);
        const to = path.join(platformProjectRoot, "app", "src", "main", "res", folder);
        fs.mkdirSync(to, { recursive: true });
        for (const filename of fs.readdirSync(from)) {
          fs.copyFileSync(path.join(from, filename), path.join(to, filename));
        }
      }
      return modConfig;
    }
  ]);
}

module.exports = function withCifraQuickWidget(config) {
  config = withWidgetReceiver(config);
  config = withWidgetFiles(config);
  return config;
};
