import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { closeEditorDrawer, createSurvey, downloadQuestionnaire, importQuestionnaire } from './helpers';

// Surveys created elsewhere can contain item controls that Phoenix no longer lets you author
// (help text, inline "expanded text", highlight). Phoenix should still open them and export them unchanged.
const legacySurvey = JSON.parse(
    readFileSync(new URL('./fixtures/legacy-item-controls.json', import.meta.url), 'utf8'),
);

test.describe('importing and exporting surveys', () => {
    test('keeps legacy help, inline and highlight items unchanged', async ({ page }) => {
        await importQuestionnaire(page, legacySurvey);
        // Help items and the inline item's expanded text are not shown in the tree.
        await expect(page.locator('.anchor-menu__title')).toHaveText([
            '1. What is your name?',
            '2. Read more about this study',
            '3. Please answer honestly.',
        ]);

        const exported = await downloadQuestionnaire(page);
        expect(exported.item).toEqual(legacySurvey.item);
    });

    test('opens legacy items in the editor', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await importQuestionnaire(page, legacySurvey);

        for (const title of ['What is your name?', 'Read more about this study', 'Please answer honestly.']) {
            await page.locator('.anchor-menu__inneritem', { hasText: title }).click();
            await expect(page.locator('.form-field textarea').first()).toHaveValue(title);
            await closeEditorDrawer(page);
        }
        expect(errors).toEqual([]);
    });

    test('exports the purpose and copyright entered in the metadata editor', async ({ page }) => {
        await createSurvey(page);
        await page.getByText('Edit Metadata', { exact: true }).click();

        const purpose = page.locator('.form-field', { hasText: 'Purpose' }).locator('textarea');
        const copyright = page.locator('.form-field', { hasText: 'Copyright' }).locator('textarea');
        await purpose.fill('Track daily wellbeing.\nUsed in a pilot study.');
        await purpose.blur();
        await copyright.fill('© 2026 Stanford University');
        await copyright.blur();
        const metadataModal = page.locator('.overlay', { hasText: 'Survey Metadata' });
        await metadataModal.getByTitle('Close').first().click();
        await expect(metadataModal).toBeHidden();

        const exported = await downloadQuestionnaire(page);
        expect(exported.purpose).toBe('Track daily wellbeing.\nUsed in a pilot study.');
        expect(exported.copyright).toBe('© 2026 Stanford University');
    });
});
