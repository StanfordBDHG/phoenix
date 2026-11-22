import { updateItemAction } from '../store/treeStore/treeActions';
import { ActionType } from '../store/treeStore/treeStore';
import { Element, Extension, QuestionnaireItem } from '../types/fhir';
import { IExtentionType, IItemProperty } from '../types/IQuestionnareItemType';
import createUUID from './CreateUUID';

export const setItemExtension = (
    item: QuestionnaireItem,
    extensionValue: Extension,
    dispatch: (value: ActionType) => void,
): void => {
    const extensionsToSet = (item.extension || []).filter((x: Extension) => x.url !== extensionValue.url);
    extensionsToSet.push(extensionValue);
    dispatch(updateItemAction(item.linkId, IItemProperty.extension, extensionsToSet));
};

export const removeItemExtension = (
    item: QuestionnaireItem,
    extensionUrl: string | string[],
    dispatch: (value: ActionType) => void,
): void => {
    const extensionsToSet = Array.isArray(extensionUrl)
        ? (item.extension || []).filter((x: Extension) => extensionUrl.indexOf(x.url) === -1)
        : (item.extension || []).filter((x: Extension) => x.url !== extensionUrl);
    dispatch(updateItemAction(item.linkId, IItemProperty.extension, extensionsToSet));
};

export const createOptionReferenceExtensions = [
    {
        url: IExtentionType.optionReference,
        valueReference: {
            reference: '',
            display: '',
            id: createUUID(),
        },
    },
    {
        url: IExtentionType.optionReference,
        valueReference: {
            reference: '',
            display: '',
            id: createUUID(),
        },
    },
];

export const hasExtension = (extensionParent: Element | undefined, extensionType: IExtentionType): boolean => {
    if (extensionParent && extensionParent.extension) {
        return extensionParent.extension.some((ext) => ext.url === extensionType);
    }
    return false;
};

const numericBoundUrls: string[] = [IExtentionType.minValue, IExtentionType.maxValue];

// Reads a numeric minValue/maxValue extension, which may be stored as either valueDecimal or valueInteger.
export const getNumericExtensionValue = (item: QuestionnaireItem, url: IExtentionType): number | undefined => {
    const extension = item.extension?.find((x) => x.url === url);
    return extension?.valueDecimal ?? extension?.valueInteger;
};

// Builds a minValue/maxValue extension whose value type matches the item type, as required by FHIR.
export const createNumericBoundExtension = (
    url: IExtentionType.minValue | IExtentionType.maxValue,
    value: number,
    isDecimal: boolean,
): Extension => (isDecimal ? { url, valueDecimal: value } : { url, valueInteger: Math.trunc(value) });

// Converts existing minValue/maxValue extensions to valueDecimal or valueInteger when an item switches between
// decimal and integer. When converting to integer, bounds are rounded inwards so the original range still holds.
export const convertNumericBoundExtensions = (extensions: Extension[], toDecimal: boolean): Extension[] =>
    extensions.map((extension) => {
        if (numericBoundUrls.indexOf(extension.url) === -1) {
            return extension;
        }
        const value = extension.valueDecimal ?? extension.valueInteger;
        if (value === undefined) {
            return extension;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { valueDecimal, valueInteger, ...rest } = extension;
        if (toDecimal) {
            return { ...rest, valueDecimal: value };
        }
        const rounded = extension.url === IExtentionType.minValue ? Math.ceil(value) : Math.floor(value);
        return { ...rest, valueInteger: rounded };
    });
