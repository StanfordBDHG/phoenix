import type { Questionnaire, QuestionnaireItem } from '../types/fhir';
import { checkQuestionnaire, getTarget, TARGET_IDS } from './index';
import { compareVersions } from './versions';
import { RKOF_VERSIONS } from './researchKitOnFHIR';
import verified from './verified-renderers.json';
import { URLS } from './types';

const SYSTEM = 'http://example.org/codes';
const coding = (code: string) => ({ system: SYSTEM, code, display: code.toUpperCase() });
// Phoenix's FHIR types mark every answer[x] of a condition as required, so fixtures are written as plain objects.
type Item = Partial<Omit<QuestionnaireItem, 'enableWhen' | 'item'>> & { linkId: string; type: string; enableWhen?: object[]; item?: Item[] };
const q = (...item: Item[]): Questionnaire => ({ resourceType: 'Questionnaire', status: 'draft', item }) as unknown as Questionnaire;
const slider = (linkId: string, min?: number, max?: number, step?: number): Item => ({
    linkId,
    type: 'integer',
    text: 'Pain',
    extension: [
        { url: URLS.itemControl, valueCodeableConcept: { coding: [{ code: 'slider' }] } },
        ...(min !== undefined ? [{ url: URLS.minValue, valueInteger: min }] : []),
        ...(max !== undefined ? [{ url: URLS.maxValue, valueInteger: max }] : []),
        ...(step !== undefined ? [{ url: URLS.sliderStepValue, valueInteger: step }] : []),
    ],
});
const rules = (questionnaire: Questionnaire, target: string) =>
    checkQuestionnaire(questionnaire, target).map((i) => `${i.severity} ${i.rule} ${i.linkId ?? ''}`.trim());

// A typical survey built in Phoenix: it should pass on iOS without any issue.
const wellFormed = q(
    { linkId: 'intro', type: 'display', text: 'Welcome' },
    { linkId: 'smoker', type: 'choice', text: 'Do you smoke?', required: true, answerOption: [{ valueCoding: coding('yes') }, { valueCoding: coding('no') }] },
    {
        linkId: 'packs',
        type: 'integer',
        text: 'Packs per day',
        enableWhen: [{ question: 'smoker', operator: '=', answerCoding: coding('yes') }],
        extension: [{ url: URLS.minValue, valueInteger: 0 }, { url: URLS.maxValue, valueInteger: 10 }],
    },
    slider('pain', 0, 10, 1),
    {
        linkId: 'vitals',
        type: 'group',
        text: 'Vitals',
        item: [
            { linkId: 'weight', type: 'decimal', text: 'Weight', extension: [{ url: URLS.minValue, valueDecimal: 2.5 }] },
            { linkId: 'note', type: 'display', text: 'Measure in the morning' },
        ],
    },
);

describe('targets', () => {
    it('resolves aliases and versions', () => {
        expect(getTarget('rkof').id).toBe('researchkit-on-fhir@2.0.10');
        expect(getTarget('ios@2.0.6').id).toBe('researchkit-on-fhir@2.0.6');
        expect(getTarget('react-native').id).toBe('spezivibe-react-native@1.1.0');
        expect(getTarget('rn@1.0.0').id).toBe('spezivibe-react-native@1.0.0');
        expect(getTarget('rkof').note).toBeUndefined();
        expect(() => getTarget('android')).toThrow('Unknown target');
        expect(TARGET_IDS).toContain('researchkit-on-fhir@3.0.0-beta.2');
        expect(TARGET_IDS).toContain('spezivibe-react-native@1.0.0');
    });

    it('uses the newest rules for a newer version, and says so', () => {
        const target = getTarget('ios@3.1.0');
        expect(target.id).toBe('researchkit-on-fhir@3.0.0-beta.2');
        expect(target.note).toBe(
            'ResearchKitOnFHIR 3.1.0 is newer than the checker\'s rules, which were last checked against 3.0.0-beta.2. ' +
                'Its rules were used, so newer features may be reported as unsupported.',
        );
        expect(getTarget('react-native@1.2.0').id).toBe('spezivibe-react-native@1.1.0');
    });

    it('uses the closest earlier rules for a version between known ones', () => {
        const target = getTarget('ios@2.0.8');
        expect(target.id).toBe('researchkit-on-fhir@2.0.7');
        expect(target.note).toContain('the rules for 2.0.7, the closest earlier one, were used');
    });

    it('rejects versions it does not cover', () => {
        expect(() => getTarget('ios@1.3.0')).toThrow('The checker covers ResearchKitOnFHIR 2.0.0 and later, not 1.3.0.');
        expect(() => getTarget('ios@latest')).toThrow('"latest" isn\'t a ResearchKitOnFHIR version');
    });

    it('orders versions, with pre-releases before their release', () => {
        expect(compareVersions('2.0.10', '2.0.7')).toBeGreaterThan(0);
        expect(compareVersions('3.0.0-beta.2', '2.0.10')).toBeGreaterThan(0);
        expect(compareVersions('3.0.0-beta.1', '3.0.0')).toBeLessThan(0);
        expect(compareVersions('3.0.0-beta.2', '3.0.0-beta.1')).toBeGreaterThan(0);
        expect(compareVersions('2.0.4', '2.0.4')).toBe(0);
        expect(compareVersions('2.0', '2.0.0')).toBe(0);
        expect(compareVersions('2.1', '2.0.10')).toBeGreaterThan(0);
        expect(compareVersions('3.0.0-beta.2', '3.0.0-beta.2')).toBe(0);
    });
});

describe('structure (all targets)', () => {
    it('reports duplicate linkIds and conditions on unknown items', () => {
        const questionnaire = q(
            { linkId: 'a', type: 'string', text: 'A' },
            { linkId: 'a', type: 'string', text: 'B', enableWhen: [{ question: 'missing', operator: 'exists', answerBoolean: true }] },
        );
        for (const target of ['rkof', 'react-native']) {
            expect(rules(questionnaire, target)).toEqual(expect.arrayContaining(['error fhir/duplicate-link-id a', 'error fhir/unknown-enable-when-question a']));
        }
    });

    it('lists errors before warnings', () => {
        const issues = checkQuestionnaire(q({ linkId: 'u', type: 'url', text: 'URL' }, slider('s')));
        expect(issues.map((i) => i.severity)).toEqual(['error', 'warning']);
    });
});

describe('ResearchKitOnFHIR', () => {
    it('passes a typical Phoenix survey', () => {
        expect(rules(wellFormed, 'rkof')).toEqual([]);
        expect(rules(wellFormed, 'rkof@3.0.0-beta.2')).toEqual([]);
    });

    it('flags decimal limits only before 2.0.7', () => {
        expect(rules(wellFormed, 'rkof@2.0.6')).toEqual(['warning rkof/decimal-limit weight']);
        expect(rules(wellFormed, 'rkof@2.0.7')).toEqual([]);
    });

    it('flags groups inside groups, and drops what is below them', () => {
        const questionnaire = q({
            linkId: 'outer',
            type: 'group',
            text: 'Outer',
            item: [{ linkId: 'inner', type: 'group', text: 'Inner', item: [{ linkId: 'lost', type: 'url', text: 'Lost' }] }],
        });
        expect(rules(questionnaire, 'rkof')).toEqual(['warning rkof/nested-group inner']);
    });

    it('flags items in a group that lose text, conditions, hidden or the camera', () => {
        const questionnaire = q(
            { linkId: 'gate', type: 'boolean', text: 'Gate' },
            {
                linkId: 'g',
                type: 'group',
                text: 'G',
                enableWhen: [{ question: 'gate', operator: '=', answerBoolean: true }],
                item: [
                    { linkId: 'no-text', type: 'string' },
                    { linkId: 'cond', type: 'string', text: 'Cond', enableWhen: [{ question: 'gate', operator: '=', answerBoolean: true }] },
                    { linkId: 'hidden', type: 'string', text: 'Hidden', extension: [{ url: URLS.hidden, valueBoolean: true }] },
                    { linkId: 'photo', type: 'attachment', text: 'Photo' },
                ],
            },
        );
        expect(rules(questionnaire, 'rkof')).toEqual([
            'warning rkof/group-item-without-text no-text',
            'warning rkof/enable-when-in-group cond',
            'warning rkof/hidden-in-group hidden',
            'warning rkof/attachment-in-group photo',
        ]);
    });

    it.each([
        [{ operator: '=', answerDate: '2026-01-01' }, 'error'],
        [{ operator: '>', answerDate: '2026-01-01' }, 'none'],
        [{ operator: '=', answerTime: '10:00:00' }, 'error'],
        [{ operator: '=', answerDateTime: '2026-01-01T10:00:00Z' }, 'error'],
        [{ operator: '=', answerString: 'x' }, 'error'],
        [{ operator: 'exists', answerBoolean: true }, 'none'],
        [{ operator: '>', answerBoolean: true }, 'error'],
        [{ operator: '>', answerCoding: coding('yes') }, 'error'],
        [{ operator: '>=', answerInteger: 1 }, 'none'],
        [{ operator: '=', answerCoding: { code: 'yes', display: 'YES' } }, 'warning'],
    ])('checks condition %j', (condition, expected) => {
        const issues = checkQuestionnaire(q({ linkId: 'x', type: 'string', text: 'X', enableWhen: [{ question: 'x', ...condition }] }));
        expect(issues.map((i) => i.severity)[0] ?? 'none').toBe(expected);
    });

    it('applies version-specific condition bugs', () => {
        const conditions = [
            { question: 'n', operator: '>', answerInteger: 1 },
            { question: 'n', operator: '<', answerInteger: 5 },
        ];
        const questionnaire = q({ linkId: 'n', type: 'integer', text: 'N' }, { linkId: 'x', type: 'string', text: 'X', enableBehavior: 'any', enableWhen: conditions });
        expect(rules(questionnaire, 'rkof@2.0.2')).toEqual(['error rkof/enable-when-unsupported x', 'error rkof/enable-when-unsupported x']);
        expect(rules(questionnaire, 'rkof@2.0.3')).toEqual(['warning rkof/enable-behavior-swapped x']);
        expect(rules(q(...wellFormed.item!), 'rkof@2.0.5')).toEqual(['warning rkof/enable-when-group-selector packs', 'warning rkof/decimal-limit weight']);
        // 2.0.4 is affected too (an equal-version comparison used to miss it).
        expect(rules(q(...wellFormed.item!), 'rkof@2.0.4')).toEqual(['warning rkof/enable-when-group-selector packs', 'warning rkof/decimal-limit weight']);
    });

    it.each([
        [slider('s', 0, 10, 1), 'none'],
        [slider('s', 0, 100, 10), 'none'],
        [slider('s', 0, 100, 1), 'error'],
        [slider('s', 0, 10, 3), 'error'],
        [slider('s', 5, 5), 'error'],
        [slider('s', 0, 20000, 2000), 'error'],
        [slider('s', -10000, 10000, 2000), 'none'],
        [slider('s', undefined, 10), 'error'],
        [{ ...slider('s', 0, 10), type: 'decimal' }, 'warning'],
    ])('checks slider %#', (item, expected) => {
        expect(checkQuestionnaire(q(item)).map((i) => i.severity)[0] ?? 'none').toBe(expected);
    });

    it('explains the 13-step slider limit with a usable step', () => {
        expect(checkQuestionnaire(q(slider('s', 0, 100, 1)))[0].message).toContain('at most 13. Use a step of 10,');
        expect(checkQuestionnaire(q(slider('s', 0, 97, 1)))[0].message).toContain('No step divides this range evenly');
    });

    it('checks choice options and repeats', () => {
        const questionnaire = q(
            { linkId: 'none', type: 'choice', text: 'None', answerOption: [{ valueString: 'a' }] },
            { linkId: 'some', type: 'choice', text: 'Some', answerOption: [{ valueCoding: coding('a') }, { valueInteger: 1 }] },
            { linkId: 'ext', type: 'choice', text: 'Ext', answerValueSet: 'http://example.org/vs' },
            { linkId: 'multi', type: 'choice', text: 'Multi', repeats: true, answerOption: [{ valueCoding: coding('a') }] },
        );
        expect(rules(questionnaire, 'rkof')).toEqual([
            'error rkof/no-usable-options none',
            'error rkof/no-usable-options ext',
            'warning rkof/dropped-options some',
            'warning rkof/repeats-ignored multi',
        ]);
    });

    it('accepts a contained ValueSet', () => {
        const questionnaire = {
            ...q({ linkId: 'c', type: 'choice', text: 'C', answerValueSet: '#vs' }),
            contained: [{ resourceType: 'ValueSet', id: 'vs', status: 'active', compose: { include: [{ system: SYSTEM, concept: [{ code: 'a', display: 'A' }] }] } }],
        } as unknown as Questionnaire;
        expect(rules(questionnaire, 'rkof')).toEqual([]);
    });
});

describe('SpeziVibe React Native 1.0.0', () => {
    it('reports what a typical Phoenix survey loses', () => {
        expect(rules(wellFormed, 'react-native@1.0.0')).toEqual([
            'warning rn/limit-optional packs',
            'warning rn/limit-optional pain',
            'warning rn/ignored pain',
            'warning rn/limit-optional weight',
        ]);
    });

    it('flags required items participants cannot answer', () => {
        const questionnaire = q(
            { linkId: 'gate', type: 'boolean', text: 'Gate' },
            { linkId: 'cond', type: 'string', text: 'Cond', required: true, enableWhen: [{ question: 'gate', operator: '=', answerBoolean: true }] },
            { linkId: 'photo', type: 'attachment', text: 'Photo', required: true },
            { linkId: 'vs', type: 'choice', text: 'VS', required: true, answerValueSet: '#x' },
            { linkId: 'q', type: 'string', text: 'Q', item: [{ linkId: 'child', type: 'string', text: 'Child', required: true }] },
            { linkId: 'opt', type: 'quantity', text: 'Opt' },
        );
        expect(rules(questionnaire, 'react-native@1.0.0')).toEqual([
            'error rn/required-conditional cond',
            'error rn/required-unanswerable photo',
            'error rn/required-unanswerable vs',
            'error rn/required-unanswerable child',
            'warning rn/not-shown opt',
        ]);
    });

    it('flags choice answers and conditions that are lost', () => {
        const questionnaire = q(
            { linkId: 'c', type: 'open-choice', text: 'C', answerOption: [{ valueCoding: coding('a') }, { valueString: 'b' }] },
            { linkId: 'x', type: 'string', text: 'X', enableWhen: [{ question: 'c', operator: '=', answerCoding: { code: 'a' } }] },
        );
        expect(rules(questionnaire, 'react-native@1.0.0')).toEqual([
            'warning rn/non-coding-option c',
            'warning rn/open-choice c',
            'warning rn/enable-when-coding-mismatch x',
        ]);
    });
});

describe('SpeziVibe React Native 1.1.0', () => {
    it('no longer reports what 1.1.0 fixed', () => {
        expect(rules(wellFormed, 'react-native@1.1.0')).toEqual(['warning rn/ignored pain']);
        const time = q({ linkId: 't', type: 'time', text: 'T' });
        expect(rules(time, 'react-native@1.1.0')).toEqual([]);
    });

    it('reports questions it cannot show as warnings, since they no longer block Submit', () => {
        const questionnaire = q(
            { linkId: 'gate', type: 'boolean', text: 'Gate' },
            { linkId: 'cond', type: 'string', text: 'Cond', required: true, enableWhen: [{ question: 'gate', operator: '=', answerBoolean: true }] },
            { linkId: 'photo', type: 'attachment', text: 'Photo', required: true },
        );
        expect(rules(questionnaire, 'react-native@1.1.0')).toEqual(['warning rn/not-shown photo']);
    });

    it('accepts string and integer options, but not other kinds', () => {
        const options = (...answerOption: object[]) => q({ linkId: 'c', type: 'choice', text: 'C', answerOption });
        expect(rules(options({ valueString: 'a' }, { valueInteger: 1 }, { valueCoding: coding('b') }), 'react-native@1.1.0')).toEqual([]);
        expect(rules(options({ valueString: 'a' }, { valueDate: '2026-01-01' }), 'react-native@1.1.0')).toEqual([
            'warning rn/non-coding-option c',
        ]);
    });
});

describe('verified-renderers.json', () => {
    it('matches the newest ResearchKitOnFHIR version the rules list', () => {
        const rkof = verified.renderers.find((r) => r.name === 'ResearchKitOnFHIR');
        expect(rkof?.verified).toBe(RKOF_VERSIONS[RKOF_VERSIONS.length - 1]);
    });
});
