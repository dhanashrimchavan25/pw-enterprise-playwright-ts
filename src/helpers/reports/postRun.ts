import fs from "node:fs";
import path from "node:path";
import { logger } from "@helpers/Logger";
import { finalizeAllureReport } from "@helpers/reports/allure";
import { generateExecutiveSummary } from "@helpers/reports/executiveSummary";
import { parseTestCases } from "@helpers/reports/jUnit";
import {
  getReportType,
  reportPaths,
  shouldGenerateAllureHtml,
  shouldGenerateExecutive,
} from "@helpers/reports/reportConfig";
import { recordTestRun } from "@helpers/reports/stability";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits until JUnit is flushed and stable before reading results. */
async function waitForJUnitReport(
  junitPath: string,
  options?: { stableMs?: number; timeoutMs?: number; pollMs?: number },
): Promise<void> {
  const resolved = path.resolve(process.cwd(), junitPath);
  const stableMs = options?.stableMs ?? 300;
  const timeoutMs = options?.timeoutMs ?? 5_000;
  const pollMs = options?.pollMs ?? 100;
  const deadline = Date.now() + timeoutMs;

  let lastContent = "";
  let lastChange = Date.now();

  while (Date.now() < deadline) {
    if (!fs.existsSync(resolved)) {
      await sleep(pollMs);
      continue;
    }

    const content = fs.readFileSync(resolved, "utf-8");
    if (content !== lastContent) {
      lastContent = content;
      lastChange = Date.now();
    } else if (Date.now() - lastChange >= stableMs) {
      const declaredTests = Number(/<testsuites[^>]*\btests="(\d+)"/.exec(content)?.[1] ?? 0);
      const declaredFailures = Number(
        /<testsuites[^>]*\bfailures="(\d+)"/.exec(content)?.[1] ?? -1,
      );
      const cases = parseTestCases(content);
      const parsedFailures = cases.filter((c) => c.status === "failed").length;
      const runStartedAt = process.env.__TEST_RUN_STARTED_AT;
      const suiteTimestamp = /<testsuite[^>]*\btimestamp="([^"]+)"/.exec(content)?.[1];
      const isCurrentRun =
        !runStartedAt ||
        !suiteTimestamp ||
        new Date(suiteTimestamp).getTime() >= new Date(runStartedAt).getTime() - 5_000;

      if (
        isCurrentRun &&
        declaredTests > 0 &&
        cases.length === declaredTests &&
        declaredFailures >= 0 &&
        parsedFailures === declaredFailures
      ) {
        return;
      }
    }

    await sleep(pollMs);
  }
}

/** Runs after all tests — executive summary, stability history, and Allure HTML. */
export async function generatePostRunReports(): Promise<void> {
  const reportType = getReportType();
  const needsPostRun =
    shouldGenerateExecutive(reportType) || shouldGenerateAllureHtml(reportType);
  if (!needsPostRun) return;

  logger.info(`Generating post-run reports for REPORT_TYPE=${reportType}`);

  const junitPath = path.resolve(process.cwd(), reportPaths.junit);
  try {
    await waitForJUnitReport(reportPaths.junit);
  } catch (error) {
    logger.warn(`JUnit wait skipped: ${(error as Error).message}`);
  }

  if (fs.existsSync(junitPath)) {
    try {
      recordTestRun({
        build: process.env.GITHUB_RUN_NUMBER,
        junitPath: reportPaths.junit,
      });
    } catch (error) {
      logger.warn(`Stability history skipped: ${(error as Error).message}`);
    }
  }

  if (shouldGenerateExecutive(reportType)) {
    try {
      const output = generateExecutiveSummary({
        buildNumber: process.env.GITHUB_RUN_NUMBER,
      });
      logger.info(`Executive summary: ${output}`);
    } catch (error) {
      logger.warn(`Executive summary skipped: ${(error as Error).message}`);
    }
  }

  if (shouldGenerateAllureHtml(reportType)) {
    try {
      finalizeAllureReport();
      logger.info(`Allure report: ${reportPaths.allureHtml}`);
    } catch (error) {
      logger.warn(`Allure HTML skipped: ${(error as Error).message}`);
    }
  }
}
