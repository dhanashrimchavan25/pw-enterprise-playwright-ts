import { finalizeAllureReport, openAllureHtml } from "@helpers/reports/allure";
import { reportPaths } from "@helpers/reports/reportConfig";

const action = process.argv[2];

if (action === "generate") {
  finalizeAllureReport();
} else if (action === "open") {
  openAllureHtml(reportPaths.allureHtml);
} else {
  console.error("Usage: npx tsx scripts/allure-cli.ts <generate|open>");
  process.exit(1);
}
