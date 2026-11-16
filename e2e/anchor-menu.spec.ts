import { expect, Locator, Page, test } from '@playwright/test';
import { closeEditorDrawer, createSurvey, dragOntoTree, rows, toolboxItem, tree } from './helpers';

// End-to-end tests for the survey tree (AnchorMenu), which is built on react-sortable-tree + react-dnd.
// These exercise real HTML5 drag and drop, so they catch regressions in the tree library's drop handling
// (e.g. react-sortable-tree 5.1.0 reports the wrong path for nested drops, which flattened nested items).

const hierarchy = (page: Page): Locator => page.locator('.anchor-menu__title');

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
