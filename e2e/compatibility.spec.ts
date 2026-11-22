import { expect, Page, test } from '@playwright/test';
import { importQuestionnaire } from './helpers';

// End-to-end tests for "Check app compatibility", which runs the same rules as the questionnaire-check CLI.

const SLIDER = { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl', valueCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/questionnaire-item-control', code: 'slider' }] } };
const questionnaire = {
    resourceType: 'Questionnaire',
    language: 'en-US',
    title: 'Compatibility',
    status: 'draft',
    item: [
        {
            linkId: 'pain',
            type: 'integer',
            text: 'How much pain?',
            extension: [
                SLIDER,
                { url: 'http://hl7.org/fhir/StructureDefinition/minValue', valueInteger: 0 },
                { url: 'http://hl7.org/fhir/StructureDefinition/maxValue', valueInteger: 100 },
                { url: 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue', valueInteger: 1 },
            ],
        },
        { linkId: 'visit', type: 'time', text: 'Visit time' },
    ],
};

const openCheck = async (page: Page) => {
    await page.getByRole('button', { name: 'menu list' }).click();
    await page.getByRole('button', { name: 'Check app compatibility' }).click();
    return page.locator('.modal', { hasText: 'App Compatibility' });
};

test('shows what each app would reject or ignore, and remembers the chosen app', async ({ page }) => {
    await importQuestionnaire(page, questionnaire);

    let modal = await openCheck(page);
    await expect(modal.locator('select')).toHaveValue('researchkit-on-fhir@2.0.10');
    await expect(modal).toContainText('1 error, 0 warnings');
    await expect(modal.locator('.compatibility__issue--error')).toContainText('it has 100 steps, and ResearchKit allows at most 13');

    // React Native 1.0.0 doesn't enforce the slider's limits on an optional question, and saves times as HH:MM.
    await modal.locator('select').selectOption('spezivibe-react-native@1.0.0');
    await expect(modal).toContainText('0 errors, 3 warnings');
    await expect(modal).toContainText('saves answers to the time question "Visit time" as "HH:MM"');

    // 1.1.0 fixed both; it still shows a number field instead of a slider.
    await modal.locator('select').selectOption('spezivibe-react-native@1.1.0');
    await expect(modal).toContainText('0 errors, 1 warning');

    await modal.getByRole('button', { name: 'Close' }).last().click();
    await expect(modal).toBeHidden();

    // The choice of app is remembered.
    modal = await openCheck(page);
    await expect(modal.locator('select')).toHaveValue('spezivibe-react-native@1.1.0');
});

test('reports no issues for a survey the app fully supports', async ({ page }) => {
    await importQuestionnaire(page, { ...questionnaire, item: [{ linkId: 'name', type: 'string', text: 'Name' }] });
    const modal = await openCheck(page);
    await expect(modal).toContainText('No issues found');
});
