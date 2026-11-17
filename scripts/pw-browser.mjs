// Launch Chromium for the UI scripts. Uses Playwright's own browser when installed
// (`npx playwright install chromium`), else falls back to any cached headless shell.
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export async function launch() {
  try {
    return await chromium.launch();
  } catch (e) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH || join(homedir(), 'Library/Caches/ms-playwright');
    const alt = [join(homedir(), '.cache/ms-playwright')];
    for (const base of [root, ...alt]) {
      if (!existsSync(base)) continue;
      for (const d of readdirSync(base).filter((x) => x.startsWith('chromium_headless_shell-')).sort().reverse()) {
        for (const sub of readdirSync(join(base, d))) {
          const exe = join(base, d, sub, 'chrome-headless-shell');
          if (existsSync(exe)) return chromium.launch({ executablePath: exe });
        }
      }
    }
    throw e;
  }
}
