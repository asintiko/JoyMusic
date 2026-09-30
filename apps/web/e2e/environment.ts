const apiPort = Number(process.env.E2E_API_PORT ?? 4410);
const webPort = Number(process.env.E2E_WEB_PORT ?? 3100);
const database = process.env.E2E_DATABASE ?? "joymusic_web_e2e";
const postgresPort = process.env.JOYMUSIC_TEST_PG_PORT ?? "54329";
const redisPort = process.env.JOYMUSIC_TEST_REDIS_PORT ?? "6390";

export interface E2eEnvironment {
  apiPort: number;
  webPort: number;
  apiUrl: string;
  webUrl: string;
  database: string;
  databaseUrl: string;
  redisUrl: string;
  api: Record<string, string>;
  web: Record<string, string>;
}

export function e2eEnvironment(): E2eEnvironment {
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}`;
  const databaseUrl = `postgres://joymusic:joymusic@127.0.0.1:${postgresPort}/${database}`;
  const redisUrl = `redis://127.0.0.1:${redisPort}`;
  return {
    apiPort,
    webPort,
    apiUrl,
    webUrl,
    database,
    databaseUrl,
    redisUrl,
    api: {
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: String(apiPort),
      DATABASE_URL: databaseUrl,
      REDIS_URL: redisUrl,
      JWT_SECRET: "web-e2e-secret-web-e2e-secret-web-e2e",
      PUBLIC_WEB_URL: webUrl,
      CORS_ORIGINS: `${webUrl},http://localhost:${webPort}`,
      MIGRATE_ON_START: "false",
      JOBS_ENABLED: "false",
      LOG_LEVEL: "warn",
      RATE_LIMIT_NAMESPACE: `web-e2e-${Date.now()}`,
      RATE_LIMIT_MAX: "5000",
      RATE_LIMIT_REQUEST_MAX: "500",
      SEED_PASSWORD: "joymusic-demo",
    },
    web: {
      NEXT_PUBLIC_API_URL: apiUrl,
      API_URL: apiUrl,
      NEXT_PUBLIC_SITE_URL: "",
      NEXT_DIST_DIR: "dist/next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  };
}
