export function missingSecrets(env: Record<string, string | undefined>): string[];

export default function notarizeApp(context: {
  electronPlatformName: string;
  appOutDir?: string;
  packager?: { appInfo: { productFilename: string } };
}): Promise<void>;
