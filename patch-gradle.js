const fs = require('fs');
const path = require('path');

const expoConstantsBuildGradle = path.join(
  __dirname,
  'node_modules',
  'expo-constants',
  'android',
  'build.gradle'
);
const expoModulesCorePlugin = path.join(
  __dirname,
  'node_modules',
  'expo-modules-core',
  'android',
  'ExpoModulesCorePlugin.gradle'
);

// Patch expo-constants build.gradle
if (fs.existsSync(expoConstantsBuildGradle)) {
  let content = fs.readFileSync(expoConstantsBuildGradle, 'utf8');
  content = content.replace(
    /useDefaultAndroidSdkVersions\(\)/g,
    `android {
        compileSdkVersion 33
        buildToolsVersion "33.0.0"
        defaultConfig {
            targetSdkVersion 33
            minSdkVersion 21
        }
    }`
  );
  fs.writeFileSync(expoConstantsBuildGradle, content, 'utf8');
  console.log('Patched expo-constants build.gradle');
}

// Patch expo-modules-core ExpoModulesCorePlugin.gradle
if (fs.existsSync(expoModulesCorePlugin)) {
  let content = fs.readFileSync(expoModulesCorePlugin, 'utf8');
  content = content.replace(
    /def releaseVariant = project\.components\.release/g,
    `def releaseVariant = project.components.find { it.name == 'release' } ?: project.components.find { it.name == 'debug' }`
  );
  fs.writeFileSync(expoModulesCorePlugin, content, 'utf8');
  console.log('Patched expo-modules-core ExpoModulesCorePlugin.gradle');
}