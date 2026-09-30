import { join } from "node:path";

const required = ["APPLE_ID", "APPLE_APP_SPECIFIC_PASSWORD", "APPLE_TEAM_ID"];

export function missingSecrets(env) {
  return required.filter((name) => !env[name]);
}

export default async function notarizeApp(context) {
  if (context.electronPlatformName !== "darwin") return;
  const missing = missingSecrets(process.env);
  if (missing.length > 0) {
    process.stdout.write(`Skipping notarization, missing: ${missing.join(", ")}\n`);
    return;
  }
  const { notarize } = await import("@electron/notarize");
  const appName = context.packager.appInfo.productFilename;
  await notarize({
    appPath: join(context.appOutDir, `${appName}.app`),
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
}
