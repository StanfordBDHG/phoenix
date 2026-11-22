import type { Questionnaire, QuestionnaireItem, QuestionnaireItemAnswerOption, QuestionnaireItemEnableWhen, ValueSet } from '../types/fhir';
import { checkStructure, findExtension, Issue, issue, itemControlCode, label, Target, URLS, walkItems } from './types';

// Rules for ResearchKitOnFHIR (https://github.com/StanfordBDHG/ResearchKitOnFHIR), which SpeziQuestionnaire 1.x uses
// to turn a Questionnaire into a ResearchKit task on iOS. Researched from the source of each release; file references
// are to QuestionnaireItem+ResearchKit.swift ("CONV") and NavigationRules.swift ("NAV") at 3.0.0-beta.2, and to
// FHIRModelsExtensions' Questionnaire+Extensions.swift ("FME"), which holds the extension parsing from 3.0.0-beta.1.
// Versions before 2.0.0 are not covered; SpeziQuestionnaire 1.2.2 and later require 2.0.0 or newer.

export const RKOF_VERSIONS = ['2.0.0', '2.0.1', '2.0.2', '2.0.3', '2.0.4', '2.0.5', '2.0.6', '2.0.7', '2.0.10', '3.0.0-beta.2'];
/** What SpeziQuestionnaire 1.3.x resolves to today (it allows 2.0.4 up to, but not including, 3.0.0). */
export const RKOF_DEFAULT_VERSION = '2.0.10';

/** Compares `major.minor.patch[-beta.n]` versions; a pre-release sorts before its release. */
export const compareVersions = (a: string, b: string): number => {
    const parse = (v: string) => {
        const [core, pre] = v.split('-');
        const nums = core.split('.').map(Number);
        const preNum = pre ? Number(pre.replace(/\D+/g, '')) || 0 : Infinity;
        return [...nums, preNum];
    };
    const [pa, pb] = [parse(a), parse(b)];
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

const QUESTION_TYPES = ['boolean', 'decimal', 'integer', 'date', 'dateTime', 'time', 'string', 'text', 'url', 'choice', 'open-choice', 'reference', 'quantity', 'question'];

const usableOption = (option: QuestionnaireItemAnswerOption): boolean =>
    !!option.valueCoding?.code && !!option.valueCoding.system && !!option.valueCoding.display;

// CONV:274-295: only a contained ValueSet referenced as `#id`, reading the first include's concepts.
const usableValueSetConcepts = (questionnaire: Questionnaire, answerValueSet: string): number => {
    if (!answerValueSet.startsWith('#')) return 0;
    const valueSet = (questionnaire.contained as Array<ValueSet & { resourceType?: string }> | undefined)?.find(
        (resource) => resource.resourceType === 'ValueSet' && resource.id === answerValueSet.slice(1),
    );
    const include = valueSet?.compose?.include?.[0];
    if (!include?.system) return 0;
    return (include.concept ?? []).filter((concept) => !!concept.display).length;
};

const enableWhenAnswerType = (condition: QuestionnaireItemEnableWhen): string => {
    const keys = ['Boolean', 'Decimal', 'Integer', 'Date', 'DateTime', 'Time', 'String', 'Coding', 'Quantity', 'Reference'];
    const record = condition as unknown as Record<string, unknown>;
    return keys.find((key) => record[`answer${key}`] !== undefined) ?? 'none';
};

const checkEnableWhen = (item: QuestionnaireItem, inGroup: boolean, version: string, hasGroups: boolean): Issue[] => {
    const issues: Issue[] = [];
    const conditions = item.enableWhen ?? [];
    if (conditions.length === 0) return issues;
    const before = (v: string) => compareVersions(version, v) < 0;

    if (inGroup) {
        // NAV:37 attaches the rule to a step with the item's linkId; questions inside a group have no step of their own.
        issues.push(
            issue(
                'warning',
                'rkof/enable-when-in-group',
                item,
                `The condition on ${label(item)} is ignored because the question is inside a group, so it is always shown. Put the condition on the group, or move the question out of the group.`,
            ),
        );
    }

    for (const condition of conditions) {
        const type = enableWhenAnswerType(condition);
        const op = condition.operator;
        const fail = (why: string) =>
            issues.push(issue('error', 'rkof/enable-when-unsupported', item, `The app can't load this survey: the condition on ${label(item)} ${why}`));

        if (op === 'exists' && type !== 'Boolean') {
            fail(`uses "exists", which ResearchKitOnFHIR only supports with answerBoolean.`);
        } else if (['DateTime', 'Time', 'String', 'Quantity', 'Reference'].includes(type)) {
            fail(`compares against answer${type}, which ResearchKitOnFHIR doesn't support. Supported: answerBoolean, answerCoding, answerDate, answerInteger and answerDecimal.`);
        } else if (type === 'Coding' && !['=', '!='].includes(op)) {
            fail(`uses "${op}" on a choice answer. Only "=" and "!=" work for choices.`);
        } else if (type === 'Boolean' && !['exists', '=', '!='].includes(op)) {
            fail(`uses "${op}" on a yes/no answer. Only "exists", "=" and "!=" work.`);
        } else if (type === 'Date' && ['=', '!='].includes(op)) {
            fail(`uses "${op}" on a date. Only ">", "<"${before('2.0.3') ? '' : ', ">=" and "<="'} work for dates.`);
        } else if (type === 'Date' && ['>=', '<='].includes(op) && before('2.0.3')) {
            fail(`uses "${op}" on a date, which needs ResearchKitOnFHIR 2.0.3 or later.`);
        } else if (['Integer', 'Decimal'].includes(type) && ['>', '<'].includes(op) && before('2.0.3')) {
            fail(`uses "${op}" on a number, which needs ResearchKitOnFHIR 2.0.3 or later.`);
        }

        if (type === 'Coding' && !condition.answerCoding?.system) {
            // NAV Coding.predicate returns nil without a system, and the nil predicate is dropped.
            issues.push(
                issue('warning', 'rkof/enable-when-coding-without-system', item, `A condition on ${label(item)} is ignored because its answerCoding has no "system". Add the same system as the answer option.`),
            );
        } else if (type === 'Coding' && !condition.answerCoding?.display && before('2.0.3')) {
            issues.push(
                issue('warning', 'rkof/enable-when-coding-without-display', item, `A condition on ${label(item)} never matches in ResearchKitOnFHIR before 2.0.3, because its answerCoding has no "display". Add the option's display text.`),
            );
        }
    }

    if (conditions.length > 1 && version === '2.0.3') {
        issues.push(
            issue('warning', 'rkof/enable-behavior-swapped', item, `ResearchKitOnFHIR 2.0.3 swaps "all" and "any", so the conditions on ${label(item)} combine the wrong way. Update to 2.0.4 or later.`),
        );
    }
    if (hasGroups && !inGroup && compareVersions(version, '2.0.4') >= 0 && before('2.0.6')) {
        issues.push(
            issue('warning', 'rkof/enable-when-group-selector', item, `In ResearchKitOnFHIR 2.0.4 and 2.0.5, conditions in a survey that contains a group look up answers on the wrong page, so the condition on ${label(item)} may not work. Update to 2.0.6 or later.`),
        );
    }
    return issues;
};

export const checkResearchKitOnFHIR = (questionnaire: Questionnaire, version: string = RKOF_DEFAULT_VERSION): Issue[] => {
    const issues = checkStructure(questionnaire);
    const before = (v: string) => compareVersions(version, v) < 0;
    const contexts = walkItems(questionnaire);
    const hasGroups = contexts.some(({ item }) => item.type === 'group');

    for (const { item, parents } of contexts) {
        const parent = parents[parents.length - 1];
        const inGroup = parent?.type === 'group';
        const deep = parents.some((p, i) => p.type === 'group' && i < parents.length - 1);
        const add = (severity: 'error' | 'warning', rule: string, message: string) => issues.push(issue(severity, rule, item, message));

        // Anything below a group's direct children is lost (CONV:122-129 only converts direct children).
        if (deep) continue;

        if (inGroup) {
            if (item.type === 'group') {
                add('warning', 'rkof/nested-group', `The group ${label(item)} is inside another group. The app shows it as a single free-text field, and the questions inside it are lost. Move them up one level.`);
            } else if (!item.text) {
                add('warning', 'rkof/group-item-without-text', `${label(item)} is inside a group but has no text, so the app leaves it out.`);
            } else if (item.type === 'attachment') {
                add('warning', 'rkof/attachment-in-group', `The attachment ${label(item)} is inside a group, where the app shows a free-text field instead of the camera. Move it out of the group.`);
            }
            if (findExtension(item, URLS.hidden)?.valueBoolean) {
                add('warning', 'rkof/hidden-in-group', `${label(item)} is marked hidden, but hidden is ignored inside a group, so it is shown.`);
            }
        } else if (parent && item.type !== 'group' && before('2.0.3')) {
            add('warning', 'rkof/child-of-question', `${label(item)} is nested under a question, not a group. ResearchKitOnFHIR before 2.0.3 drops it.`);
        }

        if (!(inGroup && item.type === 'group')) {
            issues.push(...checkEnableWhen(item, inGroup, version, hasGroups));
        }

        if (['url', 'reference'].includes(item.type)) {
            add('warning', 'rkof/unsupported-type', `${label(item)} has type "${item.type}", which the app shows as plain free text, without ${item.type === 'url' ? 'checking it is a URL' : 'a way to pick a reference'}.`);
        }

        // Choice options (CONV:274-327).
        if (item.type === 'choice' || item.type === 'open-choice') {
            const options = item.answerOption ?? [];
            const usable = item.answerValueSet ? usableValueSetConcepts(questionnaire, item.answerValueSet) : options.filter(usableOption).length;
            const dropped = item.answerValueSet ? 0 : options.length - usable;
            if (usable === 0) {
                add('error', 'rkof/no-usable-options', `${label(item)} has no options the app can use, so ${inGroup ? 'the question is left out' : 'the question can\'t be answered'}. ${item.answerValueSet ? 'answerValueSet must point to a ValueSet contained in the Questionnaire ("#id") whose first include has a system and concepts with display text.' : 'Each answerOption needs a valueCoding with system, code and display.'}`);
            } else if (dropped > 0) {
                add('warning', 'rkof/dropped-options', `${dropped} of the options of ${label(item)} are left out. The app only shows answerOption.valueCoding entries that have a system, code and display.`);
            }
            if (item.repeats && itemControlCode(item) !== 'check-box') {
                add('warning', 'rkof/repeats-ignored', `${label(item)} allows several answers (repeats), but the app only offers multiple selection when itemControl is "check-box", so it is single-select.`);
            }
        } else if (item.repeats && QUESTION_TYPES.includes(item.type)) {
            add('warning', 'rkof/repeats-ignored', `${label(item)} has repeats set, which the app ignores: it accepts one answer.`);
        }

        // Numeric limits.
        for (const url of [URLS.minValue, URLS.maxValue]) {
            const limit = findExtension(item, url);
            if (!limit) continue;
            const which = url === URLS.minValue ? 'minimum' : 'maximum';
            const numeric = ['integer', 'decimal', 'quantity'].includes(item.type);
            if (numeric && (limit.valueDecimal !== undefined || limit.valueQuantity !== undefined) && before('2.0.7')) {
                add('warning', 'rkof/decimal-limit', `The ${which} of ${label(item)} is a decimal, which ResearchKitOnFHIR before 2.0.7 ignores. Use a whole number, or require 2.0.7 or later.`);
            }
            if (['date', 'dateTime'].includes(item.type) && (limit.valueDateTime !== undefined || limit.valueString !== undefined) && before('3.0.0-beta.1')) {
                add('warning', 'rkof/date-limit', `The ${which} date of ${label(item)} uses ${limit.valueDateTime !== undefined ? 'valueDateTime' : 'valueString'}, which ResearchKitOnFHIR before 3.0 ignores. Use valueDate.`);
            }
            if (item.type === 'time') {
                add('warning', 'rkof/time-limit', `The ${which} of the time question ${label(item)} is ignored by the app.`);
            }
        }

        // Sliders (CONV:220-227; ResearchKit ORKScaleAnswerFormat throws unless these hold).
        if (itemControlCode(item) === 'slider') {
            if (item.type !== 'integer') {
                add('warning', 'rkof/slider-type', `${label(item)} is a slider, but the app only shows sliders for integer questions, so it shows a ${item.type} field.`);
            } else {
                const min = findExtension(item, URLS.minValue)?.valueInteger;
                const max = findExtension(item, URLS.maxValue)?.valueInteger;
                const step = findExtension(item, URLS.sliderStepValue)?.valueInteger ?? 1;
                const crash = (why: string) => add('error', 'rkof/invalid-slider', `ResearchKit rejects the slider ${label(item)}: ${why} The app may crash or fail to show the survey.`);
                if (min === undefined || max === undefined) {
                    crash('it needs both a minimum and a maximum (as whole numbers).');
                } else if (max <= min) {
                    crash('the maximum must be greater than the minimum.');
                } else if (min < -10000 || max > 10000) {
                    crash('the minimum and maximum must be between -10000 and 10000.');
                } else if (step < 1) {
                    crash('the step must be at least 1.');
                } else if ((max - min) % step !== 0) {
                    crash(`the range ${min}–${max} must divide evenly by the step (${step}).`);
                } else if ((max - min) / step > 13) {
                    crash(`it has ${(max - min) / step} steps, and ResearchKit allows at most 13. Use a larger step (e.g. ${Math.ceil((max - min) / 13)}) or a smaller range, or use a number field instead.`);
                }
            }
        } else if (itemControlCode(item) && !['check-box'].includes(itemControlCode(item) ?? '')) {
            add('warning', 'rkof/item-control-ignored', `${label(item)} asks for the "${itemControlCode(item)}" control, which the app ignores. Only "slider" and "check-box" are supported.`);
        }

        // Elements and extensions that are ignored everywhere.
        if (item.initial?.length || item.answerOption?.some((option) => option.initialSelected)) {
            add('warning', 'rkof/initial-ignored', `${label(item)} has an initial value, which the app ignores: the question starts empty.`);
        }
        if (item.readOnly) {
            add('warning', 'rkof/read-only-ignored', `${label(item)} is read-only, which the app ignores: participants can still answer it.`);
        }
        if (item._text?.extension?.some((e) => e.url === URLS.renderingXhtml || e.url === URLS.renderingMarkdown)) {
            add('warning', 'rkof/rendering-ignored', `${label(item)} has formatted (XHTML or Markdown) text, which the app ignores: it shows the plain text.`);
        }
        if (item.prefix && !inGroup && QUESTION_TYPES.includes(item.type)) {
            add('warning', 'rkof/prefix', `The app shows the prefix "${item.prefix}" as the question of ${label(item)}, and moves the text below it in smaller type.`);
        }
    }
    return issues;
};

export const researchKitOnFHIRTarget = (version: string = RKOF_DEFAULT_VERSION): Target => ({
    id: `researchkit-on-fhir@${version}`,
    name: `ResearchKitOnFHIR ${version} (iOS, SpeziQuestionnaire 1.x)`,
    check: (questionnaire) => checkResearchKitOnFHIR(questionnaire, version),
});
