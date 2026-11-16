import { expect, Locator, Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import {
    closeEditorDrawer,
    createSurvey,
    downloadQuestionnaire,
    dragOntoTree,
    importQuestionnaire,
    rows,
    toolboxItem,
} from './helpers';

// End-to-end tests for the date, time and date-time pickers (react-datepicker), used for the survey's
// "Date last updated", enable-when conditions on date/time questions, and date validation.

const dateConditions = JSON.parse(readFileSync(new URL('./fixtures/date-conditions.json', import.meta.url), 'utf8'));

const pad = (n: number): string => String(n).padStart(2, '0');
const today = new Date();
const thisMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
const todayIso = `${thisMonth}-${pad(today.getDate())}`;

const pickerInputs = (page: Page): Locator => page.locator('.datepicker input');

// Adds a question from the toolbox (new questions are inserted at the top) and sets its text.
async function addQuestion(page: Page, type: string, text: string): Promise<void> {
    const anchor = (await rows(page).count()) ? rows(page).first() : page.locator('.rst__placeholder');
    await dragOntoTree(page, toolboxItem(page, type), anchor, 150, 25);
    const textField = page.locator('.form-field textarea').first();
    await textField.fill(text);
    await textField.blur();
    await closeEditorDrawer(page);
}

// Opens a question's "Enable when" section and adds a condition on `questionText` with operator "=".
async function addEqualsCondition(page: Page, itemText: string, questionText: string): Promise<void> {
    await page.locator('.anchor-menu__inneritem', { hasText: itemText }).click();
    await page.getByText('Enable when').click();
    await page.getByText('Add a condition').click();
    const [question, operator] = [page.locator('select').nth(0), page.locator('select').nth(1)];
    const label = await question.evaluate(
        (select: HTMLSelectElement, text) => [...select.options].find((o) => o.text.includes(text))?.text,
        questionText,
    );
    await question.selectOption({ label: label ?? '' });
    await operator.selectOption('=');
}

async function typeIntoPicker(page: Page, picker: Locator, value: string): Promise<void> {
    await picker.fill(value);
    await page.keyboard.press('Enter');
}

test.describe('date pickers', () => {
    test('sets the survey date by typing and with the Today button', async ({ page }) => {
        await createSurvey(page);
        await page.getByText('Edit Metadata', { exact: true }).click();
        const picker = page.locator('.form-field', { hasText: 'Date last updated' }).locator('.datepicker input');
        const metadataModal = page.locator('.overlay', { hasText: 'Survey Metadata' });

        await typeIntoPicker(page, picker, '03.15.2026');
        await expect(picker).toHaveValue('03.15.2026');
        await metadataModal.getByTitle('Close').first().click();
        expect((await downloadQuestionnaire(page)).date).toMatch(/^2026-03-15T00:00:00/);

        await page.getByText('Edit Metadata', { exact: true }).click();
        await picker.click();
        await page.locator('.react-datepicker__today-button').click();
        await metadataModal.getByTitle('Close').first().click();
        expect((await downloadQuestionnaire(page)).date).toMatch(new RegExp(`^${todayIso}T`));
    });

    test('sets a date condition by typing and from the calendar', async ({ page }) => {
        await createSurvey(page);
        await addQuestion(page, 'Boolean', 'Follow-up needed?');
        await addQuestion(page, 'Date', 'Date of visit');
        await addEqualsCondition(page, 'Follow-up needed?', 'Date of visit');

        await typeIntoPicker(page, pickerInputs(page).first(), '03.15.2026');
        await closeEditorDrawer(page);
        expect((await downloadQuestionnaire(page)).item[1].enableWhen[0].answerDate).toBe('2026-03-15');

        // Pick the 20th of the month shown when the calendar opens on an existing date (March 2026).
        await page.locator('.anchor-menu__inneritem', { hasText: 'Follow-up needed?' }).click();
        await page.getByText('Enable when').click();
        await pickerInputs(page).first().click();
        await page.locator('.react-datepicker__day--020:not(.react-datepicker__day--outside-month)').click();
        await expect(pickerInputs(page).first()).toHaveValue('03.20.2026');
        await closeEditorDrawer(page);
        expect((await downloadQuestionnaire(page)).item[1].enableWhen[0].answerDate).toBe('2026-03-20');
    });

    test('sets a time condition by typing and from the time list', async ({ page }) => {
        await createSurvey(page);
        await addQuestion(page, 'Boolean', 'Follow-up needed?');
        await addQuestion(page, 'Time', 'Time of visit');
        await addEqualsCondition(page, 'Follow-up needed?', 'Time of visit');

        await typeIntoPicker(page, pickerInputs(page).first(), '14:45');
        await closeEditorDrawer(page);
        expect((await downloadQuestionnaire(page)).item[1].enableWhen[0].answerTime).toBe('14:45:00');

        await page.locator('.anchor-menu__inneritem', { hasText: 'Follow-up needed?' }).click();
        await page.getByText('Enable when').click();
        await pickerInputs(page).first().click();
        await page.locator('.react-datepicker__time-list-item', { hasText: /^9:30\sAM$/ }).click();
        await expect(pickerInputs(page).first()).toHaveValue('09:30');
        await closeEditorDrawer(page);
        expect((await downloadQuestionnaire(page)).item[1].enableWhen[0].answerTime).toBe('09:30:00');
    });

    test('shows and updates date, time and date-time conditions from an imported survey', async ({ page }) => {
        await importQuestionnaire(page, dateConditions);
        await page.locator('.anchor-menu__inneritem', { hasText: 'Follow-up needed?' }).click();
        await page.getByText('Enable when').click();
        const [date, time, dateTime] = [pickerInputs(page).nth(0), pickerInputs(page).nth(1), pickerInputs(page).nth(2)];
        await expect(date).toHaveValue('03.15.2026');
        await expect(time).toHaveValue('14:30');
        await expect(dateTime).toHaveValue('03.15.2026 14:30');

        await typeIntoPicker(page, dateTime, '04.20.2026 09:15');
        await closeEditorDrawer(page);
        const [dateCondition, timeCondition, dateTimeCondition] = (await downloadQuestionnaire(page)).item[3].enableWhen;
        expect(dateCondition.answerDate).toBe('2026-03-15');
        expect(timeCondition.answerTime).toBe('14:30:00');
        expect(dateTimeCondition.answerDateTime).toMatch(/^2026-04-20T09:15:00/);
    });

    test('sets a minimum date for date validation', async ({ page }) => {
        await createSurvey(page);
        await addQuestion(page, 'Date', 'Date of visit');
        await page.locator('.anchor-menu__inneritem', { hasText: 'Date of visit' }).click();
        await page.getByText('Add validation').click();
        await page.locator('select').first().selectOption('abs');

        await typeIntoPicker(page, pickerInputs(page).first(), '03.15.2026');
        await closeEditorDrawer(page);
        const { extension } = (await downloadQuestionnaire(page)).item[0];
        expect(extension).toContainEqual({
            url: 'http://hl7.org/fhir/StructureDefinition/minValue',
            valueDate: '2026-03-15',
        });
    });
});
