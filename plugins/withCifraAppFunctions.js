const fs = require("fs");
const path = require("path");
const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
} = require("@expo/config-plugins");

const KSP_VERSION = "2.3.7";
const APP_FUNCTIONS_VERSION = "1.0.0";
const SERVICE_SUFFIX = ".widgets.CifraWealthAppFunctionService";

function withKspClasspath(config) {
  return withProjectBuildGradle(config, (modConfig) => {
    const contents = modConfig.modResults.contents;
    const dependency = `classpath("com.google.devtools.ksp:symbol-processing-gradle-plugin:${KSP_VERSION}")`;

    if (!contents.includes("com.google.devtools.ksp:symbol-processing-gradle-plugin")) {
      const dependenciesBlock = /dependencies\s*\{/;
      if (!dependenciesBlock.test(contents)) {
        throw new Error("CifraWealth AppFunctions could not find the root Gradle dependencies block.");
      }
      modConfig.modResults.contents = contents.replace(
        dependenciesBlock,
        `dependencies {\n    ${dependency}`
      );
    }
    return modConfig;
  });
}

function withAppFunctionDependencies(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    if (!contents.includes('apply plugin: "com.google.devtools.ksp"')) {
      const kotlinPlugin = 'apply plugin: "org.jetbrains.kotlin.android"';
      if (!contents.includes(kotlinPlugin)) {
        throw new Error("CifraWealth AppFunctions could not find the Kotlin Android plugin declaration.");
      }
      contents = contents.replace(
        kotlinPlugin,
        `${kotlinPlugin}\napply plugin: "com.google.devtools.ksp"`
      );
    }

    if (!contents.includes("androidx.appfunctions:appfunctions:")) {
      const dependenciesBlock = /dependencies\s*\{/;
      if (!dependenciesBlock.test(contents)) {
        throw new Error("CifraWealth AppFunctions could not find the app Gradle dependencies block.");
      }
      contents = contents.replace(
        dependenciesBlock,
        `dependencies {\n    implementation("androidx.appfunctions:appfunctions:${APP_FUNCTIONS_VERSION}")\n    ksp("androidx.appfunctions:appfunctions-compiler:${APP_FUNCTIONS_VERSION}")`
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

function withAppFunctionManifest(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const packageName = modConfig.android?.package;
    if (!packageName) {
      throw new Error("CifraWealth AppFunctions requires expo.android.package in app.json.");
    }

    manifest.$ ??= {};
    manifest.$["xmlns:tools"] ??= "http://schemas.android.com/tools";

    const application = manifest.application?.[0];
    if (!application) {
      throw new Error("CifraWealth AppFunctions could not find the Android application manifest entry.");
    }

    const serviceName = packageName + SERVICE_SUFFIX;
    application.service ??= [];
    if (!application.service.some((service) => service.$?.["android:name"] === serviceName)) {
      application.service.push({
        $: {
          "android:name": serviceName,
          "android:permission": "android.permission.BIND_APP_FUNCTION_SERVICE",
          "android:exported": "true",
          "tools:targetApi": "36",
        },
        property: [
          {
            $: {
              "android:name": "android.app.appfunctions.schema",
              "android:value": "app_functions_schema.xsd",
            },
          },
          {
            $: {
              "android:name": "android.app.appfunctions.v2",
              "android:value": "cifra_wealth_app_functions.xml",
            },
          },
        ],
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.app.appfunctions.AppFunctionService" } },
            ],
          },
        ],
      });
    }

    application.property ??= [];
    if (!application.property.some((item) => item.$?.["android:name"] === "android.app.appfunctions.app_metadata")) {
      application.property.push({
        $: {
          "android:name": "android.app.appfunctions.app_metadata",
          "android:resource": "@xml/app_metadata",
        },
      });
    }

    return modConfig;
  });
}

function withAppFunctionFiles(config) {
  return withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
      const packageName = modConfig.android?.package;
      if (!packageName) {
        throw new Error("CifraWealth AppFunctions requires expo.android.package in app.json.");
      }

      const sourceRoot = path.join(projectRoot, "integrations", "android", "appfunctions");
      const packagePath = packageName.replaceAll(".", "/");
      const kotlinTarget = path.join(
        platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        packagePath,
        "widgets"
      );
      const xmlTarget = path.join(platformProjectRoot, "app", "src", "main", "res", "xml");

      fs.mkdirSync(kotlinTarget, { recursive: true });
      fs.mkdirSync(xmlTarget, { recursive: true });

      const kotlinSource = fs.readFileSync(
        path.join(sourceRoot, "CifraWealthAppFunctionService.kt"),
        "utf8"
      );
      fs.writeFileSync(
        path.join(kotlinTarget, "CifraWealthAppFunctionService.kt"),
        kotlinSource.replaceAll("__PACKAGE__", packageName + ".widgets")
      );

      fs.copyFileSync(
        path.join(sourceRoot, "app_metadata.xml"),
        path.join(xmlTarget, "app_metadata.xml")
      );

      return modConfig;
    },
  ]);
}

module.exports = function withCifraAppFunctions(config) {
  config = withKspClasspath(config);
  config = withAppFunctionDependencies(config);
  config = withAppFunctionManifest(config);
  config = withAppFunctionFiles(config);
  return config;
};
