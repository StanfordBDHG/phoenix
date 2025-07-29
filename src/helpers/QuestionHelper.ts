import { Coding, Extension, QuestionnaireItem, ValueSetComposeIncludeConcept } from '../types/fhir';
import { IExtentionType, IOperator, IQuestionnaireItemType } from '../types/IQuestionnareItemType';
import { CodingSystemType } from './uriHelper';
import { createItemControlExtension, isItemControlReceiverComponent, ItemControlType } from './itemControl';

export const ATTACHMENT_DEFAULT_MAX_SIZE = 5.0;

export const QUANTITY_UNIT_TYPE_NOT_SELECTED = 'QUANTITY_UNIT_TYPE_NOT_SELECTED';
export const QUANTITY_UNIT_TYPE_CUSTOM = 'QUANTITY_UNIT_TYPE_CUSTOM';
export const quantityUnitTypes = [
    {
        system: '',
        code: QUANTITY_UNIT_TYPE_NOT_SELECTED,
        display: 'No unit',
    },
    // Length/Height measurements
    {
        system: 'http://unitsofmeasure.org',
        code: 'cm',
        display: 'centimeter',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'm',
        display: 'meter',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'mm',
        display: 'millimeter',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'in',
        display: 'inch',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'ft',
        display: 'foot',
    },
    // Weight measurements
    {
        system: 'http://unitsofmeasure.org',
        code: 'kg',
        display: 'kilogram',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'g',
        display: 'gram',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'mg',
        display: 'milligram',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'lb',
        display: 'pound',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'oz',
        display: 'ounce',
    },
    // Temperature
    {
        system: 'http://unitsofmeasure.org',
        code: 'Cel',
        display: 'degree Celsius',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: '[degF]',
        display: 'degree Fahrenheit',
    },
    // Blood pressure
    {
        system: 'http://unitsofmeasure.org',
        code: 'mm[Hg]',
        display: 'millimeters of mercury',
    },
    // Heart rate and frequency
    {
        system: 'http://unitsofmeasure.org',
        code: '/min',
        display: 'per minute',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: '{beats}/min',
        display: 'beats per minute',
    },
    // Volume measurements
    {
        system: 'http://unitsofmeasure.org',
        code: 'mL',
        display: 'milliliter',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'L',
        display: 'liter',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: '[fl_oz_us]',
        display: 'fluid ounce (US)',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: '[cup_us]',
        display: 'cup (US)',
    },
    // Time measurements
    {
        system: 'http://unitsofmeasure.org',
        code: 's',
        display: 'second',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'min',
        display: 'minute',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'h',
        display: 'hour',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'd',
        display: 'day',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'wk',
        display: 'week',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'mo',
        display: 'month',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'a',
        display: 'year',
    },
    // Pain scales and scores
    {
        system: 'http://unitsofmeasure.org',
        code: '{score}',
        display: 'score',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: '1',
        display: 'unity (dimensionless)',
    },
    // Percentage and ratios
    {
        system: 'http://unitsofmeasure.org',
        code: '%',
        display: 'percent',
    },
    // Medication dosage
    {
        system: 'http://unitsofmeasure.org',
        code: 'ug',
        display: 'microgram',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'mg/kg',
        display: 'milligram per kilogram',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'mg/d',
        display: 'milligram per day',
    },
    // BMI
    {
        system: 'http://unitsofmeasure.org',
        code: 'kg/m2',
        display: 'kilogram per square meter',
    },
    // Energy/Calories
    {
        system: 'http://unitsofmeasure.org',
        code: 'kcal',
        display: 'kilocalorie',
    },
    {
        system: 'http://unitsofmeasure.org',
        code: 'cal',
        display: 'calorie',
    },
    {
        system: '',
        code: QUANTITY_UNIT_TYPE_CUSTOM,
        display: 'Custom',
    },
];

export const checkboxExtension = createItemControlExtension(ItemControlType.checkbox);
export const dropdownExtension = createItemControlExtension(ItemControlType.dropdown);
export const radiobuttonExtension = createItemControlExtension(ItemControlType.radioButton);

export const enableWhenOperatorBoolean: ValueSetComposeIncludeConcept[] = [
    {
        code: IOperator.exists,
        display: 'is answered',
    },
    {
        code: IOperator.notExists,
        display: 'is not answered',
    },
    {
        code: IOperator.equal,
        display: 'is equal to',
    },
    {
        code: IOperator.notEqual,
        display: 'is not equal',
    },
];

export const enableWhenOperatorChoice: ValueSetComposeIncludeConcept[] = [
    {
        code: IOperator.exists,
        display: 'is answered',
    },
    {
        code: IOperator.notExists,
        display: 'is not answered',
    },
    {
        code: IOperator.equal,
        display: 'is equal to',
    },
    {
        code: IOperator.notEqual,
        display: 'is not equal',
    },
];

export const enableWhenOperatorDate: ValueSetComposeIncludeConcept[] = [
    {
        code: IOperator.exists,
        display: 'is answered',
    },
    {
        code: IOperator.notExists,
        display: 'is not answered',
    },
    {
        code: IOperator.equal,
        display: 'is equal to',
    },
    {
        code: IOperator.notEqual,
        display: 'is not equal',
    },
    {
        code: IOperator.greaterThan,
        display: 'is later than',
    },
    {
        code: IOperator.lessThan,
        display: 'is earlier than',
    },
    {
        code: IOperator.greaterThanOrEqual,
        display: 'is later than or equal',
    },
    {
        code: IOperator.lessThanOrEqual,
        display: 'is earlier than or equal',
    },
];

export const enableWhenOperator: ValueSetComposeIncludeConcept[] = [
    {
        code: IOperator.exists,
        display: 'is answered',
    },
    {
        code: IOperator.notExists,
        display: 'is not answered',
    },
    {
        code: IOperator.equal,
        display: 'is equal to',
    },
    {
        code: IOperator.notEqual,
        display: 'is not equal',
    },
    {
        code: IOperator.greaterThan,
        display: 'is greater than',
    },
    {
        code: IOperator.lessThan,
        display: 'is less than',
    },
    {
        code: IOperator.greaterThanOrEqual,
        display: 'is greater than or equal',
    },
    {
        code: IOperator.lessThanOrEqual,
        display: 'is less than or equal',
    },
];

export const elementSaveCapability = [
    { code: '0', display: 'Not set' },
    { code: '1', display: 'Save submitted questionnaire and intermediate save (standard setting)' },
    { code: '2', display: 'Only submitted questionnaire is saved' },
    { code: '3', display: 'No saving' },
];

export const getInitialText = (item?: QuestionnaireItem): string => {
    if (
        (item?.type === IQuestionnaireItemType.text || item?.type === IQuestionnaireItemType.string) &&
        item?.initial &&
        item.initial[0]
    ) {
        return item.initial[0].valueString || '';
    }
    return '';
};

export const getPrefix = (item?: QuestionnaireItem): string => {
    return item?.prefix || '';
};

export const getSublabel = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.sublabel)?.valueMarkdown || '';
};

export const getRepeatsText = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.repeatstext)?.valueString || '';
};

export const getValidationMessage = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.validationtext)?.valueString || '';
};

export const getPlaceHolderText = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.entryFormat)?.valueString || '';
};

export const getMarkdownText = (extensions?: Extension[]): string => {
    return extensions?.find((extension) => extension.url === IExtentionType.markdown)?.valueMarkdown || '';
};

export const getGuidanceAction = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.guidanceAction)?.valueString || '';
};

export const getGuidanceParameterName = (item?: QuestionnaireItem): string => {
    return item?.extension?.find((extension) => extension.url === IExtentionType.guidanceParam)?.valueString || '';
};

export const isValidGuidanceParameterName = (name: string): boolean => {
    const regExp = /^[A-Za-z0-9_]{1,254}$/;
    return regExp.test(name);
};

export const valueSetTqqcCoding: Coding = {
    system: CodingSystemType.valueSetTqqc,
    code: '1',
    display: 'Technical endpoint for receiving QuestionnaireResponse',
};

export const isRecipientList = (item: QuestionnaireItem): boolean => {
    const isReceiverComponent = isItemControlReceiverComponent(item);
    return !isReceiverComponent && item.code?.find((x) => x.system === CodingSystemType.valueSetTqqc) !== undefined;
};
