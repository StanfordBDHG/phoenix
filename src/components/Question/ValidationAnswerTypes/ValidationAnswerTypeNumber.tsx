import { useContext, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { updateItemAction } from '../../../store/treeStore/treeActions';
import { TreeContext } from '../../../store/treeStore/treeStore';
import { IExtentionType, IItemProperty, IQuestionnaireItemType } from '../../../types/IQuestionnareItemType';
import { QuestionnaireItem } from '../../../types/fhir';
import SwitchBtn from '../../SwitchBtn/SwitchBtn';
import {
    convertNumericBoundExtensions,
    createNumericBoundExtension,
    getNumericExtensionValue,
    removeItemExtension,
    setItemExtension,
} from '../../../helpers/extensionHelper';
import FormField from '../../FormField/FormField';
import InputField from '../../InputField/inputField';

interface ValidationTypeProp {
    item: QuestionnaireItem;
}

const ValidationAnswerTypeNumber = ({ item }: ValidationTypeProp): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const validationText = item?.extension?.find((x) => x.url === IExtentionType.validationtext)?.valueString || '';
    const minValue = getNumericExtensionValue(item, IExtentionType.minValue);
    const maxValue = getNumericExtensionValue(item, IExtentionType.maxValue);
    const maxDecimalPlaces = item?.extension?.find((x) => x.url === IExtentionType.maxDecimalPlaces)?.valueInteger;
    const isDecimal = item?.type === IQuestionnaireItemType.decimal || item?.type === IQuestionnaireItemType.quantity;

    const dispatchUpdateItemType = (value: IQuestionnaireItemType.decimal | IQuestionnaireItemType.integer) => {
        dispatch(updateItemAction(item.linkId, IItemProperty.type, value));
    };

    const changeItemType = () => {
        const newItemType =
            item?.type === IQuestionnaireItemType.decimal
                ? IQuestionnaireItemType.integer
                : IQuestionnaireItemType.decimal;

        dispatchUpdateItemType(newItemType);
        const isNewTypeDecimal = newItemType === IQuestionnaireItemType.decimal;
        const extensions = convertNumericBoundExtensions(item.extension || [], isNewTypeDecimal).filter(
            (x) => isNewTypeDecimal || x.url !== IExtentionType.maxDecimalPlaces,
        );
        dispatch(updateItemAction(item.linkId, IItemProperty.extension, extensions));
    };

    return (
        <>
            <div className="horizontal equal">
                {item?.type !== IQuestionnaireItemType.quantity && (
                    <FormField>
                        <SwitchBtn label={t('Allow decimals')} value={isDecimal} onChange={changeItemType} />
                    </FormField>
                )}
                {isDecimal && (
                    <FormField>
                        <label className="#">{t('Max number of decimals')}</label>
                        <input
                            type="number"
                            defaultValue={maxDecimalPlaces}
                            onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                                if (!event.target.value) {
                                    removeItemExtension(item, IExtentionType.maxDecimalPlaces, dispatch);
                                } else {
                                    const extension = {
                                        url: IExtentionType.maxDecimalPlaces,
                                        valueInteger: parseInt(event.target.value),
                                    };
                                    setItemExtension(item, extension, dispatch);
                                }
                            }}
                        />
                    </FormField>
                )}
            </div>

            <div className="horizontal equal">
                <FormField label={t('Min value')}>
                    <input
                        key={`min-${item.type}-${minValue}`}
                        type="number"
                        step={isDecimal ? 'any' : 1}
                        defaultValue={minValue}
                        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                            if (!event.target.value) {
                                removeItemExtension(item, IExtentionType.minValue, dispatch);
                            } else {
                                const extension = createNumericBoundExtension(
                                    IExtentionType.minValue,
                                    parseFloat(event.target.value),
                                    isDecimal,
                                );
                                setItemExtension(item, extension, dispatch);
                            }
                        }}
                    ></input>
                </FormField>
                <FormField label={t('Max value')}>
                    <input
                        key={`max-${item.type}-${maxValue}`}
                        type="number"
                        step={isDecimal ? 'any' : 1}
                        defaultValue={maxValue}
                        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                            if (!event.target.value) {
                                removeItemExtension(item, IExtentionType.maxValue, dispatch);
                            } else {
                                const extension = createNumericBoundExtension(
                                    IExtentionType.maxValue,
                                    parseFloat(event.target.value),
                                    isDecimal,
                                );
                                setItemExtension(item, extension, dispatch);
                            }
                        }}
                    ></input>
                </FormField>
            </div>

            <FormField label={t('Enter custom error message')}>
                <InputField
                    defaultValue={validationText}
                    placeholder={t('error message')}
                    onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.validationtext, dispatch);
                        } else {
                            const extension = {
                                url: IExtentionType.validationtext,
                                valueString: event.target.value,
                            };
                            setItemExtension(item, extension, dispatch);
                        }
                    }}
                />
            </FormField>
        </>
    );
};

export default ValidationAnswerTypeNumber;
