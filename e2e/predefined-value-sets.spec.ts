import { Locator, Page, expect, test } from '@playwright/test';
import { createSurvey, expectInputValues, keyboardMoveHandle, mouseDragHandleBelow } from './helpers';

// End-to-end tests for reordering the options of a new ValueSet in the Predefined ValueSets modal
// (PredefinedValueSetModal), which uses @hello-pangea/dnd.

const optionTitles = (page: Page): Locator => page.locator('.value-set input[placeholder="Enter a title.."]');
const dragHandles = (page: Page): Locator => page.locator('.value-set .reorder-icon');

test.describe('predefined value set option reordering', () => {
    test.beforeEach(async ({ page }) => {
        await createSurvey(page);
        await page.getByRole('button', { name: 'menu list' }).click();
        await page.getByText('Predefined ValueSets').click();
        // A new ValueSet starts with two empty options.
        await expect(optionTitles(page)).toHaveCount(2);
        await page.getByRole('button', { name: 'Add new option' }).click();
        for (const [i, title] of ['A', 'B', 'C'].entries()) {
            await optionTitles(page).nth(i).fill(title);
        }
        await expectInputValues(optionTitles(page), ['A', 'B', 'C']);
    });

    test('reorders options by dragging the handle with the mouse', async ({ page }) => {
        await mouseDragHandleBelow(page, dragHandles(page).first(), dragHandles(page).last());
        await expectInputValues(optionTitles(page), ['B', 'C', 'A']);
    });

    test('reorders options with the keyboard', async ({ page }) => {
        await keyboardMoveHandle(page, dragHandles(page).last(), 'ArrowUp', 2);
        await expectInputValues(optionTitles(page), ['C', 'A', 'B']);
    });
});
