import { expect, Locator, Page, test } from '@playwright/test';
import { closeEditorDrawer, downloadQuestionnaire, importQuestionnaire } from './helpers';

// End-to-end tests for the slider settings, which must stay within what ResearchKit's sliders accept.

const MIN_VALUE = 'http://hl7.org/fhir/StructureDefinition/minValue';
const MAX_VALUE = 'http://hl7.org/fhir/StructureDefinition/maxValue';
const STEP = 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue';

const questionnaire = {
    resourceType: 'Questionnaire',
    language: 'en-US',
    title: 'Slider',
    status: 'draft',
    item: [
        {
            linkId: 'pain',
            type: 'integer',
            text: 'Pain',
            extension: [
                {
                    url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
                    valueCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/questionnaire-item-control', code: 'slider' }] },
                },
                { url: MIN_VALUE, valueInteger: 0 },
                { url: MAX_VALUE, valueInteger: 10 },
                { url: STEP, valueInteger: 1 },
            ],
        },
    ],
};

const field = (page: Page, label: string): Locator => page.locator('.form-field', { hasText: label }).locator('input');
const error = (page: Page): Locator => page.locator('div[style*="color: red"]');

const setField = async (page: Page, label: string, value: string): Promise<void> => {
    await field(page, label).fill(value);
    await field(page, label).blur();
};

test.beforeEach(async ({ page }) => {
    await importQuestionnaire(page, questionnaire);
    await page.locator('.anchor-menu__inneritem', { hasText: 'Pain' }).click();
    await expect(field(page, 'Slider max value')).toHaveValue('10');
});

test('rejects sliders with more than 13 steps', async ({ page }) => {
    await setField(page, 'Slider max value', '100');
    await expect(error(page)).toHaveText('A slider can have at most 13 steps, but this one has 100. Use a step of at least 8, or a smaller range.');

    await setField(page, 'Slider step value', '10');
    await expect(error(page)).toHaveCount(0);
});

test('rejects values outside ResearchKit\'s range', async ({ page }) => {
    await setField(page, 'Slider max value', '20000');
    await expect(error(page)).toHaveText('Min and max values must be between -10000 and 10000.');
});

test('removes a cleared value from the survey', async ({ page }) => {
    await setField(page, 'Slider step value', '');
    await closeEditorDrawer(page);
    const extensions = (await downloadQuestionnaire(page)).item[0].extension.map((e: { url: string }) => e.url);
    expect(extensions).not.toContain(STEP);
    expect(extensions).toEqual(expect.arrayContaining([MIN_VALUE, MAX_VALUE]));
});
