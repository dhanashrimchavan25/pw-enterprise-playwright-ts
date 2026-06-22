import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type EnvName = "dev" | "qa" | "staging" | "prod";

const VALID_ENVS: readonly EnvName[] = ["dev", "qa", "staging", "prod"];

export function isEnvName(value: string | undefined): value is EnvName {
  return VALID_ENVS.includes(value as EnvName);
}

/**
 * Loads environment-specific configuration from `.env.<ENV>`.
 * Local overrides via root `.env` are applied last.
 */
export function loadEnv(): EnvName {
  const envFromProcess = process.env.ENV;
  const env: EnvName = isEnvName(envFromProcess) ? envFromProcess : "qa";

  const envFile = path.resolve(process.cwd(), `.env.${env}`);
  const defaultEnvFile = path.resolve(process.cwd(), ".env");

  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
  if (fs.existsSync(defaultEnvFile)) {
    dotenv.config({ path: defaultEnvFile, override: true });
  }

  process.env.ENV = env;
  return env;
}
