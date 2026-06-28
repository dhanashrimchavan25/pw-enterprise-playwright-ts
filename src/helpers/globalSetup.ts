import type { FullConfig } from "@playwright/test";
import { appConfig } from "@helpers/ConfigManager";
import { logger } from "@helpers/Logger";
import { cleanAllureResults } from "@helpers/reports/allure";
import { reportPaths, shouldUseAllure } from "@helpers/reports/reportConfig";

async function globalSetup(_config: FullConfig): Promise<void> {
  void _config;
  process.env.__TEST_RUN_STARTED_AT = new Date().toISOString();

  if (shouldUseAllure()) {
    cleanAllureResults();
    logger.info(`Cleared stale Allure results: ${reportPaths.allureResults}`);
  }

  logger.info(`ENV=${appConfig.env} BASE_URL=${appConfig.saucedemo.baseUrl}`);
}

export default globalSetup;
