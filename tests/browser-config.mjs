import { existsSync } from 'node:fs';

// CI installs Playwright Chromium; local development may use system Chrome.
export const launchOptions={
 executablePath:process.env.CHROME_PATH||(existsSync('/usr/bin/google-chrome')?'/usr/bin/google-chrome':undefined),
 headless:true,
 args:['--no-sandbox','--disable-dev-shm-usage'],
};
