import { expect, Locator, Page, test } from '@playwright/test';
import { closeEditorDrawer, downloadQuestionnaire, importQuestionnaire } from './helpers';

// End-to-end tests for min/max validation on number questions (issue #111): decimal questions keep
// decimal bounds, and switching "Allow decimals" converts the bounds to match the question type.

const MIN_VALUE = 'http://hl7.org/fhir/StructureDefinition/minValue';
const MAX_VALUE = 'http://hl7.org/fhir/StructureDefinition/maxValue';

const questionnaire = (type: 'decimal' | 'integer') => ({
    resourceType: 'Questionnaire',
    language: 'en-US',
    title: 'Number validation',
    status: 'draft',
    item: [{ linkId: 'weight', type, text: 'Your weight' }],
});

const openQuestion = async (page: Page): Promise<void> => {
    await page.locator('.anchor-menu__inneritem', { hasText: 'Your weight' }).click();
};

const openValidation = async (page: Page): Promise<void> => {
    await page.getByRole('button', { name: 'Add validation' }).click();
};

const boundInput = (page: Page, label: 'Min value' | 'Max value'): Locator =>
    page.locator('.form-field', { hasText: label }).locator('input');

const fillBound = async (input: Locator, value: string): Promise<void> => {
    await input.fill(value);
    await input.blur();
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extensions = async (page: Page): Promise<any[]> => (await downloadQuestionnaire(page)).item[0].extension ?? [];

test.describe('number validation', () => {
    test('keeps decimal min and max values on a decimal question', async ({ page }) => {
        await importQuestionnaire(page, questionnaire('decimal'));
        await openQuestion(page);
        await openValidation(page);
        await fillBound(boundInput(page, 'Min value'), '2.5');
        await fillBound(boundInput(page, 'Max value'), '9.75');
        await closeEditorDrawer(page);

        // Reopening the question shows the values as entered, not rounded to integers.
        await openQuestion(page);
        await openValidation(page);
        await expect(boundInput(page, 'Min value')).toHaveValue('2.5');
        await expect(boundInput(page, 'Max value')).toHaveValue('9.75');
        await closeEditorDrawer(page);

        expect(await extensions(page)).toEqual(
            expect.arrayContaining([
                { url: MIN_VALUE, valueDecimal: 2.5 },
                { url: MAX_VALUE, valueDecimal: 9.75 },
            ]),
        );
    });

    test('saves whole-number min and max values on a decimal question as integers', async ({ page }) => {
        await importQuestionnaire(page, questionnaire('decimal'));
        await openQuestion(page);
        await openValidation(page);
        await fillBound(boundInput(page, 'Min value'), '3');
        await fillBound(boundInput(page, 'Max value'), '9.5');
        await closeEditorDrawer(page);

        expect(await extensions(page)).toEqual(
            expect.arrayContaining([
                { url: MIN_VALUE, valueInteger: 3 },
                { url: MAX_VALUE, valueDecimal: 9.5 },
            ]),
        );
    });

    test('keeps integer min and max values on an integer question', async ({ page }) => {
        await importQuestionnaire(page, questionnaire('integer'));
        await openQuestion(page);
        await openValidation(page);
        await fillBound(boundInput(page, 'Min value'), '1');
        await fillBound(boundInput(page, 'Max value'), '10');
        await closeEditorDrawer(page);

        expect(await extensions(page)).toEqual(
            expect.arrayContaining([
                { url: MIN_VALUE, valueInteger: 1 },
                { url: MAX_VALUE, valueInteger: 10 },
            ]),
        );
    });

    test('converts min and max values when toggling decimals', async ({ page }) => {
        await importQuestionnaire(page, questionnaire('decimal'));
        await openQuestion(page);
        await openValidation(page);
        await fillBound(boundInput(page, 'Min value'), '2.5');
        await fillBound(boundInput(page, 'Max value'), '9.5');

        // Turning decimals off rounds the bounds inwards to integers.
        await page.locator('.switch-btn', { hasText: 'Allow decimals' }).first().locator('.slider').click();
        await expect(boundInput(page, 'Min value')).toHaveValue('3');
        await expect(boundInput(page, 'Max value')).toHaveValue('9');
        await closeEditorDrawer(page);

        let result = await extensions(page);
        expect(result).toEqual(
            expect.arrayContaining([
                { url: MIN_VALUE, valueInteger: 3 },
                { url: MAX_VALUE, valueInteger: 9 },
            ]),
        );

        // Turning decimals back on keeps whole-number bounds as integers, which older ResearchKitOnFHIR versions need.
        await openQuestion(page);
        await page.locator('.switch-btn', { hasText: 'Allow decimals' }).first().locator('.slider').click();
        await closeEditorDrawer(page);

        result = await extensions(page);
        expect(result).toEqual(
            expect.arrayContaining([
                { url: MIN_VALUE, valueInteger: 3 },
                { url: MAX_VALUE, valueInteger: 9 },
            ]),
        );
    });
});
