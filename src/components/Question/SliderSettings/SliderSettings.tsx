import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../../../store/treeStore/treeStore';
import { removeItemExtension, setItemExtension } from '../../../helpers/extensionHelper';
import FormField from '../../FormField/FormField';
import { QuestionnaireItem } from '../../../types/fhir';
import { IExtentionType, IItemProperty, IQuestionnaireItemType } from '../../../types/IQuestionnareItemType';


interface SliderSettingsProp {
    item: QuestionnaireItem;
}

const SliderSettings = ({ item }: SliderSettingsProp): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const sliderMinValue = item.extension?.find((x) => x.url === IExtentionType.minValue)?.valueInteger;
    const sliderMaxValue = item.extension?.find((x) => x.url === IExtentionType.maxValue)?.valueInteger;
    const sliderStepValue = item.extension?.find((x) => x.url === IExtentionType.questionnaireSliderStepValue)?.valueInteger;

    return (
        <div className="horizontal equal">
            <FormField label={t('Slider min value')}>
                <input
                    type="number"
                    defaultValue={sliderMinValue}
                    onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.minValue, dispatch);
                        } else {
                            const extension = {
                                url: IExtentionType.minValue,
                                valueInteger: parseInt(event.target.value),
                            };
                            setItemExtension(item, extension, dispatch);
                        }
                    }}
                ></input>
            </FormField>
            <FormField label={t('Slider max value')}>
                <input
                    type="number"
                    defaultValue={sliderMaxValue}
                    onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.maxValue, dispatch);
                        } else {
                            const extension = {
                                url: IExtentionType.maxValue,
                                valueInteger: parseInt(event.target.value),
                            };
                            setItemExtension(item, extension, dispatch);
                        }
                    }}
                ></input>
            </FormField>
            <FormField label={t('Slider step value')}>
                <input
                    type="number"
                    defaultValue={sliderStepValue}
                    onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.questionnaireSliderStepValue, dispatch);
                        } else {
                            const extension = {
                                url: IExtentionType.questionnaireSliderStepValue,
                                valueInteger: parseInt(event.target.value),
                            };
                            setItemExtension(item, extension, dispatch);
                        }
                    }}
                ></input>
            </FormField>
        </div>
    )
}

export default SliderSettings;