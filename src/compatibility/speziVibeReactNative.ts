import type { Questionnaire, QuestionnaireItem } from '../types/fhir';
import { checkStructure, findExtension, Issue, issue, itemControlCode, label, Target, URLS, walkItems } from './types';
import { compareVersions, resolveVersion } from './versions';

// Rules for the questionnaire package of the SpeziVibe React Native template
// (https://github.com/StanfordSpezi/SpeziVibeReactNativeTemplate, packages/questionnaire). It is not published to npm:
// `create-spezivibe-app` copies the template into each new app, so an app keeps the package version it was created
// with; it's in the app's packages/questionnaire/package.json.
// - 1.0.0: the package as created, up to commit 0762807. File references are relative to packages/questionnaire/src.
// - 1.1.0: SpeziVibeReactNativeTemplate#25 (commit 0aca805), which validates optional and only shown questions, saves
//   string and integer choice answers, and saves time answers in FHIR format.

export const RN_VERSIONS = ['1.0.0', '1.1.0'];
export const RN_DEFAULT_VERSION = '1.1.0';

const RENDERED_TYPES = ['group', 'display', 'boolean', 'string', 'text', 'integer', 'decimal', 'date', 'dateTime', 'time', 'choice', 'open-choice'];

export const checkSpeziVibeReactNative = (questionnaire: Questionnaire, version: string = RN_DEFAULT_VERSION): Issue[] => {
    const issues = checkStructure(questionnaire);
    // Fixed in 1.1.0: hidden or unshown questions no longer block Submit, limits apply to optional questions, string
    // and integer choice answers are saved, and time answers are saved as hh:mm:ss.
    const fixed = compareVersions(version, '1.1.0') >= 0;
    const contexts = walkItems(questionnaire);
    const byLinkId = new Map(contexts.map(({ item }) => [item.linkId, item]));

    for (const { item, parents } of contexts) {
        const add = (severity: 'error' | 'warning', rule: string, message: string) => issues.push(issue(severity, rule, item, message));
        const parent = parents[parents.length - 1];
        // Only groups render their children (components/questions/GroupQuestion.tsx); children of a question are lost.
        const underQuestion = parents.some((p) => p.type !== 'group');
        const conditional = [item, ...parents].some((i) => (i.enableWhen ?? []).length > 0);
        const required = !!item.required && item.type !== 'group' && item.type !== 'display';
        // A required item the participant can't see or answer blocks Submit, with no message
        // (validation/schema-builder.ts validates every required item; it ignores enableWhen and rendering).
        const unanswerable = (why: string, fix: string) =>
            required && !fixed
                ? add('error', 'rn/required-unanswerable', `${label(item)} is required but ${why}, so Submit silently does nothing. ${fix}`)
                : add('warning', 'rn/not-shown', `${label(item)} ${why}. ${fix}`);

        if (underQuestion) {
            unanswerable(`is nested under ${label(parent as QuestionnaireItem)}, which is a question, not a group, so the app never shows it`, 'Put it in a group instead.');
            continue;
        }
        if (!RENDERED_TYPES.includes(item.type)) {
            unanswerable(`has type "${item.type}", which the app doesn't support and leaves out`, 'Use a supported type, or remove it.');
            continue;
        }
        if (required && conditional && !fixed) {
            add('error', 'rn/required-conditional', `${label(item)} is required and only shown when a condition holds. While it's hidden, Submit silently does nothing, because the app still requires an answer. Make it optional.`);
        } else if (conditional && !fixed && item.type !== 'group' && item.type !== 'display') {
            add('warning', 'rn/hidden-answer-kept', `${label(item)} is only shown when a condition holds. If a participant answers it and then changes an earlier answer so it's hidden, the app still submits its answer and uses it in other conditions. Fixed in questionnaire package 1.1.0.`);
        }

        if (item.type === 'choice' || item.type === 'open-choice') {
            const options = item.answerOption ?? [];
            if (options.length === 0) {
                unanswerable(`has no answerOption${item.answerValueSet ? ' (the app ignores answerValueSet)' : ''}, so the app shows no choices`, 'List the choices in answerOption.');
            } else if (!fixed && options.some((option) => !option.valueCoding)) {
                add('warning', 'rn/non-coding-option', `Some options of ${label(item)} aren't valueCoding. Participants can pick them, but the answer is left out of the response, and conditions on it never match. Use valueCoding for every option.`);
            } else if (fixed && options.some((option) => !option.valueCoding && option.valueString === undefined && option.valueInteger === undefined)) {
                add('warning', 'rn/non-coding-option', `Some options of ${label(item)} are dates, times or references, which the app can't offer properly: their answers are left out of the response. Use valueCoding, valueString or valueInteger.`);
            }
            if (item.type === 'open-choice') {
                add('warning', 'rn/open-choice', `${label(item)} is open-choice, but the app has no free-text "other" entry: it works like a plain choice.`);
            }
        }

        // Limits (validation/schema-builder.ts only builds rules for required items).
        const hasLimit = [URLS.minValue, URLS.maxValue].some((url) => findExtension(item, url));
        if (hasLimit && ['date', 'dateTime', 'time'].includes(item.type)) {
            add('warning', 'rn/date-limit-ignored', `The app ignores the minimum and maximum of ${label(item)}.`);
        } else if (hasLimit && !item.required && !fixed) {
            add('warning', 'rn/limit-optional', `The app only enforces the minimum and maximum of required questions, so ${label(item)} accepts any value. Make it required, or check the value elsewhere.`);
        }
        if (item.type === 'date' && !fixed) {
            add('warning', 'rn/date-utc', `The app saves answers to the date question ${label(item)} through UTC, so in time zones ahead of UTC (Europe, Asia, …) the day before the one picked is saved. Fixed in questionnaire package 1.1.0.`);
        }
        if (item.type === 'time' && !fixed) {
            add('warning', 'rn/time-format', `The app saves answers to the time question ${label(item)} as "HH:MM" without checking the format, but FHIR requires "hh:mm:ss", so the response may be invalid FHIR.`);
        }

        // Conditions (enablewhen/EnableWhenEvaluator.ts).
        for (const condition of item.enableWhen ?? []) {
            if (condition.answerQuantity !== undefined || condition.answerReference !== undefined) {
                add('warning', 'rn/enable-when-unsupported', `A condition on ${label(item)} compares against ${condition.answerQuantity !== undefined ? 'answerQuantity' : 'answerReference'}, which the app treats as never true, so the item is never shown.`);
            }
            if (condition.answerCoding) {
                const target = byLinkId.get(condition.question);
                const options = target?.answerOption?.map((option) => option.valueCoding).filter(Boolean) ?? [];
                const matches = options.some((coding) => coding?.code === condition.answerCoding?.code && coding?.system === condition.answerCoding?.system);
                // With "!=", a coding no option has is simply always true, which isn't the problem described here.
                if (condition.operator !== '!=' && options.length > 0 && !matches) {
                    add('warning', 'rn/enable-when-coding-mismatch', `A condition on ${label(item)} never matches: no option of ${target ? label(target) : condition.question} has exactly that code and system. The app compares both, so a missing or different system counts as different.`);
                }
            }
        }

        // Elements and extensions the app ignores.
        const ignored: string[] = [];
        if (item.repeats) ignored.push('repeats (it accepts one answer)');
        if (item.readOnly) ignored.push('readOnly (it stays editable)');
        if (findExtension(item, URLS.hidden)?.valueBoolean) ignored.push('questionnaire-hidden (it is shown)');
        if (item.initial?.length || item.answerOption?.some((option) => option.initialSelected)) ignored.push('initial values (it starts empty)');
        if (itemControlCode(item) === 'slider') ignored.push('the slider control (it shows a number field)');
        else if (itemControlCode(item)) ignored.push(`the "${itemControlCode(item)}" control`);
        for (const [url, name] of [
            [URLS.sliderStepValue, 'sliderStepValue'],
            [URLS.maxDecimalPlaces, 'maxDecimalPlaces'],
            [URLS.unit, 'the unit'],
            [URLS.regex, 'regex'],
            [URLS.validationTextBiodesign, 'the validation message'],
            [URLS.validationTextBdh, 'the validation message'],
            [URLS.entryFormat, 'entryFormat (placeholder)'],
            [URLS.minLength, 'minLength'],
        ]) {
            if (findExtension(item, url) && !ignored.includes(name)) ignored.push(name);
        }
        if (ignored.length > 0) {
            add('warning', 'rn/ignored', `The app ignores these settings of ${label(item)}: ${ignored.join(', ')}.`);
        }
        if (item._text?.extension?.length) {
            add('warning', 'rn/raw-text-extension', `The app prints the first extension on the text of ${label(item)} as plain text below the question, so formatted (XHTML or Markdown) text appears as raw markup.`);
        }
    }
    return issues;
};

/** When template PR #25 (questionnaire package 1.1.0) was merged. Apps created before it have 1.0.0. */
export const RN_1_1_0_DATE = '2026-11-22';

export const speziVibeReactNativeTarget = (requested?: string): Target => {
    const resolved = resolveVersion('The SpeziVibe React Native questionnaire package', RN_VERSIONS, requested ?? RN_DEFAULT_VERSION);
    const { version } = resolved;
    // Each app keeps the package version it was created with, so the newest isn't a safe guess for an existing app.
    const note =
        resolved.note ??
        (requested === undefined
            ? `No questionnaire package version was given, so the rules for ${version} were used. Apps created before ` +
              `${RN_1_1_0_DATE} have version 1.0.0 (see the app's packages/questionnaire/package.json); check those ` +
              `with spezivibe-react-native@1.0.0.`
            : undefined);
    return {
        id: `spezivibe-react-native@${version}`,
        name: `SpeziVibe React Native template (questionnaire package ${version})`,
        check: (questionnaire) => checkSpeziVibeReactNative(questionnaire, version),
        note,
    };
};
