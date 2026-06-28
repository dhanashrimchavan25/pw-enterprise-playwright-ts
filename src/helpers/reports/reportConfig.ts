import type { ReporterDescription } from "@playwright/test";
import path from "node:path";

export type ReportType = "playwright" | "allure" | "executive" | "all";

const VALID: readonly ReportType[] = ["playwright", "allure", "executive", "all"];

export function getReportType(): ReportType {
  const value = (process.env.REPORT_TYPE || "playwright").toLowerCase();
  return VALID.includes(value as ReportType) ? (value as ReportType) : "playwright";
}

export function shouldUseAllure(type: ReportType = getReportType()): boolean {
  return type === "allure" || type === "all";
}

export function shouldUsePlaywrightHtml(type: ReportType = getReportType()): boolean {
  return type === "playwright" || type === "all";
}

export function shouldGenerateExecutive(type: ReportType = getReportType()): boolean {
  return type === "executive" || type === "all";
}

export function shouldGenerateAllureHtml(type: ReportType = getReportType()): boolean {
  return type === "allure" || type === "all";
}

export const reportPaths = {
  junit: "reports/junit/results.xml",
  playwrightHtml: "reports/playwright-report",
  allureResults: "reports/allure-results",
  allureHtml: "reports/allure-report",
  executiveHtml: "reports/executive-summary/index.html",
  stabilityHistory: "reports/stability/history.json",
  artifacts: "reports/test-artifacts",
} as const;

export function buildReporters(): ReporterDescription[] {
  const reportType = getReportType();
  const reporters: ReporterDescription[] = [["list"], ["junit", { outputFile: reportPaths.junit }]];

  if (shouldUsePlaywrightHtml(reportType)) {
    reporters.push(["html", { outputFolder: reportPaths.playwrightHtml, open: "never" }]);
  }

  if (shouldUseAllure(reportType)) {
    reporters.unshift([
      "allure-playwright",
      { resultsDir: reportPaths.allureResults, suiteTitle: false },
    ]);
  }

  if (shouldGenerateExecutive(reportType) || shouldGenerateAllureHtml(reportType)) {
    reporters.push([path.join(__dirname, "postRunReporter.ts")]);
  }

  return reporters;
}
