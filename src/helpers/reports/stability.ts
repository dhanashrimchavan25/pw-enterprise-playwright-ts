import fs from "node:fs";
import path from "node:path";
import { appConfig } from "@helpers/ConfigManager";
import { parseTestCases, testKey, type TestCase, type TestStatus } from "@helpers/reports/jUnit";
import { reportPaths } from "@helpers/reports/reportConfig";

// --- History storage ---

export type RunRecord = {
  id: string;
  timestamp: string;
  build: string;
  env: string;
  passRate: number;
  tests: Record<
    string,
    {
      name: string;
      classname: string;
      status: TestStatus;
      layer: "api" | "e2e";
      module: string;
    }
  >;
};

export type StabilityHistory = {
  maxRuns: number;
  runs: RunRecord[];
};

const MAX_RUNS = 30;

function historyPath(): string {
  return path.resolve(process.cwd(), reportPaths.stabilityHistory);
}

export function loadStabilityHistory(): StabilityHistory {
  const file = historyPath();
  if (!fs.existsSync(file)) {
    return { maxRuns: MAX_RUNS, runs: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as StabilityHistory;
    return { maxRuns: parsed.maxRuns ?? MAX_RUNS, runs: parsed.runs ?? [] };
  } catch {
    return { maxRuns: MAX_RUNS, runs: [] };
  }
}

function saveStabilityHistory(history: StabilityHistory): void {
  const file = historyPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(history, null, 2), "utf-8");
}

function casesToRunTests(cases: TestCase[]): RunRecord["tests"] {
  const tests: RunRecord["tests"] = {};
  for (const tc of cases) {
    const key = testKey(tc.classname, tc.name);
    tests[key] = {
      name: tc.name,
      classname: tc.classname,
      status: tc.status,
      layer: tc.layer,
      module: tc.module,
    };
  }
  return tests;
}

function runPassRate(tests: RunRecord["tests"]): number {
  const values = Object.values(tests);
  if (values.length === 0) return 0;
  const passed = values.filter((t) => t.status === "passed").length;
  return (passed / values.length) * 100;
}

function appendRunFromJUnit(options: {
  junitPath: string;
  build?: string;
  env?: string;
}): RunRecord {
  const xml = fs.readFileSync(path.resolve(process.cwd(), options.junitPath), "utf-8");
  const cases = parseTestCases(xml);
  const tests = casesToRunTests(cases);

  return {
    id: `run-${Date.now()}`,
    timestamp: new Date().toISOString(),
    build: options.build ?? process.env.GITHUB_RUN_NUMBER ?? "local",
    env: options.env ?? appConfig.env,
    passRate: runPassRate(tests),
    tests,
  };
}

export function recordTestRun(options?: { junitPath?: string; build?: string; env?: string }): RunRecord {
  const history = loadStabilityHistory();
  const run = appendRunFromJUnit({
    junitPath: options?.junitPath ?? reportPaths.junit,
    build: options?.build,
    env: options?.env,
  });

  history.runs.push(run);
  if (history.runs.length > history.maxRuns) {
    history.runs = history.runs.slice(-history.maxRuns);
  }

  saveStabilityHistory(history);
  return run;
}

// --- Flaky analytics ---

export type TestTrend = "improving" | "degrading" | "stable" | "flaky";

export type TestStability = {
  key: string;
  name: string;
  layer: "api" | "e2e";
  module: string;
  totalRuns: number;
  passed: number;
  failed: number;
  skipped: number;
  stabilityScore: number;
  flaky: boolean;
  trend: TestTrend;
  lastStatus: "passed" | "failed" | "skipped";
};

export type StabilitySummary = {
  suiteStabilityScore: number;
  flakyCount: number;
  alwaysFailingCount: number;
  stableCount: number;
  totalRuns: number;
  recentPassRates: { timestamp: string; passRate: number; build: string }[];
  topFlaky: TestStability[];
  topUnstable: TestStability[];
  retryConfigured: boolean;
};

function computeTrend(outcomes: ("passed" | "failed" | "skipped")[]): TestTrend {
  if (outcomes.length < 4) return "stable";

  const hasPass = outcomes.some((o) => o === "passed");
  const hasFail = outcomes.some((o) => o === "failed");
  if (hasPass && hasFail) return "flaky";

  const mid = Math.floor(outcomes.length / 2);
  const earlier = outcomes.slice(0, mid).filter((o) => o !== "skipped");
  const later = outcomes.slice(mid).filter((o) => o !== "skipped");

  if (earlier.length === 0 || later.length === 0) return "stable";

  const earlierRate = earlier.filter((o) => o === "passed").length / earlier.length;
  const laterRate = later.filter((o) => o === "passed").length / later.length;

  if (laterRate - earlierRate >= 0.15) return "improving";
  if (earlierRate - laterRate >= 0.15) return "degrading";
  return "stable";
}

export function analyzeStability(history: StabilityHistory): StabilitySummary {
  const runs = history.runs;
  const testMap = new Map<string, TestStability>();

  for (const run of runs) {
    for (const [key, test] of Object.entries(run.tests)) {
      const current = testMap.get(key) ?? {
        key,
        name: test.name,
        layer: test.layer,
        module: test.module,
        totalRuns: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        stabilityScore: 100,
        flaky: false,
        trend: "stable" as TestTrend,
        lastStatus: test.status,
      };

      current.totalRuns += 1;
      if (test.status === "passed") current.passed += 1;
      else if (test.status === "failed") current.failed += 1;
      else current.skipped += 1;
      current.lastStatus = test.status;

      testMap.set(key, current);
    }
  }

  const allTests = [...testMap.values()].map((test) => {
    const executed = test.passed + test.failed;
    const stabilityScore = executed > 0 ? (test.passed / executed) * 100 : 100;
    const flaky = test.passed > 0 && test.failed > 0;

    const outcomes: ("passed" | "failed" | "skipped")[] = [];
    for (const run of runs) {
      const result = run.tests[test.key];
      if (result) outcomes.push(result.status);
    }

    return {
      ...test,
      stabilityScore,
      flaky,
      trend: flaky ? ("flaky" as TestTrend) : computeTrend(outcomes),
    };
  });

  const executedTests = allTests.filter((t) => t.passed + t.failed > 0);
  const suiteStabilityScore =
    executedTests.length > 0
      ? executedTests.reduce((sum, t) => sum + t.stabilityScore, 0) / executedTests.length
      : 100;

  const flakyTests = allTests.filter((t) => t.flaky);
  const alwaysFailing = allTests.filter((t) => t.failed > 0 && t.passed === 0);
  const stableTests = allTests.filter((t) => !t.flaky && t.failed === 0);

  const topFlaky = [...flakyTests]
    .sort((a, b) => a.stabilityScore - b.stabilityScore || b.failed - a.failed)
    .slice(0, 5);

  const topUnstable = [...allTests]
    .filter((t) => t.totalRuns > 0)
    .sort((a, b) => a.stabilityScore - b.stabilityScore || b.failed - a.failed)
    .slice(0, 5);

  const recentPassRates = runs.slice(-10).map((run) => ({
    timestamp: run.timestamp,
    passRate: run.passRate,
    build: run.build,
  }));

  const retryConfigured =
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.TF_BUILD === "True" ||
    process.env.CI === "true";

  return {
    suiteStabilityScore,
    flakyCount: flakyTests.length,
    alwaysFailingCount: alwaysFailing.length,
    stableCount: stableTests.length,
    totalRuns: runs.length,
    recentPassRates,
    topFlaky,
    topUnstable,
    retryConfigured,
  };
}

export function formatShortTestName(name: string): string {
  const parts = name.split(" › ");
  return parts.length > 1 ? parts.slice(-2).join(" › ") : name;
}

// --- Executive HTML rendering ---

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stabilityStyles(): string {
  return `
    .trend-chart { display: flex; align-items: flex-end; gap: 8px; min-height: 120px; padding-top: 8px; }
    .bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 36px; }
    .bar { width: 100%; max-width: 40px; background: #2563eb; border-radius: 4px 4px 0 0; min-height: 4px; }
    .bar-wrap span { font-size: 0.7rem; color: #64748b; text-align: center; word-break: break-all; }
  `;
}

function trendLabel(trend: TestStability["trend"]): string {
  if (trend === "flaky") return "Flaky";
  if (trend === "improving") return "Improving";
  if (trend === "degrading") return "Degrading";
  return "Stable";
}

function trendClass(trend: TestStability["trend"]): string {
  if (trend === "flaky" || trend === "degrading") return "fail";
  if (trend === "improving") return "pass";
  return "";
}

function renderTrendChart(recentPassRates: StabilitySummary["recentPassRates"]): string {
  if (recentPassRates.length === 0) {
    return '<p class="muted">Run tests multiple times to build pass-rate trend.</p>';
  }

  return `<div class="trend-chart">${recentPassRates
    .map((point) => {
      const height = Math.max(4, Math.round(point.passRate));
      const label = new Date(point.timestamp).toLocaleDateString();
      return `<div class="bar-wrap" title="${escapeHtml(label)} — ${point.passRate.toFixed(0)}%">
        <div class="bar" style="height:${height}%"></div>
        <span>${escapeHtml(point.build)}</span>
      </div>`;
    })
    .join("\n")}</div>`;
}

function renderFlakyRows(tests: TestStability[], runsAnalyzed: number): string {
  if (tests.length === 0) {
    return `<tr><td colspan="5" class="muted">No flaky tests detected across ${runsAnalyzed} runs.</td></tr>`;
  }

  return tests
    .map((test) => {
      const shortName = formatShortTestName(test.name);
      return `<tr>
        <td>${escapeHtml(shortName)}</td>
        <td>${escapeHtml(test.layer.toUpperCase())}</td>
        <td>${test.stabilityScore.toFixed(1)}%</td>
        <td>${test.passed}/${test.passed + test.failed}</td>
        <td class="${trendClass(test.trend)}">${trendLabel(test.trend)}</td>
      </tr>`;
    })
    .join("\n");
}

export function renderStabilitySection(
  stability: StabilitySummary,
  options?: { heading?: string },
): string {
  const heading = options?.heading ?? "Test Stability Intelligence";
  const tests = stability.topFlaky.length > 0 ? stability.topFlaky : stability.topUnstable;

  return `
    <h2>${escapeHtml(heading)}</h2>
    <div class="stats">
      <div class="stat"><span>Stability Score</span><strong>${stability.suiteStabilityScore.toFixed(1)}%</strong></div>
      <div class="stat"><span>Flaky Tests</span><strong class="${stability.flakyCount > 0 ? "fail" : "pass"}">${stability.flakyCount}</strong></div>
      <div class="stat"><span>Stable Tests</span><strong class="pass">${stability.stableCount}</strong></div>
      <div class="stat"><span>Runs Analyzed</span><strong>${stability.totalRuns}</strong></div>
    </div>
    <p class="muted">${escapeHtml(
      stability.retryConfigured
        ? "CI retries enabled (1 retry) — flaky signals may be partially masked."
        : "Local runs use 0 retries — failures reflect first attempt.",
    )}</p>
    <h3 style="margin-top:20px;font-size:1rem;">Pass rate trend (last ${stability.recentPassRates.length} runs)</h3>
    ${renderTrendChart(stability.recentPassRates)}
    <h3 style="margin-top:20px;font-size:1rem;">Top unstable tests</h3>
    <table>
      <tr><th>Test</th><th>Layer</th><th>Stability</th><th>Pass/Run</th><th>Trend</th></tr>
      ${renderFlakyRows(tests, stability.totalRuns)}
    </table>
  `;
}
