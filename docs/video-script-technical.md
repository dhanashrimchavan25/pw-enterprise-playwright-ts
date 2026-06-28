# Video Script — Engineering Manager + QA Lead (10–12 min)

**Title:** Playwright Enterprise Framework — Architecture, Execution & Reporting Walkthrough

**Audience:** Engineering managers, QA leads, test architects — high level only, no line-by-line code.

**Tools:** Screen record (Win + G or OBS). GitHub README, VS Code tree, terminal, browsers.

**Goal:** Prove the framework is real, structured, and runnable—not a slide deck.

**Shorter business overview:** See [video-script-cto.md](./video-script-cto.md)

---

## Section 1 — Outcomes first (0:00–1:00)

**Show:** GitHub README (top half — Who This Is For, Problems, Business Outcomes).

**Say:**

> This walkthrough is for engineering managers and QA leads evaluating whether this framework fits how your team should work.

> In about ten minutes I’ll cover architecture, how tests run, the reporting stack, and CI/CD—without diving into implementation details. For code-level depth, the framework design doc is on GitHub.

**Show:** README **Illustrative Transformation** section + Engagement (quick scroll).

---

## Section 2 — Architecture (1:00–1:45) — ~45 sec core

**Show:** `docs/screenshots/architecture.png` (full screen).

**Say:**

> At the highest level, everything flows from environment and config. Shared helpers and data sit in the middle. API tests and E2E tests are separate layers so you can run fast API checks without a browser, or full UI regression when needed.

> Reporting is built for two audiences—engineers debug with Playwright and Allure; managers use an executive summary with stability and flaky-test insight.

**Optional:** Flash VS Code tree **collapsed** (10 sec only):

```text
src/apitest/    → API layer
src/e2etest/    → E2E layer
src/helpers/    → config, logging, reports
src/data/       → shared test data
fixtures/       → shared test hooks
.github/        → CI/CD
docs/           → design + screenshots
```

**Say:**

> Folder layout matches the diagram—intentional structure, not scripts dumped in a single `tests` folder.

**Do not** open individual page object files or explain locators.

---

## Section 3 — How tests are organized (1:45–2:30)

**Show:** Expand `src/apitest/testcase/` and `src/e2etest/testcase/` — file names only.

**Say:**

> Seven sample tests—two API health checks, five E2E flows covering login, cart, inventory, and sorting.

> Tests use tags like smoke and regression so teams can run a fast gate or a full suite. Naming is plain English so reports read well for non-engineers.

**Show:** One spec file for 5 sec — `tc_01_login.spec.ts` — point at `test.describe` tags and test title only. **Do not** scroll through page objects.

---

## Section 4 — Run tests (2:30–5:00)

**Show:** Terminal.

**Say:**

> Let me run the full suite with all report types enabled.

**Type:**

```powershell
npm run test:report:all
```

**While running (~30 sec), narrate:**

> Tests run in parallel against Sauce Demo—a public demo app so anyone can clone and reproduce. Two projects: `api` and `e2e`. You’ll see tagged suites in the output.

**When finished, point at summary:**

> Six passed, one failed—that failure is intentional in the demo to show how failure reporting works. Exit code 1 is expected.

**Optional WOW (30 sec):** Run smoke only:

```powershell
npm run test:smoke
```

**Say:**

> Tagged execution lets managers choose speed vs coverage—smoke in minutes, full regression when needed.

---

## Section 5 — Reports ladder (5:00–8:00) — ~3 min total

**Say:**

> Three report layers—engineers use the first two, leadership uses the third.

### 5a. Playwright HTML (~1 min)

```powershell
npm run report
```

**Say:** *“Default engineering report—failures, screenshots, traces.”*

**Show:** One failed test (inventory catalog), expand error. **30 seconds max.**

### 5b. Allure (~1 min)

```powershell
npm run report:allure
```

**Say:** *“Second engineering view—overview dashboard, suites by API and E2E, environment metadata, trends.”*

**Show:** Overview tab only (success rate, trend, environment widget). **Do not** tour every tab.

### 5c. Executive report (~1 min)

**Open:** `reports/executive-summary/index.html`

**Say:**

> This is the manager view—pass rate, stability score, flaky test count, trend across runs, and recommendation.

**Show:** Stability Intelligence + top unstable test row. **Say:**

> After a few runs, the framework highlights flaky tests before they block a release. That’s the differentiator most portfolios don’t have.

---

## Section 6 — CI/CD (8:00–9:30)

**Show:** GitHub → Actions → latest workflow run.

**Say:**

> Every push and pull request triggers the pipeline—Node, Java for Allure, typecheck, lint, full test run, then artifacts for Playwright, Allure, and executive reports.

**Click through:** Checkout → Install → Test → Upload artifacts (fast scroll).

**Say:**

> Clone locally with `npm install` and `.env.example`—no secrets in the repo. CI uses public demo credentials.

**Optional WOW:** If you have a green run from a recent push, show it. If red due to intentional failure, say: *“Pipeline still produces reports; quality gate behavior is configurable per team.”*

---

## Section 7 — Where to go deeper + close (9:30–11:00)

**Show:** `docs/framework-design.md` in browser (table of contents only).

**Say:**

> For implementation detail—setup, env files, report types, design decisions—the framework design guide documents everything. This video stays at the architecture and operations layer.

**Show:** README **Work With Me** section.

**Say:**

> Whether you’re starting Playwright, migrating from Selenium, scaling automation, or improving CI visibility—this repo shows the architecture I use in client work. I also offer a free framework review; links are in the README.

> GitHub link is below. Thank you.

---

## Checklist

- [ ] Architecture ≤ 45 sec of narration (+ optional 10 sec tree)
- [ ] No deep dive into page objects, helpers, or code
- [ ] Reports ladder ≤ 3 min total
- [ ] Show flaky intelligence in executive report
- [ ] 10–12 min total (cut dead air in edit)
- [ ] Link Video 1 in description (“shorter overview for leadership”)

**YouTube title:**  
`Playwright Enterprise Framework — Architecture, Execution & Reporting Walkthrough`

**Description snippet:**

```
10-minute walkthrough for engineering managers and QA leads.
Architecture → test execution → Playwright / Allure / Executive reports → GitHub Actions CI/CD.

Shorter business overview: [link to Video 1]
GitHub: [YOUR_REPO_URL]
Framework design doc: [YOUR_REPO_URL]/blob/main/docs/framework-design.md
```

---

## Cheat sheet (second monitor)

```
README outcomes [1m]
Architecture diagram + tree [1.5m]
Test folders (names only) [45s]
npm run test:report:all [2.5m]
Playwright → Allure → Executive [3m]
GitHub Actions [1.5m]
framework-design.md TOC + close [1.5m]
[~11 min]
```
