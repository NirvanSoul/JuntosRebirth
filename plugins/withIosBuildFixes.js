const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const deploymentTarget = '16.4';

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
    "`\"$NODE_BINARY\" --print \"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\"`";
  const safeCommand =
    'REACT_NATIVE_XCODE_SCRIPT="$("$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'")"\\n"$REACT_NATIVE_XCODE_SCRIPT"';

  return contents.replace(generatedCommand, safeCommand);
}

function patchAppDelegate(contents) {
  if (contents.includes('bindReactNativeFactory(factory)')) {
    return contents;
  }

  return contents.replace(
    '    let factory = ExpoReactNativeFactory(delegate: delegate)',
    '    let factory = ExpoReactNativeFactory(delegate: delegate)\n    bindReactNativeFactory(factory)',
  );
}

module.exports = function withIosBuildFixes(config) {
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
        const appDelegate = fs
          .readFileSync(appDelegatePath, 'utf8')
          .replace('internal import Expo', 'import Expo');
        fs.writeFileSync(appDelegatePath, patchAppDelegate(appDelegate));
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
