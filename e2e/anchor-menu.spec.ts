import { expect, Locator, Page, test } from '@playwright/test';

// End-to-end tests for the survey tree (AnchorMenu), which is built on react-sortable-tree + react-dnd.
// These exercise real HTML5 drag and drop, so they catch regressions in the tree library's drop handling
// (e.g. react-sortable-tree 5.1.0 reports the wrong path for nested drops, which flattened nested items).

const tree = (page: Page): Locator => page.locator('.questionnaire-overview__treeview');
const rows = (page: Page): Locator => page.locator('.rst__node');
const hierarchy = (page: Page): Locator => page.locator('.anchor-menu__title');
const toolboxItem = (page: Page, name: string): Locator =>
    page.locator('.anchor-menu__dragcomponent', { hasText: name }).first();

async function createSurvey(page: Page): Promise<void> {
    await page.goto('');
    await page.getByText('Create New Survey').click();
    await page.locator('input').first().fill('E2E survey');
    await page.getByText('Continue').click();
    await expect(page.locator('.questionnaire-overview__toolbox')).toBeVisible();
}

// Adding an item opens the item editor drawer, whose overlay covers the toolbox. Close it.
async function closeEditorDrawer(page: Page): Promise<void> {
    const overlay = page.locator('.overlay');
    if (await overlay.isVisible()) {
        await overlay.click({ position: { x: 5, y: 5 } });
        await expect(overlay).toBeHidden();
    }
}

// Drags `source` onto the tree at a position relative to `anchor` (a row or the empty-tree placeholder).
async function dragOntoTree(page: Page, source: Locator, anchor: Locator, dx: number, dy: number): Promise<void> {
    const anchorBox = await anchor.boundingBox();
    const treeBox = await tree(page).boundingBox();
    if (!anchorBox || !treeBox) throw new Error('tree or anchor not visible');
    await source.dragTo(tree(page), {
        targetPosition: { x: anchorBox.x - treeBox.x + dx, y: anchorBox.y - treeBox.y + dy },
        steps: 20,
    });
}

async function addFromToolbox(page: Page, name: string, anchor: Locator): Promise<void> {
    await dragOntoTree(page, toolboxItem(page, name), anchor, 150, 30);
    await closeEditorDrawer(page);
}

test.describe('survey tree drag and drop', () => {
    test.beforeEach(async ({ page }) => {
        await createSurvey(page);
    });

    test('adds items from the toolbox', async ({ page }) => {
        await addFromToolbox(page, 'Boolean', page.locator('.rst__placeholder'));
        await expect(rows(page)).toHaveCount(1);

        await addFromToolbox(page, 'Text', rows(page).first());
        await expect(rows(page)).toHaveCount(2);
        await expect(hierarchy(page)).toHaveText(['1.', '2.']);

        // Rows should span the full width of the tree, not shrink to their content.
        const rowBox = await page.locator('.rst__rowContents').first().boundingBox();
        const treeBox = await tree(page).boundingBox();
        expect(rowBox!.width).toBeGreaterThan(treeBox!.width * 0.75);
    });

    test('nests an item under a group, then collapses and expands the group', async ({ page }) => {
        await addFromToolbox(page, 'Boolean', page.locator('.rst__placeholder'));
        // Dropping onto the first row inserts above it, giving [Group, Boolean].
        await addFromToolbox(page, 'Group', rows(page).first());
        await expect(rows(page).nth(0).locator('.folder-icon')).toBeVisible();
        await expect(hierarchy(page)).toHaveText(['1.', '2.']);

        // Drag the Boolean's handle two indent levels to the right: it becomes the Group's child.
        const handle = rows(page).nth(1).locator('.rst__moveHandle');
        await dragOntoTree(page, handle, handle, 120, 20);
        await expect(hierarchy(page)).toHaveText(['1.', '1.1.']);

        await page.locator('.rst__collapseButton').click();
        await expect(hierarchy(page)).toHaveText(['1.']);

        await page.locator('.rst__expandButton').click();
        await expect(hierarchy(page)).toHaveText(['1.', '1.1.']);
    });
});
