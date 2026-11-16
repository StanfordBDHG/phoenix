// Records the animated demo in the README (figures/survey-builder-demo.gif).
//
// Usage:
//   1. Start the dev server:   npx vite --port 5199
//   2. Record the GIF:         node scripts/record-readme-demo.mjs
//
// Options (environment variables):
//   BASE_URL            app URL (default http://localhost:5199/phoenix/)
//   PLAYWRIGHT_CHANNEL  e.g. "chrome" to use a locally installed Chrome instead of Playwright's Chromium
//
// Frames are captured with Chrome's screencast (DevTools protocol), so this needs a Chromium-based browser.
// Requires ffmpeg on the PATH to turn the frames into a GIF.

import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5199/phoenix/';
const OUTPUT = path.resolve('figures/survey-builder-demo.gif');
const VIEWPORT = { width: 1280, height: 800 };
const GIF_WIDTH = 960;
const GIF_FPS = 12;

// Playwright's video does not show the mouse pointer, so draw one that follows mouse and drag events.
const fakeCursor = () => {
    window.addEventListener('DOMContentLoaded', () => {
        const cursor = document.createElement('div');
        cursor.innerHTML =
            '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M1 1 L1 24 L7 18 L11.5 28 L15 26.5 L10.5 17 L19 17 Z" ' +
            'fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        Object.assign(cursor.style, {
            position: 'fixed', left: '0', top: '0', zIndex: '2147483647', pointerEvents: 'none',
            transform: 'translate(-100px, -100px)', transition: 'scale 0.1s', transformOrigin: 'top left',
        });
        document.body.appendChild(cursor);
        const move = (e) => (cursor.style.transform = `translate(${e.clientX - 1}px, ${e.clientY - 1}px)`);
        document.addEventListener('mousemove', move, true);
        document.addEventListener('dragover', move, true);
        document.addEventListener('mousedown', () => (cursor.style.scale = '0.85'), true);
        document.addEventListener('mouseup', () => (cursor.style.scale = '1'), true);
        document.addEventListener('drop', () => (cursor.style.scale = '1'), true);
    });
};

const frameDir = mkdtempSync(path.join(tmpdir(), 'phoenix-demo-'));
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
const context = await browser.newContext({ viewport: VIEWPORT });
await context.addInitScript(fakeCursor);
const page = await context.newPage();

// Capture frames with Chrome's screencast. Frames only arrive when the page changes, so each frame
// is shown until the next one (see the ffmpeg concat list below).
const frames = [];
let recording = false;
const cdp = await context.newCDPSession(page);
cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    if (recording) {
        const file = path.join(frameDir, `frame-${String(frames.length).padStart(5, '0')}.jpg`);
        writeFileSync(file, Buffer.from(data, 'base64'));
        frames.push({ file, time: metadata.timestamp });
    }
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: VIEWPORT.width, maxHeight: VIEWPORT.height });

const pause = (ms) => page.waitForTimeout(ms);

// Moves the pointer smoothly to the centre of `locator` (or an offset within it) and clicks.
async function clickOn(locator, { dx, dy } = {}) {
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    await page.mouse.move(box.x + (dx ?? box.width / 2), box.y + (dy ?? box.height / 2), { steps: 25 });
    await pause(150);
    await page.mouse.down();
    await page.mouse.up();
}

async function typeInto(locator, text) {
    await clickOn(locator);
    await locator.pressSequentially(text, { delay: 45 });
}

// Drags a toolbox item into the survey tree. New items are inserted above the row they are dropped on,
// so the questions are added last-to-first to end up in reading order.
async function dragToolboxItemIntoTree(name) {
    const source = page.locator('.anchor-menu__dragcomponent', { hasText: name }).first();
    const target = (await page.locator('.rst__node').count())
        ? page.locator('.rst__node').first()
        : page.locator('.rst__placeholder');
    const from = await source.boundingBox();
    const to = await target.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2, { steps: 25 });
    await pause(200);
    await page.mouse.down();
    const x = to.x + 220;
    const y = to.y + 25;
    await page.mouse.move(x, y, { steps: 35 });
    for (let i = 0; i < 6; i++) {
        await page.mouse.move(x + (i % 2), y, { steps: 2 });
        await pause(60);
    }
    await page.mouse.up();
    await page.locator('.overlay').waitFor();
    await pause(500);
}

const questionText = () => page.locator('.form-field textarea').first();
const optionTitles = () => page.locator('.answer-option-item input[name="beskrivelse"]');

async function closeEditor() {
    await clickOn(page.locator('button.iconBtn.white').first());
    await page.locator('.overlay').waitFor({ state: 'hidden' });
    await pause(600);
}

// --- The demo ---------------------------------------------------------------------------------------

await page.goto(BASE_URL, { waitUntil: 'networkidle' });
await pause(300);
recording = true;
// Nudge the page so the first frame is captured right away.
await page.mouse.move(VIEWPORT.width / 2, VIEWPORT.height - 120);
await pause(1500);

await clickOn(page.getByText('Create New Survey'));
await pause(600);
await typeInto(page.locator('input').first(), 'Daily Wellbeing Check-in');
await pause(400);
await clickOn(page.getByText('Continue'));
await page.locator('.questionnaire-overview__toolbox').waitFor();
await pause(1000);

// Question 3: free text
await dragToolboxItemIntoTree('Text');
await typeInto(questionText(), "Anything else you'd like to share?");
await closeEditor();

// Question 2: number
await dragToolboxItemIntoTree('Number');
await typeInto(questionText(), 'How many hours did you sleep last night?');
await closeEditor();

// Question 1: multiple choice with three options
await dragToolboxItemIntoTree('Multiple Choice');
await typeInto(questionText(), 'How are you feeling today?');
await clickOn(page.getByRole('button', { name: '+ Add option' }));
await pause(300);
for (const [i, title] of ['Great', 'Okay', 'Not great'].entries()) {
    await typeInto(optionTitles().nth(i), title);
}
await pause(800);
await closeEditor();
await pause(1500);

// Show the generated FHIR Questionnaire
await clickOn(page.getByText('Preview', { exact: true }));
await pause(3500);

// --- Convert the frames to a GIF ---------------------------------------------------------------------

recording = false;
await cdp.send('Page.stopScreencast');
await browser.close();
if (frames.length < 2) {
    throw new Error(`only captured ${frames.length} frame(s)`);
}
const list = frames
    .map((frame, i) => {
        const duration = i + 1 < frames.length ? frames[i + 1].time - frame.time : 1;
        return `file '${frame.file}'\nduration ${Math.max(duration, 0.001).toFixed(3)}`;
    })
    .join('\n');
// The concat demuxer ignores the last entry's duration unless the file is listed again.
const listFile = path.join(frameDir, 'frames.txt');
writeFileSync(listFile, `${list}\nfile '${frames[frames.length - 1].file}'\n`);

const filters = `fps=${GIF_FPS},scale=${GIF_WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
const ffmpeg = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile, '-filter_complex', filters, '-loop', '0', OUTPUT],
    { stdio: 'inherit' },
);
rmSync(frameDir, { recursive: true, force: true });
if (ffmpeg.status !== 0) {
    throw new Error('ffmpeg failed to convert the frames to a GIF');
}
console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)} from ${frames.length} frames`);
