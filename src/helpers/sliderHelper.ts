// ResearchKit's ORKScaleAnswerFormat, which ResearchKitOnFHIR uses for sliders, rejects anything outside these limits:
// the range must divide evenly by the step into 1 to 13 steps, and the values must be within ±10,000.
export const MAX_SLIDER_STEPS = 13;
export const MIN_SLIDER_VALUE = -10000;
export const MAX_SLIDER_VALUE = 10000;

/**
 * Suggests a slider step for `range` (max − min): the smallest step that divides the range evenly into at most
 * MAX_SLIDER_STEPS steps. Returns undefined when only a single step would fit (e.g. a prime range such as 0–97),
 * because a one-step slider isn't useful: the range itself needs to change.
 */
export const suggestSliderStep = (range: number): number | undefined => {
    for (let step = Math.max(1, Math.ceil(range / MAX_SLIDER_STEPS)); step < range; step++) {
        if (range % step === 0) {
            return step;
        }
    }
    return undefined;
};
