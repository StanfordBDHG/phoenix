import type { Extension, Questionnaire, QuestionnaireItem } from '../types/fhir';

// Checks a FHIR Questionnaire against what a specific app renderer actually supports. FHIR allows far more than
// any renderer implements, and most gaps are silent: the app shows the survey but ignores a rule. These checks
// surface those gaps before a study ships.

/**
 * - `error`: the app can't load the survey, crashes, or a participant can't finish it.
 * - `warning`: the app loads the survey but ignores or changes part of it, without telling anyone.
 */
export type Severity = 'error' | 'warning';

export interface Issue {
    severity: Severity;
    /** Stable identifier of the rule, e.g. `rkof/nested-group`. */
    rule: string;
    /** The item the issue is about, if any. */
    linkId?: string;
    /** What happens in the app, and how to fix it. */
    message: string;
}

export interface Target {
    /** Stable identifier, e.g. `researchkit-on-fhir@2.0.10`. */
    id: string;
    /** Human-readable name, e.g. `ResearchKitOnFHIR 2.0.10 (SpeziQuestionnaire 1.x)`. */
    name: string;
    check: (questionnaire: Questionnaire) => Issue[];
}

export const URLS = {
    minValue: 'http://hl7.org/fhir/StructureDefinition/minValue',
    maxValue: 'http://hl7.org/fhir/StructureDefinition/maxValue',
    itemControl: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
    sliderStepValue: 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue',
    hidden: 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden',
    unit: 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit',
    maxDecimalPlaces: 'http://hl7.org/fhir/StructureDefinition/maxDecimalPlaces',
    regex: 'http://hl7.org/fhir/StructureDefinition/regex',
    entryFormat: 'http://hl7.org/fhir/StructureDefinition/entryFormat',
    minLength: 'http://hl7.org/fhir/StructureDefinition/minLength',
    validationTextBiodesign: 'http://biodesign.stanford.edu/fhir/StructureDefinition/validationtext',
    validationTextBdh: 'http://bdh.stanford.edu/fhir/StructureDefinition/validationtext',
    renderingXhtml: 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml',
    renderingMarkdown: 'http://hl7.org/fhir/StructureDefinition/rendering-markdown',
};

/** An item together with where it sits in the questionnaire. */
export interface ItemContext {
    item: QuestionnaireItem;
    /** Ancestors, outermost first. */
    parents: QuestionnaireItem[];
}

export const walkItems = (questionnaire: Questionnaire): ItemContext[] => {
    const result: ItemContext[] = [];
    const visit = (items: QuestionnaireItem[] | undefined, parents: QuestionnaireItem[]) => {
        for (const item of items ?? []) {
            result.push({ item, parents });
            visit(item.item, [...parents, item]);
        }
    };
    visit(questionnaire.item, []);
    return result;
};

export const findExtension = (item: { extension?: Extension[] }, url: string): Extension | undefined =>
    item.extension?.find((extension) => extension.url === url);

export const itemControlCode = (item: QuestionnaireItem): string | undefined =>
    findExtension(item, URLS.itemControl)?.valueCodeableConcept?.coding?.[0]?.code;

export const label = (item: QuestionnaireItem): string => (item.text ? `"${item.text}"` : `item ${item.linkId}`);

export const issue = (severity: Severity, rule: string, item: QuestionnaireItem | undefined, message: string): Issue => ({
    severity,
    rule,
    linkId: item?.linkId,
    message,
});

/** Checks that hold for every renderer: these are errors in the Questionnaire itself. */
export const checkStructure = (questionnaire: Questionnaire): Issue[] => {
    const issues: Issue[] = [];
    const contexts = walkItems(questionnaire);
    const seen = new Set<string>();
    for (const { item } of contexts) {
        if (seen.has(item.linkId)) {
            issues.push(
                issue('error', 'fhir/duplicate-link-id', item, `linkId "${item.linkId}" is used more than once. Every item needs a unique linkId.`),
            );
        }
        seen.add(item.linkId);
    }
    const byLinkId = new Map(contexts.map(({ item }) => [item.linkId, item]));
    for (const { item } of contexts) {
        for (const condition of item.enableWhen ?? []) {
            if (!byLinkId.has(condition.question)) {
                issues.push(
                    issue(
                        'error',
                        'fhir/unknown-enable-when-question',
                        item,
                        `${label(item)} has a condition on "${condition.question}", but no item has that linkId.`,
                    ),
                );
            }
        }
    }
    return issues;
};
