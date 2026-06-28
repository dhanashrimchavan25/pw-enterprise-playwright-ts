import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { TestInfo } from "@playwright/test";
import { descriptionHtml, epic, label, parentSuite, story, suite, tag } from "allure-js-commons";
import { appConfig } from "@helpers/ConfigManager";
import { logger } from "@helpers/Logger";
import { reportPaths, shouldUseAllure } from "@helpers/reports/reportConfig";
import {
  analyzeStability,
  loadStabilityHistory,
  type TestStability,
} from "@helpers/reports/stability";

// --- Java / CLI ---

const WINDOWS_JAVA_ROOTS = [
  "C:\\Program Files\\Microsoft",
  "C:\\Program Files\\Java",
  "C:\\Program Files\\Eclipse Adoptium",
  "C:\\Program Files\\Amazon Corretto",
] as const;

function hasJavaBin(javaHome: string): boolean {
  const javaBin = path.join(javaHome, "bin", process.platform === "win32" ? "java.exe" : "java");
  return fs.existsSync(javaBin);
}

function normalizeJavaHome(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/['"]/g, "").trim();
  if (!cleaned || cleaned.includes("1>&2") || cleaned.startsWith("=")) return undefined;
  return cleaned;
}

function discoverJavaHome(): string | undefined {
  for (const root of WINDOWS_JAVA_ROOTS) {
    if (!fs.existsSync(root)) continue;

    const entries = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    for (const entry of entries) {
      const candidate = path.join(root, entry.name);
      if (hasJavaBin(candidate)) return candidate;
    }
  }

  return undefined;
}

function resolveJavaHome(): string {
  const fromEnv = normalizeJavaHome(process.env.JAVA_HOME);
  if (fromEnv && hasJavaBin(fromEnv)) return fromEnv;

  const discovered = discoverJavaHome();
  if (discovered) return discovered;

  throw new Error(
    "Java not found. Install JDK 17+ (e.g. winget install Microsoft.OpenJDK.17) and restart the terminal.",
  );
}

function withJavaEnv(): NodeJS.ProcessEnv {
  const javaHome = resolveJavaHome();
  const javaBin = path.join(javaHome, "bin");

  return {
    ...process.env,
    JAVA_HOME: javaHome,
    Path: `${javaBin}${path.delimiter}${process.env.Path ?? ""}`,
  };
}

function getAllureCommand(args: string): string {
  const localBin = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "allure.cmd" : "allure",
  );

  if (fs.existsSync(localBin)) {
    return `"${localBin}" ${args}`;
  }

  return `npx --yes allure-commandline ${args}`;
}

function runAllureCli(args: string): void {
  const env = withJavaEnv();
  const command = getAllureCommand(args);

  logger.info(`Running Allure with JAVA_HOME=${env.JAVA_HOME}`);
  execSync(command, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
  });
}

export function generateAllureHtml(resultsDir: string, outputDir: string): void {
  runAllureCli(`generate ${resultsDir} -o ${outputDir} --clean`);
}

export function openAllureHtml(reportDir: string): void {
  runAllureCli(`open ${reportDir}`);
}

// --- Runtime labels (applied during tests) ---

/** Removes prior run artifacts so Allure shows only the current run (trend history is restored before generate). */
export function cleanAllureResults(): void {
  const dir = path.resolve(process.cwd(), reportPaths.allureResults);
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

function specFilePath(testInfo: TestInfo): string {
  return path.relative(process.cwd(), testInfo.file).replace(/\\/g, "/");
}

function specFileName(testInfo: TestInfo): string {
  return path.basename(testInfo.file);
}

function specFileFromTitlePath(titlePath?: string): string | undefined {
  const segment = titlePath
    ?.split(">")
    .map((part) => part.trim())
    .find((part) => /\.spec\.(ts|js|mjs|cjs)$/i.test(part));

  return segment ? path.basename(segment.replace(/\\/g, "/")) : undefined;
}

function specFilePathFromTitlePath(titlePath?: string): string | undefined {
  const segment = titlePath
    ?.split(">")
    .map((part) => part.trim())
    .find((part) => /\.spec\.(ts|js|mjs|cjs)$/i.test(part));

  return segment?.replace(/\\/g, "/");
}

/** Describe block title only — excludes project name and spec file path. */
function describeSuiteName(testInfo: TestInfo): string {
  const segments = testInfo.titlePath.filter(Boolean);
  for (let i = segments.length - 2; i >= 0; i--) {
    const segment = segments[i];
    if (segment === testInfo.project.name) continue;
    if (/\.spec\.(ts|js|mjs|cjs)$/i.test(segment)) continue;
    return segment;
  }
  return "General";
}

export async function applyAllureLabels(testInfo: TestInfo): Promise<void> {
  if (!shouldUseAllure()) return;

  const project = testInfo.project.name;
  const suiteName = describeSuiteName(testInfo);

  const fileName = specFileName(testInfo);
  const filePath = specFilePath(testInfo);

  await epic("Sauce Demo");
  await parentSuite(project === "api" ? "API Tests" : "E2E Tests");
  await suite(suiteName);
  await story(testInfo.title);
  await label("Spec file", fileName);
  await descriptionHtml(`<p><strong>Spec file:</strong> <code>${filePath}</code></p>`);

  const titlePath = testInfo.titlePath.join(" ");

  if (titlePath.includes("@smoke")) {
    await tag("smoke");
  }
  if (titlePath.includes("@regression")) {
    await tag("regression");
  }
  await tag(project);
}

// --- Post-run metadata & enrichment ---

type AllureLabel = { name: string; value: string };

type AllureResult = {
  uuid: string;
  name: string;
  labels?: AllureLabel[];
  descriptionHtml?: string;
};

function allureResultsDir(): string {
  return path.resolve(process.cwd(), reportPaths.allureResults);
}

function ensureResultsDir(): string {
  const dir = allureResultsDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function hasLabel(labels: AllureLabel[] | undefined, name: string, value: string): boolean {
  return (labels ?? []).some((label) => label.name === name && label.value === value);
}

function addLabel(labels: AllureLabel[] | undefined, name: string, value: string): AllureLabel[] {
  const next = [...(labels ?? [])];
  if (!hasLabel(next, name, value)) {
    next.push({ name, value });
  }
  return next;
}

function findStabilityForResult(resultName: string, tests: TestStability[]): TestStability | undefined {
  const normalized = resultName.trim().toLowerCase();

  return tests.find((test) => {
    const full = test.name.toLowerCase();
    const short = test.name.split(" › ").pop()?.toLowerCase() ?? full;
    return full === normalized || short === normalized || full.endsWith(` › ${normalized}`);
  });
}

function getStabilityEnvironmentLines(): string[] {
  const history = loadStabilityHistory();
  if (history.runs.length === 0) return [];

  const stability = analyzeStability(history);
  return [
    `Stability.Score=${stability.suiteStabilityScore.toFixed(1)}%`,
    `Flaky.Tests=${stability.flakyCount}`,
    `Stable.Tests=${stability.stableCount}`,
    `Runs.Analyzed=${stability.totalRuns}`,
    `Full.Dashboard=reports/executive-summary/index.html (use test:report:executive or test:report:all)`,
    `Flaky.Filter=Filter by tag flaky in Behaviors or Suites`,
  ];
}

function writeAllureEnvironment(): void {
  const dir = ensureResultsDir();
  const lines = [
    `Environment=${appConfig.env.toUpperCase()}`,
    `Base.URL=${appConfig.saucedemo.baseUrl}`,
    `Framework=Playwright Enterprise`,
    `Browser=Chromium (E2E project)`,
    `API.Project=api`,
    `E2E.Project=e2e`,
    `Node=${process.version}`,
    `Platform=${process.platform}`,
    `Report.Type=${process.env.REPORT_TYPE ?? "playwright"}`,
    ...getStabilityEnvironmentLines(),
  ];

  fs.writeFileSync(path.join(dir, "environment.properties"), `${lines.join("\n")}\n`, "utf-8");
}

function writeAllureExecutor(): void {
  const dir = ensureResultsDir();
  const isCi = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
  const buildNumber = process.env.GITHUB_RUN_NUMBER ?? "local";
  const repo = process.env.GITHUB_REPOSITORY;
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const runId = process.env.GITHUB_RUN_ID;

  const executor = isCi
    ? {
        name: "GitHub Actions",
        type: "github",
        url: repo ? `${server}/${repo}/actions` : server,
        buildOrder: buildNumber,
        buildName: `build #${buildNumber}`,
        buildUrl: repo && runId ? `${server}/${repo}/actions/runs/${runId}` : "",
        reportName: "Playwright Enterprise Framework",
      }
    : {
        name: "Local",
        type: "local",
        buildOrder: buildNumber,
        buildName: `local run (${new Date().toISOString().slice(0, 10)})`,
        reportName: "Playwright Enterprise Framework",
      };

  fs.writeFileSync(path.join(dir, "executor.json"), JSON.stringify(executor, null, 2), "utf-8");
}

function writeAllureCategories(): void {
  const dir = ensureResultsDir();
  const categories = [
    {
      name: "Product defects",
      matchedStatuses: ["failed"],
      messageRegex: ".*AssertionError.*|.*expect\\(.*",
    },
    {
      name: "Test defects",
      matchedStatuses: ["broken"],
    },
    {
      name: "Skipped tests",
      matchedStatuses: ["skipped"],
    },
  ];

  fs.writeFileSync(path.join(dir, "categories.json"), JSON.stringify(categories, null, 2), "utf-8");
}

function writeAllureMetadata(): void {
  writeAllureEnvironment();
  writeAllureExecutor();
  writeAllureCategories();
}

function removeStabilityPseudoTestArtifacts(): void {
  const dir = allureResultsDir();
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir)) {
    if (file.includes("stability-intelligence")) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

function enrichResultFile(filePath: string, tests: TestStability[]): void {
  const result = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AllureResult;

  const stability = findStabilityForResult(result.name, tests);
  if (!stability) return;

  result.labels = addLabel(result.labels, "tag", `stability-${Math.round(stability.stabilityScore)}pct`);
  if (stability.flaky) {
    result.labels = addLabel(result.labels, "tag", "flaky");
  }

  const trendNote = stability.flaky
    ? `<p><strong>Historically flaky</strong> — ${stability.stabilityScore.toFixed(1)}% stability across ${stability.totalRuns} runs (${stability.passed} passed, ${stability.failed} failed).</p>`
    : `<p><strong>Stable</strong> — ${stability.stabilityScore.toFixed(1)}% stability across ${stability.totalRuns} runs.</p>`;

  const existing = result.descriptionHtml ?? "";
  if (!existing.includes("stability across")) {
    result.descriptionHtml = `${trendNote}${existing}`;
  }

  fs.writeFileSync(filePath, JSON.stringify(result), "utf-8");
}

function enrichAllureWithStability(): void {
  const dir = allureResultsDir();
  if (!fs.existsSync(dir)) return;

  const history = loadStabilityHistory();
  if (history.runs.length === 0) return;

  const stability = analyzeStability(history);
  const allTests = [...stability.topUnstable];
  for (const test of stability.topFlaky) {
    if (!allTests.some((entry) => entry.key === test.key)) {
      allTests.push(test);
    }
  }

  removeStabilityPseudoTestArtifacts();

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith("-result.json")) continue;
    enrichResultFile(path.join(dir, file), allTests);
  }
}

function normalizeAllureSuiteLabels(): void {
  const dir = allureResultsDir();
  if (!fs.existsSync(dir)) return;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith("-result.json")) continue;

    const filePath = path.join(dir, file);
    const result = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AllureResult;
    const labels = result.labels ?? [];

    let suiteValue = labels.find((label) => label.name === "suite")?.value;
    const subSuiteValue = labels.find((label) => label.name === "subSuite")?.value;
    const titlePath = labels.find((label) => label.name === "titlePath")?.value;
    const specFile = specFileFromTitlePath(titlePath);
    const specPath = specFilePathFromTitlePath(titlePath);

    if (suiteValue?.includes(".spec.") && subSuiteValue) {
      suiteValue = subSuiteValue;
    } else if (suiteValue?.includes(".spec.")) {
      suiteValue = suiteValue.split(" › ").pop() ?? suiteValue;
    } else if (!suiteValue && subSuiteValue) {
      suiteValue = subSuiteValue;
    }

    const next = labels.filter(
      (label) => !["suite", "subSuite", "titlePath"].includes(label.name),
    );
    if (suiteValue) {
      next.push({ name: "suite", value: suiteValue });
    }
    if (specFile) {
      if (!hasLabel(next, "Spec file", specFile)) {
        next.push({ name: "Spec file", value: specFile });
      }
      const specNote = `<p><strong>Spec file:</strong> <code>${specPath ?? specFile}</code></p>`;
      const existing = result.descriptionHtml ?? "";
      if (!existing.includes("Spec file:")) {
        result.descriptionHtml = `${specNote}${existing}`;
      }
    }

    result.labels = next;
    fs.writeFileSync(filePath, JSON.stringify(result), "utf-8");
  }
}

function preserveAllureHistory(): void {
  const historySource = path.resolve(process.cwd(), reportPaths.allureHtml, "history");
  const historyTarget = path.resolve(process.cwd(), reportPaths.allureResults, "history");

  if (!fs.existsSync(historySource)) return;

  fs.mkdirSync(historyTarget, { recursive: true });
  fs.cpSync(historySource, historyTarget, { recursive: true });
}

export function finalizeAllureReport(): void {
  normalizeAllureSuiteLabels();
  enrichAllureWithStability();
  writeAllureMetadata();
  preserveAllureHistory();
  generateAllureHtml(reportPaths.allureResults, reportPaths.allureHtml);
}
