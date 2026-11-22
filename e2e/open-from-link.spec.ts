import { expect, Page, test } from '@playwright/test';
import { createQuestionnaireLink } from '../src/helpers/questionnaireLink';
import { downloadQuestionnaire, importQuestionnaire } from './helpers';

// End-to-end tests for opening a survey from a link (#questionnaire=, #questionnaire-deflate= and ?url=).

const survey = (title: string) => ({
    resourceType: 'Questionnaire',
    language: 'en-US',
    title,
    status: 'draft',
    item: [{ linkId: 'q1', type: 'string', text: `${title} question` }],
});

// Builds a link relative to the configured baseURL, so the tests work on any port.
const linkTo = async (page: Page, json: string, compress = true): Promise<string> => {
    const link = await createQuestionnaireLink('http://placeholder/', json, compress);
    return link.replace('http://placeholder/', '');
};

const expectEditorWith = async (page: Page, text: string): Promise<void> => {
    await expect(page.locator('.questionnaire-overview__toolbox')).toBeVisible();
    await expect(page.locator('.anchor-menu__inneritem', { hasText: text })).toBeVisible();
};

test.describe('open from link', () => {
    for (const compress of [true, false]) {
        test(`opens a survey from the link fragment (compressed: ${compress})`, async ({ page }) => {
            await page.goto(await linkTo(page, JSON.stringify(survey('Linked')), compress));
            await expectEditorWith(page, 'Linked question');
            expect((await downloadQuestionnaire(page)).title).toBe('Linked');

            // The survey is removed from the address bar, so reloading doesn't import it again.
            expect(page.url()).not.toContain('questionnaire');
        });
    }

    test('opens a survey from ?url=', async ({ page }) => {
        const url = 'https://surveys.example.org/remote.json';
        await page.route(url, (route) =>
            route.fulfill({ json: survey('Remote'), headers: { 'Access-Control-Allow-Origin': '*' } }),
        );
        await page.goto(`?url=${encodeURIComponent(url)}`);
        await expectEditorWith(page, 'Remote question');
        expect(page.url()).not.toContain('url=');
    });

    // `fresh` opens the link in a new page load (e.g. a new tab); otherwise it is pasted into the tab already showing
    // Phoenix, which only changes the fragment and doesn't reload the page.
    for (const fresh of [true, false]) {
        const open = async (page: Page, link: string) => {
            if (fresh) {
                await page.goto('about:blank');
            }
            await page.goto(link);
        };

        test(`asks before replacing a survey in progress (${fresh ? 'new page load' : 'link pasted into open tab'})`, async ({ page }) => {
            await importQuestionnaire(page, survey('Mine'));
            await expectEditorWith(page, 'Mine question');
            const link = await linkTo(page, JSON.stringify(survey('Linked')));

            await open(page, link);
            const prompt = page.locator('.modal', { hasText: 'Open Linked Survey' });
            await expect(prompt).toContainText('Mine');
            await prompt.getByRole('button', { name: 'Keep my survey' }).click();
            await expectEditorWith(page, 'Mine question');
            expect(page.url()).not.toContain('questionnaire');

            await open(page, link);
            await page.getByRole('button', { name: 'Open linked survey' }).click();
            await expectEditorWith(page, 'Linked question');
            expect((await downloadQuestionnaire(page)).title).toBe('Linked');
        });
    }

    test('explains a broken link and then offers to restore the survey in progress', async ({ page }) => {
        await importQuestionnaire(page, survey('Mine'));
        await expectEditorWith(page, 'Mine question');

        await page.goto('about:blank');
        await page.goto(await linkTo(page, JSON.stringify({ resourceType: 'Patient' }), false));
        const error = page.locator('.modal', { hasText: 'Could Not Open Survey' });
        await expect(error).toContainText('not a FHIR Questionnaire');
        await expect(page.locator('.modal', { hasText: 'Restore Survey' })).toHaveCount(0);

        await error.getByRole('button', { name: 'Ok' }).click();
        await expect(page.locator('.modal', { hasText: 'Restore Survey' })).toContainText('Mine');
    });
});
