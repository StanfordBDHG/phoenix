import type { Questionnaire } from '../types/fhir';
import { RKOF_DEFAULT_VERSION, RKOF_VERSIONS, researchKitOnFHIRTarget } from './researchKitOnFHIR';
import { speziVibeReactNativeTarget } from './speziVibeReactNative';
import type { Issue, Target } from './types';

export type { Issue, Severity, Target } from './types';
export { RKOF_DEFAULT_VERSION, RKOF_VERSIONS } from './researchKitOnFHIR';

export const DEFAULT_TARGET = `researchkit-on-fhir@${RKOF_DEFAULT_VERSION}`;

/** Every target id the checker accepts, for help text and pickers. */
export const TARGET_IDS = [...RKOF_VERSIONS.map((v) => `researchkit-on-fhir@${v}`), speziVibeReactNativeTarget.id];

/**
 * Resolves a target id: `researchkit-on-fhir` (or `rkof`), optionally with `@<version>`, or `spezivibe-react-native`
 * (or `react-native`). Throws for anything else.
 */
export const getTarget = (id: string): Target => {
    const [name, version] = id.trim().toLowerCase().split('@');
    if (['researchkit-on-fhir', 'researchkitonfhir', 'rkof', 'ios'].includes(name)) {
        const resolved = version ?? RKOF_DEFAULT_VERSION;
        if (!RKOF_VERSIONS.includes(resolved)) {
            throw new Error(`Unknown ResearchKitOnFHIR version "${resolved}". Known versions: ${RKOF_VERSIONS.join(', ')}.`);
        }
        return researchKitOnFHIRTarget(resolved);
    }
    if (['spezivibe-react-native', 'react-native', 'rn'].includes(name)) {
        return speziVibeReactNativeTarget;
    }
    throw new Error(`Unknown target "${id}". Use one of: ${TARGET_IDS.join(', ')}.`);
};

/** Checks `questionnaire` against `target`, errors first. */
export const checkQuestionnaire = (questionnaire: Questionnaire, target: string | Target = DEFAULT_TARGET): Issue[] => {
    const resolved = typeof target === 'string' ? getTarget(target) : target;
    const issues = resolved.check(questionnaire);
    return [...issues.filter((i) => i.severity === 'error'), ...issues.filter((i) => i.severity === 'warning')];
};
