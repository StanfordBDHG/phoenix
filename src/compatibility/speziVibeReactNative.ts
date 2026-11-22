import type { Questionnaire, QuestionnaireItem } from '../types/fhir';
import { checkStructure, findExtension, Issue, issue, itemControlCode, label, Target, URLS, walkItems } from './types';

// Rules for the questionnaire package of the SpeziVibe React Native template
// (https://github.com/StanfordSpezi/SpeziVibeReactNativeTemplate, packages/questionnaire). It is not published to npm:
// `create-spezivibe-app` copies the template's main branch into each new app, so these rules describe apps generated
// from main as of commit 443995a (2026-03-15). The package's behaviour hasn't changed since it was created.
// File references are relative to packages/questionnaire/src at that commit.

const RENDERED_TYPES = ['group', 'display', 'boolean', 'string', 'text', 'integer', 'decimal', 'date', 'dateTime', 'time', 'choice', 'open-choice'];

export const checkSpeziVibeReactNative = (questionnaire: Questionnaire): Issue[] => {
    const issues = checkStructure(questionnaire);
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
            required
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
        if (required && conditional) {
            add('error', 'rn/required-conditional', `${label(item)} is required and only shown when a condition holds. While it's hidden, Submit silently does nothing, because the app still requires an answer. Make it optional.`);
        }

        if (item.type === 'choice' || item.type === 'open-choice') {
            const options = item.answerOption ?? [];
            if (options.length === 0) {
                unanswerable(`has no answerOption${item.answerValueSet ? ' (the app ignores answerValueSet)' : ''}, so the app shows no choices`, 'List the choices in answerOption.');
            } else if (options.some((option) => !option.valueCoding)) {
                add('warning', 'rn/non-coding-option', `Some options of ${label(item)} aren't valueCoding. Participants can pick them, but the answer is left out of the response, and conditions on it never match. Use valueCoding for every option.`);
            }
            if (item.type === 'open-choice') {
                add('warning', 'rn/open-choice', `${label(item)} is open-choice, but the app has no free-text "other" entry: it works like a plain choice.`);
            }
        }

        // Limits (validation/schema-builder.ts only builds rules for required items).
        const hasLimit = [URLS.minValue, URLS.maxValue].some((url) => findExtension(item, url));
        if (hasLimit && ['date', 'dateTime', 'time'].includes(item.type)) {
            add('warning', 'rn/date-limit-ignored', `The app ignores the minimum and maximum of ${label(item)}.`);
        } else if (hasLimit && !item.required) {
            add('warning', 'rn/limit-optional', `The app only enforces the minimum and maximum of required questions, so ${label(item)} accepts any value. Make it required, or check the value elsewhere.`);
        }
        if (item.type === 'time') {
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
                if (options.length > 0 && !matches) {
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

export const speziVibeReactNativeTarget: Target = {
    id: 'spezivibe-react-native',
    name: 'SpeziVibe React Native template (questionnaire package, main as of 2026-03-15)',
    check: checkSpeziVibeReactNative,
};
