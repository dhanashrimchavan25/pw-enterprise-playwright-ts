import type { FullResult, Reporter } from "@playwright/test/reporter";
import { generatePostRunReports } from "@helpers/reports/postRun";

/**
 * Playwright reporter hook — runs after JUnit and other reporters have flushed.
 * Do not use globalTeardown for this; teardown runs before JUnit is written.
 */
class PostRunReporter implements Reporter {
  async onEnd(_result: FullResult): Promise<void> {
    void _result;
    await generatePostRunReports();
  }

  printsToStdio(): boolean {
    return false;
  }
}

export default PostRunReporter;
