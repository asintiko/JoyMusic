import * as argon2 from "argon2";

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
  spendVerificationTime(plain: string): Promise<void>;
}

export type PasswordHashProfile = "standard" | "fast";

const profiles: Record<PasswordHashProfile, argon2.HashOptions> = {
  standard: { type: argon2.argon2id },
  fast: { type: argon2.argon2id, memoryCost: 4096, timeCost: 2, parallelism: 1 },
};

export function createPasswordHasher(profile: PasswordHashProfile = "standard"): PasswordHasher {
  const options = profiles[profile];
  const dummyHash = argon2.hash("joymusic-timing-equalizer", options);
  dummyHash.catch(() => undefined);
  return {
    hash: (plain) => argon2.hash(plain, options),
    async verify(hash, plain) {
      try {
        return await argon2.verify(hash, plain);
      } catch {
        return false;
      }
    },
    async spendVerificationTime(plain) {
      await argon2.verify(await dummyHash, plain).catch(() => false);
    },
  };
}
