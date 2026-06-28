import { loadEnv } from "@helpers/Environment";

loadEnv();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

/**
 * Central configuration — single source of truth for URLs, credentials, and toggles.
 */
export const appConfig = {
  env: (process.env.ENV || "qa") as "dev" | "qa" | "staging" | "prod",

  saucedemo: {
    baseUrl: required("SAUCEDEMO_BASE_URL"),
    users: {
      standard: required("SAUCEDEMO_STANDARD_USER"),
      lockedOut: required("SAUCEDEMO_LOCKED_OUT_USER"),
      password: required("SAUCEDEMO_PASSWORD"),
    },
  },

  auth: {
    storageStatePath: optional("STORAGE_STATE_PATH", "storage/auth.json"),
  },

  logging: {
    level: optional("LOG_LEVEL", "info").toLowerCase(),
    verbose: optional("VERBOSE_LOGGING", "false").toLowerCase() === "true",
  },
} as const;

export type AppConfig = typeof appConfig;
