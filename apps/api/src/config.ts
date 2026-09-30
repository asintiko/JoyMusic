import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

const flag = z.preprocess(
  (value) =>
    typeof value === "string" ? ["1", "true", "yes", "on"].includes(value.trim().toLowerCase()) : value,
  z.boolean(),
);

const commaSeparated = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );

const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().min(0).max(65535).default(4000),
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  REDIS_URL: optionalString,
  JWT_SECRET: z.string().min(32),
  PUBLIC_WEB_URL: z.url(),
  CORS_ORIGINS: commaSeparated,
  GOOGLE_CLIENT_ID: optionalString,
  MIGRATE_ON_START: flag.default(false),
  LOG_LEVEL: z.enum(logLevels).default("info"),
  TRUST_PROXY: flag.default(false),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_NAMESPACE: z.string().min(1).default("api"),
  LOGIN_MAX_FAILURES: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

export interface Config {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  isTest: boolean;
  host: string;
  port: number;
  databaseUrl: string;
  databasePoolMax: number;
  redisUrl: string | undefined;
  jwtSecret: string;
  publicWebUrl: string;
  corsOrigins: string[];
  googleClientId: string | undefined;
  migrateOnStart: boolean;
  logLevel: (typeof logLevels)[number];
  trustProxy: boolean;
  rateLimit: {
    globalMax: number;
    authMax: number;
    namespace: string;
  };
  login: {
    maxFailures: number;
    lockoutSeconds: number;
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const values = parsed.data;
  return {
    nodeEnv: values.NODE_ENV,
    isProduction: values.NODE_ENV === "production",
    isTest: values.NODE_ENV === "test",
    host: values.HOST,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    databasePoolMax: values.DATABASE_POOL_MAX,
    redisUrl: values.REDIS_URL,
    jwtSecret: values.JWT_SECRET,
    publicWebUrl: values.PUBLIC_WEB_URL.replace(/\/+$/, ""),
    corsOrigins: values.CORS_ORIGINS,
    googleClientId: values.GOOGLE_CLIENT_ID,
    migrateOnStart: values.MIGRATE_ON_START,
    logLevel: values.LOG_LEVEL,
    trustProxy: values.TRUST_PROXY,
    rateLimit: {
      globalMax: values.RATE_LIMIT_MAX,
      authMax: values.RATE_LIMIT_AUTH_MAX,
      namespace: values.RATE_LIMIT_NAMESPACE,
    },
    login: {
      maxFailures: values.LOGIN_MAX_FAILURES,
      lockoutSeconds: values.LOGIN_LOCKOUT_MINUTES * 60,
    },
  };
}
