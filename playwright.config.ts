import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',
    use: {
        baseURL: `http://localhost:${PORT}/phoenix/`,
        viewport: { width: 1400, height: 900 },
        trace: 'retain-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            // Set PLAYWRIGHT_CHANNEL=chrome to run against a locally installed Chrome instead of Playwright's Chromium.
            use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL },
        },
    ],
    webServer: {
        command: `npx vite --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}/phoenix/`,
        reuseExistingServer: !process.env.CI,
    },
});
