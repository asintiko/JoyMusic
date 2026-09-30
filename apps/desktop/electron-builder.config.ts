import type { Configuration } from "electron-builder";

const owner = process.env.JOYMUSIC_RELEASE_OWNER ?? "asintiko";
const repo = process.env.JOYMUSIC_RELEASE_REPO ?? "JoyMusic";
const icons = "../../packages/brand/assets/icons";

const config: Configuration = {
  appId: "uz.joymusic.desktop",
  productName: "Joy Music",
  copyright: "Joy Music",
  executableName: "Joy Music",
  directories: { output: "release", buildResources: "build" },
  files: ["out/**/*", "package.json"],
  asar: true,
  npmRebuild: false,
  artifactName: "JoyMusic-${version}-${os}-${arch}.${ext}",
  protocols: [{ name: "Joy Music", schemes: ["joymusic"] }],
  publish: [{ provider: "github", owner, repo, releaseType: "release" }],
  afterSign: "build/notarize.mjs",
  mac: {
    category: "public.app-category.music",
    icon: `${icons}/icon.icns`,
    target: [
      { target: "dmg", arch: ["arm64", "x64"] },
      { target: "zip", arch: ["arm64", "x64"] },
    ],
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.inherit.plist",
  },
  dmg: {
    title: "Joy Music ${version}",
    icon: `${icons}/icon.icns`,
  },
  win: {
    icon: `${icons}/icon.ico`,
    target: [{ target: "nsis", arch: ["x64"] }],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    installerIcon: `${icons}/icon.ico`,
    uninstallerIcon: `${icons}/icon.ico`,
    shortcutName: "Joy Music",
  },
  linux: {
    icon: `${icons}/icon-1024.png`,
    target: [{ target: "dir" }],
    category: "AudioVideo",
  },
};

export default config;
