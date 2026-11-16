import { expect, Locator, Page } from '@playwright/test';

export const tree = (page: Page): Locator => page.locator('.questionnaire-overview__treeview');
export const rows = (page: Page): Locator => page.locator('.rst__node');
export const toolboxItem = (page: Page, name: string): Locator =>
    page.locator('.anchor-menu__dragcomponent', { hasText: name }).first();

export async function createSurvey(page: Page): Promise<void> {
    await page.goto('');
    await page.getByText('Create New Survey').click();
    await page.locator('input').first().fill('E2E survey');
    await page.getByText('Continue').click();
    await expect(page.locator('.questionnaire-overview__toolbox')).toBeVisible();
}

// Drags `source` (a toolbox item or a row's move handle) to a position relative to `anchor`
// (a tree row or the empty-tree placeholder) using real pointer events, which react-dnd's HTML5 backend turns into a drag.
export async function dragOntoTree(page: Page, source: Locator, anchor: Locator, dx: number, dy: number): Promise<void> {
    const anchorBox = await anchor.boundingBox();
    const sourceBox = await source.boundingBox();
    if (!anchorBox || !sourceBox) throw new Error('anchor or source not visible');
    const x = anchorBox.x + dx;
    const y = anchorBox.y + dy;

    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 20 });
    // Hover over the target a little before dropping, like a real pointer would. Releasing on the very
    // first hover event can drop before the tree has rendered its landing position, leaving a stuck preview.
    for (let i = 0; i < 4; i++) {
        await page.mouse.move(x + (i % 2), y, { steps: 2 });
        await page.waitForTimeout(50);
    }
    await page.mouse.up();
}

// Adding an item opens the item editor drawer, whose overlay covers the toolbox. Close it.
export async function closeEditorDrawer(page: Page): Promise<void> {
    const overlay = page.locator('.overlay');
    if (await overlay.isVisible()) {
        await overlay.click({ position: { x: 5, y: 5 } });
        await expect(overlay).toBeHidden();
    }
}

// Reorders a list item by dragging its handle below `target` with the mouse. Lists built with
// @hello-pangea/dnd use mouse events (not HTML5 drag): press, move past the drag threshold, then move.
export async function mouseDragHandleBelow(page: Page, handle: Locator, target: Locator): Promise<void> {
    const from = await handle.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('drag handle or target not visible');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 10, { steps: 5 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 + 15, { steps: 20 });
    await page.mouse.up();
}

// Reorders a list item with the keyboard: Space lifts the focused handle, arrows move it, Space drops it.
export async function keyboardMoveHandle(page: Page, handle: Locator, key: 'ArrowUp' | 'ArrowDown', times: number): Promise<void> {
    await handle.focus();
    await page.keyboard.press('Space');
    for (let i = 0; i < times; i++) {
        await page.keyboard.press(key);
    }
    await page.keyboard.press('Space');
}

// Polls the values of a list of inputs until they match `expected` (in order).
export async function expectInputValues(inputs: Locator, expected: string[]): Promise<void> {
    await expect
        .poll(() => inputs.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)))
        .toEqual(expected);
}
