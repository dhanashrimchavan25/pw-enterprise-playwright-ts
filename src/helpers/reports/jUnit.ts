export type TestStatus = "passed" | "failed" | "skipped";

export type TestCase = {
  name: string;
  classname: string;
  status: TestStatus;
  layer: "api" | "e2e";
  module: string;
};

export function testKey(classname: string, name: string): string {
  return `${classname}::${name}`;
}

function inferLayer(classname: string, name: string): "api" | "e2e" {
  const text = `${classname} ${name}`.toLowerCase();
  if (text.includes("apitest") || text.includes("health.spec") || text.includes("saucedemo-health")) {
    return "api";
  }
  return "e2e";
}

function inferModule(classname: string, name: string): string {
  const text = `${classname} ${name}`.toLowerCase();
  if (text.includes("login")) return "Login";
  if (text.includes("shopping-cart") || text.includes("cart")) return "Shopping Cart";
  if (text.includes("inventory")) return "Inventory";
  if (text.includes("health") || text.includes("apitest")) return "API Health";
  return "General";
}

export function parseTestCases(xml: string): TestCase[] {
  const cases: TestCase[] = [];
  const pattern = /<testcase\b([^>]*)(?:\/>|>([\s\S]*?)<\/testcase>)/g;

  for (const match of xml.matchAll(pattern)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const name = /name="([^"]*)"/.exec(attrs)?.[1] ?? "Unknown";
    const classname = /classname="([^"]*)"/.exec(attrs)?.[1] ?? "";

    let status: TestStatus = "passed";
    if (/<failure\b/.test(body)) status = "failed";
    else if (/<skipped\b/.test(body)) status = "skipped";

    cases.push({
      name,
      classname,
      status,
      layer: inferLayer(classname, name),
      module: inferModule(classname, name),
    });
  }

  return cases;
}
