import fs from "node:fs";
import path from "node:path";
import { reportPaths } from "@helpers/reports/reportConfig";

const ROOT = process.cwd();

function removePath(relativePath: string): void {
  const target = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`Removed: ${relativePath}`);
}

function resetStabilityHistory(): void {
  const file = path.resolve(ROOT, reportPaths.stabilityHistory);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ maxRuns: 30, runs: [] }, null, 2), "utf-8");
  console.log(`Reset: ${reportPaths.stabilityHistory}`);
}

console.log("Cleaning all report outputs and history...\n");

removePath(reportPaths.playwrightHtml);
removePath(reportPaths.allureResults);
removePath(reportPaths.allureHtml);
removePath(path.dirname(reportPaths.executiveHtml));
removePath(path.dirname(reportPaths.junit));
removePath(reportPaths.artifacts);
removePath(path.join(path.dirname(reportPaths.stabilityHistory), "shopping-cart.flaky"));

resetStabilityHistory();

console.log("\nDone. Run npm run test:report:all for a fresh baseline.");
