import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional());

const flag = z.preprocess(
  (value) =>
    typeof value === "string"
      ? ["1", "true", "yes", "on"].includes(value.trim().toLowerCase())
      : value,
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
  RATE_LIMIT_SEARCH_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_REQUEST_MAX: z.coerce.number().int().positive().default(30),
  WS_MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(40),
  WS_MAX_MESSAGE_BYTES: z.coerce.number().int().min(64).max(65536).default(2048),
  WS_HEARTBEAT_SECONDS: z.coerce.number().int().positive().default(30),
  WS_MAX_BUFFERED_BYTES: z.coerce.number().int().positive().default(1_048_576),
  JOBS_ENABLED: flag.optional(),
  JOBS_INTERVAL_SECONDS: z.coerce.number().int().positive().default(60),
  REQUEST_EXPIRY_MINUTES: z.coerce.number().int().positive().default(45),
  SESSION_IDLE_HOURS: z.coerce.number().int().positive().default(18),
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
    searchMax: number;
    requestMax: number;
    namespace: string;
  };
  realtime: {
    maxConnectionsPerIp: number;
    maxMessageBytes: number;
    heartbeatMs: number;
    maxBufferedBytes: number;
  };
  jobs: {
    enabled: boolean;
    intervalMs: number;
    requestExpiryMs: number;
    sessionIdleMs: number;
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
      searchMax: values.RATE_LIMIT_SEARCH_MAX,
      requestMax: values.RATE_LIMIT_REQUEST_MAX,
      namespace: values.RATE_LIMIT_NAMESPACE,
    },
    realtime: {
      maxConnectionsPerIp: values.WS_MAX_CONNECTIONS_PER_IP,
      maxMessageBytes: values.WS_MAX_MESSAGE_BYTES,
      heartbeatMs: values.WS_HEARTBEAT_SECONDS * 1000,
      maxBufferedBytes: values.WS_MAX_BUFFERED_BYTES,
    },
    jobs: {
      enabled: values.JOBS_ENABLED ?? values.NODE_ENV !== "test",
      intervalMs: values.JOBS_INTERVAL_SECONDS * 1000,
      requestExpiryMs: values.REQUEST_EXPIRY_MINUTES * 60_000,
      sessionIdleMs: values.SESSION_IDLE_HOURS * 3_600_000,
    },
    login: {
      maxFailures: values.LOGIN_MAX_FAILURES,
      lockoutSeconds: values.LOGIN_LOCKOUT_MINUTES * 60,
    },
  };
}
