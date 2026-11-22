/**
 * @jest-environment node
 */
import { createQuestionnaireLink, readLinkedQuestionnaire, removeLinkParameters } from './questionnaireLink';

const BASE = 'https://example.org/phoenix/';
const questionnaire = JSON.stringify({
    resourceType: 'Questionnaire',
    title: 'Schmerz & Müdigkeit 😴',
    status: 'draft',
    item: [{ linkId: 'q1', type: 'decimal', text: 'Weight?' }],
});

const parts = (link: string) => {
    const url = new URL(link);
    return { search: url.search, hash: url.hash };
};

const fetchReturning = (status: number, body: string) =>
    jest.fn().mockResolvedValue(new Response(body, { status })) as unknown as typeof fetch;

describe('createQuestionnaireLink and readLinkedQuestionnaire', () => {
    it.each([true, false])('round-trips non-ASCII JSON (compress: %s)', async (compress) => {
        const link = await createQuestionnaireLink(BASE, questionnaire, compress);
        expect(link.startsWith(`${BASE}#questionnaire${compress ? '-deflate' : ''}=`)).toBe(true);
        // The value is base64url without padding, so it needs no escaping in a URL.
        expect(link.split('=').slice(1).join('=')).toMatch(/^[A-Za-z0-9_-]+$/);
        const { search, hash } = parts(link);
        expect(await readLinkedQuestionnaire(search, hash)).toEqual({ json: questionnaire });
    });

    it('replaces an existing fragment on the base URL', async () => {
        const link = await createQuestionnaireLink(`${BASE}#old`, questionnaire, false);
        expect(link.split('#')).toHaveLength(2);
    });

    it('compresses larger surveys', async () => {
        const big = JSON.stringify({
            resourceType: 'Questionnaire',
            item: Array.from({ length: 50 }, (_, i) => ({ linkId: `q${i}`, type: 'string', text: 'How are you today?' })),
        });
        const plain = await createQuestionnaireLink(BASE, big, false);
        const compressed = await createQuestionnaireLink(BASE, big, true);
        expect(compressed.length).toBeLessThan(plain.length / 4);
    });

    it('returns undefined when the link has no survey', async () => {
        expect(await readLinkedQuestionnaire('', '')).toBeUndefined();
        expect(await readLinkedQuestionnaire('?foo=1', '#bar')).toBeUndefined();
    });

    it('reports invalid base64 or compressed data', async () => {
        const result = await readLinkedQuestionnaire('', '#questionnaire-deflate=bm90LWRlZmxhdGU');
        expect(result).toEqual({ error: expect.stringContaining('Could not read the survey') });
    });

    it('rejects JSON that is not a Questionnaire', async () => {
        const link = await createQuestionnaireLink(BASE, JSON.stringify({ resourceType: 'Patient' }), false);
        const { search, hash } = parts(link);
        expect(await readLinkedQuestionnaire(search, hash)).toEqual({
            error: expect.stringContaining('not a FHIR Questionnaire'),
        });
    });

    it('rejects invalid JSON', async () => {
        const link = await createQuestionnaireLink(BASE, '{not json', false);
        const { search, hash } = parts(link);
        expect(await readLinkedQuestionnaire(search, hash)).toEqual({ error: expect.stringContaining('not valid JSON') });
    });
});

describe('readLinkedQuestionnaire with ?url=', () => {
    it('fetches the survey from an https URL', async () => {
        const fetchFn = fetchReturning(200, questionnaire);
        const url = 'https://raw.githubusercontent.com/org/repo/main/survey.json';
        const result = await readLinkedQuestionnaire(`?url=${encodeURIComponent(url)}`, '', fetchFn);
        expect(fetchFn).toHaveBeenCalledWith(url);
        expect(result).toEqual({ json: questionnaire });
    });

    it('allows http only for localhost', async () => {
        const fetchFn = fetchReturning(200, questionnaire);
        expect(await readLinkedQuestionnaire('?url=http://localhost:8000/s.json', '', fetchFn)).toEqual({ json: questionnaire });
        expect(await readLinkedQuestionnaire('?url=http://example.org/s.json', '', fetchFn)).toEqual({
            error: expect.stringContaining('only opens surveys from https://'),
        });
        expect(await readLinkedQuestionnaire('?url=javascript:alert(1)', '', fetchFn)).toEqual({
            error: expect.stringContaining('only opens surveys from https://'),
        });
        expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('reports HTTP errors', async () => {
        const result = await readLinkedQuestionnaire('?url=https://example.org/missing.json', '', fetchReturning(404, ''));
        expect(result).toEqual({ error: expect.stringContaining('HTTP 404') });
    });

    it('prefers a survey in the fragment over ?url=', async () => {
        const fetchFn = fetchReturning(200, '{}');
        const { hash } = parts(await createQuestionnaireLink(BASE, questionnaire, false));
        expect(await readLinkedQuestionnaire('?url=https://example.org/s.json', hash, fetchFn)).toEqual({ json: questionnaire });
        expect(fetchFn).not.toHaveBeenCalled();
    });
});

describe('removeLinkParameters', () => {
    it('removes the survey but keeps other parameters', () => {
        expect(removeLinkParameters('https://example.org/phoenix/?url=https%3A%2F%2Fa&x=1#questionnaire=abc')).toBe(
            'https://example.org/phoenix/?x=1',
        );
        expect(removeLinkParameters('https://example.org/phoenix/#questionnaire-deflate=abc&keep=1')).toBe(
            'https://example.org/phoenix/#keep=1',
        );
    });
});
