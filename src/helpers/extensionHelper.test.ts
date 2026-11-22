import { IExtentionType } from '../types/IQuestionnareItemType';
import { QuestionnaireItem } from '../types/fhir';
import {
    convertNumericBoundExtensions,
    createNumericBoundExtension,
    getNumericExtensionValue,
} from './extensionHelper';

const item = (extension: QuestionnaireItem['extension']): QuestionnaireItem => ({
    linkId: 'q1',
    type: 'decimal',
    extension,
});

describe('getNumericExtensionValue', () => {
    it('reads valueDecimal', () => {
        const q = item([{ url: IExtentionType.minValue, valueDecimal: 2.5 }]);
        expect(getNumericExtensionValue(q, IExtentionType.minValue)).toBe(2.5);
    });

    it('reads valueInteger', () => {
        const q = item([{ url: IExtentionType.maxValue, valueInteger: 7 }]);
        expect(getNumericExtensionValue(q, IExtentionType.maxValue)).toBe(7);
    });

    it('reads zero', () => {
        const q = item([{ url: IExtentionType.minValue, valueDecimal: 0 }]);
        expect(getNumericExtensionValue(q, IExtentionType.minValue)).toBe(0);
    });

    it('returns undefined when the extension is missing', () => {
        expect(getNumericExtensionValue(item(undefined), IExtentionType.minValue)).toBeUndefined();
    });
});

describe('createNumericBoundExtension', () => {
    it('emits valueDecimal for decimal items without rounding', () => {
        expect(createNumericBoundExtension(IExtentionType.minValue, 2.5, true)).toEqual({
            url: IExtentionType.minValue,
            valueDecimal: 2.5,
        });
    });

    it('emits valueInteger for whole numbers on decimal items, for older ResearchKitOnFHIR versions', () => {
        expect(createNumericBoundExtension(IExtentionType.minValue, 3, true)).toEqual({
            url: IExtentionType.minValue,
            valueInteger: 3,
        });
    });

    it('emits valueInteger for integer items', () => {
        expect(createNumericBoundExtension(IExtentionType.maxValue, 10, false)).toEqual({
            url: IExtentionType.maxValue,
            valueInteger: 10,
        });
    });
});

describe('convertNumericBoundExtensions', () => {
    const other = { url: IExtentionType.validationtext, valueString: 'error' };

    it('keeps whole-number bounds as integers when converting to decimal', () => {
        const result = convertNumericBoundExtensions(
            [
                { url: IExtentionType.minValue, valueInteger: 1 },
                { url: IExtentionType.maxValue, valueDecimal: 5 },
                other,
            ],
            true,
        );
        expect(result).toEqual([
            { url: IExtentionType.minValue, valueInteger: 1 },
            { url: IExtentionType.maxValue, valueInteger: 5 },
            other,
        ]);
    });

    it('keeps fractional bounds as decimals when converting to decimal', () => {
        const result = convertNumericBoundExtensions([{ url: IExtentionType.maxValue, valueDecimal: 9.5 }], true);
        expect(result).toEqual([{ url: IExtentionType.maxValue, valueDecimal: 9.5 }]);
    });

    it('converts decimal bounds to integer, rounding inwards', () => {
        const result = convertNumericBoundExtensions(
            [
                { url: IExtentionType.minValue, valueDecimal: 2.5 },
                { url: IExtentionType.maxValue, valueDecimal: 9.5 },
            ],
            false,
        );
        expect(result).toEqual([
            { url: IExtentionType.minValue, valueInteger: 3 },
            { url: IExtentionType.maxValue, valueInteger: 9 },
        ]);
    });

    it('rounds negative decimal bounds inwards', () => {
        const result = convertNumericBoundExtensions(
            [
                { url: IExtentionType.minValue, valueDecimal: -2.5 },
                { url: IExtentionType.maxValue, valueDecimal: -0.5 },
            ],
            false,
        );
        expect(result).toEqual([
            { url: IExtentionType.minValue, valueInteger: -2 },
            { url: IExtentionType.maxValue, valueInteger: -1 },
        ]);
    });
});
