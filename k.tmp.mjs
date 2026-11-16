import { chromium } from '@playwright/test';
const url = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const fx = { resourceType: 'Questionnaire', language: 'en-US', title: 'k', status: 'draft', item: [
  { linkId: 'g', type: 'group', text: 'Group', item: [{ linkId: 'q1', type: 'string', text: 'Child' }] },
  { linkId: 'q2', type: 'string', text: 'Second' } ] };
for (const key of ['Enter', 'Space']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.getByText('Paste JSON').click(); await p.locator('textarea').fill(JSON.stringify(fx)); await p.getByTitle('Import').click();
  await p.waitForSelector('.rst__node');
  const before = JSON.stringify(await p.locator('.anchor-menu__title').allInnerTexts());
  const row = p.locator('.rst__node', { hasText: 'Group' }).first();
  await row.hover();
  await row.getByTitle('Duplicate').focus();
  await p.keyboard.press(key); await p.waitForTimeout(500);
  console.log(`  ${key.padEnd(5)} on Duplicate: ${before} -> ${JSON.stringify(await p.locator('.anchor-menu__title').allInnerTexts())}`);
  await p.close();
}
await b.close();
