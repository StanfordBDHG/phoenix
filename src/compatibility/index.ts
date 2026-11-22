import type { Questionnaire } from '../types/fhir';
import { RKOF_DEFAULT_VERSION, RKOF_VERSIONS, researchKitOnFHIRTarget } from './researchKitOnFHIR';
import { RN_VERSIONS, speziVibeReactNativeTarget } from './speziVibeReactNative';
import type { Issue, Target } from './types';

export type { Issue, Severity, Target } from './types';
export { RKOF_DEFAULT_VERSION, RKOF_VERSIONS } from './researchKitOnFHIR';
export { RN_1_1_0_DATE, RN_DEFAULT_VERSION, RN_VERSIONS } from './speziVibeReactNative';

export const DEFAULT_TARGET = `researchkit-on-fhir@${RKOF_DEFAULT_VERSION}`;

/** Every target id the checker accepts, for help text and pickers. */
export const TARGET_IDS = [
    ...RKOF_VERSIONS.map((v) => `researchkit-on-fhir@${v}`),
    ...RN_VERSIONS.map((v) => `spezivibe-react-native@${v}`),
];

/**
 * Resolves a target id: `researchkit-on-fhir` (or `ios`, `rkof`) or `spezivibe-react-native` (or `react-native`),
 * optionally with `@<version>`. A version the checker doesn't list uses the closest earlier version's rules, and the
 * target's `note` says so. Throws for an unknown renderer, or a version older than the checker covers.
 */
export const getTarget = (id: string): Target => {
    const [name, version] = id.trim().toLowerCase().split('@');
    if (['researchkit-on-fhir', 'researchkitonfhir', 'rkof', 'ios'].includes(name)) {
        return researchKitOnFHIRTarget(version);
    }
    if (['spezivibe-react-native', 'react-native', 'rn'].includes(name)) {
        return speziVibeReactNativeTarget(version);
    }
    throw new Error(`Unknown target "${id}". Use one of: ${TARGET_IDS.join(', ')}.`);
};

/**
 * Returns the Questionnaire to check from parsed FHIR JSON: the Questionnaire itself, or, for a Bundle (Phoenix
 * exports one when a survey has translations), its first Questionnaire, which is the main language. Translations
 * share its structure, so checking it covers them. Returns undefined for anything else.
 */
export const extractQuestionnaire = (resource: unknown): Questionnaire | undefined => {
    const r = resource as { resourceType?: string; entry?: { resource?: { resourceType?: string } }[] } | null;
    if (r?.resourceType === 'Questionnaire') {
        return r as unknown as Questionnaire;
    }
    if (r?.resourceType === 'Bundle' && Array.isArray(r.entry)) {
        return r.entry.map((e) => e?.resource).find((res) => res?.resourceType === 'Questionnaire') as Questionnaire | undefined;
    }
    return undefined;
};

/** Checks `questionnaire` against `target`, errors first. */
export const checkQuestionnaire = (questionnaire: Questionnaire, target: string | Target = DEFAULT_TARGET): Issue[] => {
    const resolved = typeof target === 'string' ? getTarget(target) : target;
    const issues = resolved.check(questionnaire);
    return [...issues.filter((i) => i.severity === 'error'), ...issues.filter((i) => i.severity === 'warning')];
};
