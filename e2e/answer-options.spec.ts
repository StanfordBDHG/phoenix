import { Locator, Page, expect, test } from '@playwright/test';
import {
    createSurvey,
    dragOntoTree,
    expectInputValues,
    keyboardMoveHandle,
    mouseDragHandleBelow,
    toolboxItem,
} from './helpers';

// End-to-end tests for reordering the answer options of a Multiple Choice question
// (DraggableAnswerOptions), which uses @hello-pangea/dnd.

const optionTitles = (page: Page): Locator => page.locator('.answer-option-item input[name="beskrivelse"]');
const dragHandles = (page: Page): Locator => page.locator('.answer-option-item .reorder-icon');

async function addChoiceQuestionWithOptions(page: Page, titles: string[]): Promise<void> {
    await dragOntoTree(page, toolboxItem(page, 'Multiple Choice'), page.locator('.rst__placeholder'), 150, 30);
    // The new question opens in the editor drawer with two empty answer options.
    await expect(optionTitles(page)).toHaveCount(2);
    for (let i = 2; i < titles.length; i++) {
        await page.getByRole('button', { name: '+ Add option' }).click();
    }
    await expect(optionTitles(page)).toHaveCount(titles.length);
    for (const [i, title] of titles.entries()) {
        await optionTitles(page).nth(i).fill(title);
        await optionTitles(page).nth(i).blur(); // titles are saved on blur
    }
    await expectInputValues(optionTitles(page), titles);
}

test.describe('answer option reordering', () => {
    test.beforeEach(async ({ page }) => {
        await createSurvey(page);
        await addChoiceQuestionWithOptions(page, ['A', 'B', 'C']);
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
