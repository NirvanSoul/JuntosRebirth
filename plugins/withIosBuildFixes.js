const { withDangerousMod } = require('expo/config-plugins');
const {
  withBuildSourceFile,
} = require('@expo/config-plugins/build/ios/XcodeProjectFile');
const fs = require('fs');
const path = require('path');

const deploymentTarget = '16.4';

const sceneDelegateSource = `internal import Expo
import React
import ReactAppDependencyProvider

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  private var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }

    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: nil)
  }
}
`;

function patchPodfile(contents) {
  if (contents.includes('Juntoss: compatibilidad con Xcode 27')) {
    return contents;
  }

  const postInstallFix = `

    # Juntoss: compatibilidad con Xcode 27.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_configuration|
        build_configuration.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
      end

      if target.name == 'EXConstants'
        target.shell_script_build_phases.each do |build_phase|
          next unless build_phase.name == '[CP-User] Generate app.config for prebuilt Constants.manifest'

          build_phase.shell_script = 'bash -l "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"'
        end
      end
    end`;

  return contents.replace(
    /    \)\n  end\nend\n?$/,
    `    )${postInstallFix}\n  end\nend\n`,
  );
}

function patchBundleScript(contents) {
  const generatedCommand =
    /`\\?"\$NODE_BINARY\\?" --print \\?"require\('path'\)\.dirname\(require\.resolve\('react-native\/package\.json'\)\) \+ '\/scripts\/react-native-xcode\.sh'\\?"`/;
  const safeCommand =
    'REACT_NATIVE_XCODE_SCRIPT=\\"$(\\"$NODE_BINARY\\" --print \\"require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'\\")\\"\\n\\"$REACT_NATIVE_XCODE_SCRIPT\\"';

  return contents.replace(generatedCommand, safeCommand);
}

function patchAppDelegate(contents) {
  return contents
    .replace(/^import Expo$/m, 'internal import Expo')
    .replace(/\n    bindReactNativeFactory\(factory\)/, '')
    .replace(
      /  var window: UIWindow\?\n\n  var reactNativeDelegate: ExpoReactNativeFactoryDelegate\?\n  var reactNativeFactory: RCTReactNativeFactory\?\n\n/,
      '',
    )
    .replace(
      /    let delegate = ReactNativeDelegate\(\)[\s\S]*?#endif\n\n/,
      '',
    );
}

module.exports = function withIosBuildFixes(config) {
  config = withBuildSourceFile(config, {
    filePath: 'SceneDelegate.swift',
    contents: sceneDelegateSource,
    overwrite: true,
  });

  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosDirectory = modConfig.modRequest.platformProjectRoot;
      const podfilePath = path.join(iosDirectory, 'Podfile');
      const appDelegatePath = path.join(
        iosDirectory,
        modConfig.modRequest.projectName,
        'AppDelegate.swift',
      );
      const projectPath = path.join(
        iosDirectory,
        `${modConfig.modRequest.projectName}.xcodeproj`,
        'project.pbxproj',
      );

      if (fs.existsSync(podfilePath)) {
        fs.writeFileSync(
          podfilePath,
          patchPodfile(fs.readFileSync(podfilePath, 'utf8')),
        );
      }
      if (fs.existsSync(appDelegatePath)) {
        fs.writeFileSync(
          appDelegatePath,
          patchAppDelegate(fs.readFileSync(appDelegatePath, 'utf8')),
        );
      }
      if (fs.existsSync(projectPath)) {
        fs.writeFileSync(
          projectPath,
          patchBundleScript(fs.readFileSync(projectPath, 'utf8')),
        );
      }

      return modConfig;
    },
  ]);
};
