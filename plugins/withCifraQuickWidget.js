const fs = require("fs");
const path = require("path");
const { withAndroidManifest, withDangerousMod, withAppBuildGradle } = require("@expo/config-plugins");

const RECEIVER_NAME_SUFFIX = ".widgets.CifraQuickWidgetProvider";

function withWidgetReceiver(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const packageName = modConfig.android?.package;
    if (!packageName) throw new Error("CifraQuickWidget requires expo.android.package in app.json.");

    const application = manifest.application?.[0];
    if (!application) throw new Error("CifraQuickWidget could not find the Android application manifest entry.");

    application.receiver ??= [];
    const receiverName = packageName + RECEIVER_NAME_SUFFIX;
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

    const quickReceiverName = packageName + ".widgets.QuickFavoriteReceiver";
    if (!application.receiver.some((receiver) => receiver.$?.["android:name"] === quickReceiverName)) {
      application.receiver.push({
        $: {
          "android:name": quickReceiverName,
          "android:enabled": "true",
          "android:exported": "false"
        }
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

function withWorkManagerDependency(config) {
  return withAppBuildGradle(config, (modConfig) => {
    const contents = modConfig.modResults.contents;
    if (!contents.includes("androidx.work:work-runtime-ktx")) {
      const dependencyBlock = /dependencies\\s*\\{/;
      if (!dependencyBlock.test(contents)) {
        throw new Error("CifraQuickWidget could not find the app Gradle dependencies block.");
      }
      modConfig.modResults.contents = contents.replace(
        dependencyBlock,
        `dependencies {\\n    implementation "androidx.work:work-runtime-ktx:2.12.0"`
      );
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
      const javaPackagePath = packageName.replaceAll(".", "/");
      const kotlinTarget = path.join(
        platformProjectRoot, "app", "src", "main", "java", javaPackagePath, "widgets"
      );

      fs.mkdirSync(kotlinTarget, { recursive: true });
      const kotlinSourceDir = path.join(sourceRoot, "kotlin");
      for (const filename of fs.readdirSync(kotlinSourceDir).filter((name) => name.endsWith(".kt"))) {
        const kotlinSource = fs.readFileSync(path.join(kotlinSourceDir, filename), "utf8");
        fs.writeFileSync(
          path.join(kotlinTarget, filename),
          kotlinSource.replaceAll("__PACKAGE__", packageName)
        );
      }

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
  config = withWorkManagerDependency(config);
  config = withWidgetFiles(config);
  return config;
};
