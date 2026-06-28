import fs from "node:fs";
import path from "node:path";
import { appConfig } from "@helpers/ConfigManager";
import { parseTestCases } from "@helpers/reports/jUnit";
import { reportPaths } from "@helpers/reports/reportConfig";
import {
  analyzeStability,
  escapeHtml,
  loadStabilityHistory,
  renderStabilitySection,
  stabilityStyles,
} from "@helpers/reports/stability";

type ModuleSummary = {
  name: string;
  passed: number;
  failed: number;
  total: number;
  status: "PASS" | "FAIL";
};

function summarizeModules(cases: ReturnType<typeof parseTestCases>): ModuleSummary[] {
  const map = new Map<string, ModuleSummary>();

  for (const tc of cases) {
    const current = map.get(tc.module) ?? {
      name: tc.module,
      passed: 0,
      failed: 0,
      total: 0,
      status: "PASS" as const,
    };

    current.total += 1;
    if (tc.status === "failed") {
      current.failed += 1;
      current.status = "FAIL";
    } else if (tc.status === "passed") {
      current.passed += 1;
    }

    map.set(tc.module, current);
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function getRecommendation(
  passRate: number,
  failed: number,
  stability: ReturnType<typeof analyzeStability>,
): string {
  if (failed === 0 && stability.flakyCount === 0) return "Ready for release review";
  if (failed === 0 && stability.flakyCount > 0) {
    return "Review flaky tests before release — intermittent failures detected";
  }
  if (passRate >= 95) return "Proceed with caution — review failures before release";
  return "Not recommended for release";
}

export function generateExecutiveSummary(options?: {
  junitPath?: string;
  outputPath?: string;
  buildNumber?: string;
}): string {
  const junitPath = path.resolve(process.cwd(), options?.junitPath ?? reportPaths.junit);
  const outputPath = path.resolve(process.cwd(), options?.outputPath ?? reportPaths.executiveHtml);

  if (!fs.existsSync(junitPath)) {
    throw new Error(`JUnit file not found: ${junitPath}. Run tests first.`);
  }

  const cases = parseTestCases(fs.readFileSync(junitPath, "utf-8"));
  const total = cases.length;
  const passed = cases.filter((c) => c.status === "passed").length;
  const failed = cases.filter((c) => c.status === "failed").length;
  const skipped = cases.filter((c) => c.status === "skipped").length;
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  const apiCases = cases.filter((c) => c.layer === "api");
  const e2eCases = cases.filter((c) => c.layer === "e2e");
  const modules = summarizeModules(cases);
  const build = options?.buildNumber ?? process.env.GITHUB_RUN_NUMBER ?? "local";
  const generatedAt = new Date().toISOString();

  const history = loadStabilityHistory();
  const stability = analyzeStability(history);
  const recommendation = getRecommendation(passRate, failed, stability);

  const moduleRows = modules
    .map(
      (m) =>
        `<tr><td>${escapeHtml(m.name)}</td><td class="${m.status === "PASS" ? "pass" : "fail"}">${m.status}</td><td>${m.passed}/${m.total}</td></tr>`,
    )
    .join("\n");

  const stabilitySection = renderStabilitySection(stability);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Executive Test Summary</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 32px; color: #1f2937; background: #f8fafc; }
    .card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    h1 { margin: 0 0 8px; font-size: 1.6rem; }
    h2 { margin: 0 0 12px; font-size: 1.1rem; }
    .meta { color: #64748b; margin-bottom: 16px; }
    .muted { color: #64748b; font-size: 0.92rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .stat { background: #f1f5f9; border-radius: 6px; padding: 12px; }
    .stat strong { display: block; font-size: 1.4rem; }
    .pass { color: #15803d; font-weight: 600; }
    .fail { color: #b91c1c; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; }
    .links a { margin-right: 16px; }
    .recommendation { font-size: 1.05rem; font-weight: 600; }
    ${stabilityStyles()}
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Regression Execution Summary</h1>
    <div class="meta">Environment: ${escapeHtml(appConfig.env.toUpperCase())} · Build: #${escapeHtml(build)} · Generated: ${escapeHtml(generatedAt)}</div>
    <div class="stats">
      <div class="stat"><span>Total</span><strong>${total}</strong></div>
      <div class="stat"><span>Passed</span><strong class="pass">${passed}</strong></div>
      <div class="stat"><span>Failed</span><strong class="fail">${failed}</strong></div>
      <div class="stat"><span>Skipped</span><strong>${skipped}</strong></div>
      <div class="stat"><span>Pass Rate</span><strong>${passRate.toFixed(1)}%</strong></div>
    </div>
  </div>

  <div class="card">
    ${stabilitySection}
  </div>

  <div class="card">
    <h2>By Layer (API + E2E)</h2>
    <table>
      <tr><th>Layer</th><th>Result</th></tr>
      <tr><td>API Tests</td><td>${apiCases.filter((c) => c.status === "passed").length}/${apiCases.length} passed</td></tr>
      <tr><td>E2E Tests</td><td>${e2eCases.filter((c) => c.status === "passed").length}/${e2eCases.length} passed</td></tr>
    </table>
  </div>

  <div class="card">
    <h2>By Module</h2>
    <table>
      <tr><th>Module</th><th>Status</th><th>Passed</th></tr>
      ${moduleRows}
    </table>
  </div>

  <div class="card">
    <h2>Recommendation</h2>
    <p class="recommendation">${escapeHtml(recommendation)}</p>
    ${stability.flakyCount > 0 ? `<p><span class="badge">${stability.flakyCount} flaky test(s)</span> — prioritize before release.</p>` : ""}
    <div class="links">
      <p>Open Allure via local server (do not open HTML file directly):</p>
      <code>npm run report:allure</code>
      <br /><br />
      <a href="../playwright-report/index.html">Playwright Report (use npm run report)</a>
    </div>
  </div>
</body>
</html>`;

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf-8");
  return outputPath;
}
