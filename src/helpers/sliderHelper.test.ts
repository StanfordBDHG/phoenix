import { MAX_SLIDER_STEPS, suggestSliderStep } from './sliderHelper';

describe('suggestSliderStep', () => {
    it.each([
        [100, 10],
        [26, 2],
        [24, 2],
        [60, 5],
        [1000, 100],
        [13, 1],
        [10, 1],
    ])('suggests the smallest step that fits a range of %i: %i', (range, step) => {
        expect(suggestSliderStep(range)).toBe(step);
    });

    it('always suggests a step that divides the range into 2 to 13 steps', () => {
        for (let range = 2; range <= 20000; range++) {
            const step = suggestSliderStep(range);
            if (step === undefined) continue;
            expect(range % step).toBe(0);
            expect(range / step).toBeGreaterThanOrEqual(2);
            expect(range / step).toBeLessThanOrEqual(MAX_SLIDER_STEPS);
        }
    });

    it('suggests nothing when only a single step would fit', () => {
        expect(suggestSliderStep(97)).toBeUndefined();
        expect(suggestSliderStep(1)).toBeUndefined();
    });
});
