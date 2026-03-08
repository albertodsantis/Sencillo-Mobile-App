# Android Setup For VS Code

Current machine status:
- `msjsdiag.vscode-react-native` is installed
- `expo.vscode-expo-tools` is installed
- `diemasmichiels.emulate` is installed
- Android SDK tools are not installed or not on `PATH`

## What still needs to be installed

Install Android Studio on Windows. During setup, include:
- Android SDK
- Android SDK Platform-Tools
- Android Emulator
- At least one Android Virtual Device (AVD)

Typical SDK path:
- `%LOCALAPPDATA%\\Android\\Sdk`

## PATH entries

After Android Studio is installed, add these directories to `PATH`:

```powershell
%LOCALAPPDATA%\Android\Sdk\platform-tools
%LOCALAPPDATA%\Android\Sdk\emulator
```

Then restart VS Code.

## Working from this repo

Useful VS Code tasks:
- `Tasks: Run Task` -> `Expo: Start`
- `Tasks: Run Task` -> `Expo: Web`
- `Tasks: Run Task` -> `Expo: Android`

Useful VS Code commands:
- `React Native: Start Packager`
- `React Native: Run Android on device/emulator`
- `Android Emulator: Start Emulator`

## Verification

These commands should work once Android Studio is installed and `PATH` is correct:

```powershell
adb devices
emulator -list-avds
```
