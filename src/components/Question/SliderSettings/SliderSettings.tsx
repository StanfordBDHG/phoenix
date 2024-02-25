import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../../../store/treeStore/treeStore';
import { removeItemExtension, setItemExtension } from '../../../helpers/extensionHelper';
import FormField from '../../FormField/FormField';
import { QuestionnaireItem } from '../../../types/fhir';
import { IExtentionType } from '../../../types/IQuestionnareItemType';

interface SliderSettingsProp {
    item: QuestionnaireItem;
}

const SliderSettings = ({ item }: SliderSettingsProp): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const [minValue, setMinValue] = useState(item.extension?.find((x) => x.url === IExtentionType.minValue)?.valueInteger);
    const [maxValue, setMaxValue] = useState(item.extension?.find((x) => x.url === IExtentionType.maxValue)?.valueInteger);
    const [stepValue, setStepValue] = useState(item.extension?.find((x) => x.url === IExtentionType.questionnaireSliderStepValue)?.valueInteger);
    const [errors, setErrors] = useState({ minValue: false, maxValue: false, stepValue: false });
    const [errorMessage, setErrorMessage] = useState('');

    const validate = () => {
        let newErrors = { minValue: false, maxValue: false, stepValue: false };
        let isValid = true;

        let errorMessage = '';

        if (minValue == null || maxValue == null) {
            newErrors.minValue = newErrors.maxValue = true;
            errorMessage += t('Both min and max values must be filled in.');
            isValid = false;
        } else if (maxValue <= minValue) {
            newErrors.minValue = newErrors.maxValue = true;
            errorMessage += t('Max value must be greater than min value.');
            isValid = false;
        } else if (stepValue == null || stepValue <= 0 || stepValue > (maxValue - minValue)) {
            newErrors.stepValue = true;
            errorMessage += t('Step value must be a positive number and less than the difference between max and min values.');
            isValid = false;
        } else if ((maxValue - minValue) % stepValue !== 0) {
            newErrors.stepValue = true;
            errorMessage += t('It must be possible to reach the max value from the min value using the step value.');
            isValid = false;
        }      

        setErrors(newErrors);
        if (isValid) {
            setErrorMessage('');
        } else {
            setErrorMessage(errorMessage);
        }
        return isValid;
    };

    const handleMinValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            setMinValue(undefined);
            removeItemExtension(item, 'minValue', dispatch);
        } else {
            const value = parseInt(event.target.value);
            setMinValue(value);
            const extension = {
                url: IExtentionType.minValue,
                valueInteger: value,
            };
            setItemExtension(item, extension, dispatch);
        }
    };
    

    const handleMaxValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            setMaxValue(undefined);
            removeItemExtension(item, 'maxValue', dispatch);
        } else {
            const value = parseInt(event.target.value);
            setMaxValue(value);
            const extension = {
                url: IExtentionType.maxValue,
                valueInteger: value,
            };
            setItemExtension(item, extension, dispatch);
        }
    };

    const handleStepValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            setStepValue(undefined);
            removeItemExtension(item, 'questionnaireSliderStepValue', dispatch);
        } else {
            const value = parseInt(event.target.value);
            setStepValue(value);
            const extension = {
                url: IExtentionType.questionnaireSliderStepValue,
                valueInteger: value,
            };
            setItemExtension(item, extension, dispatch);
        }
    };

    const handleBlur = () => {
        validate();
    };

    return (
        <>
        <div className="horizontal equal">
            <FormField label={t('Slider min value')}>
                <input
                    type="number"
                    value={minValue ?? ''}
                    onBlur={handleBlur}
                    onChange={handleMinValueChange}
                    style={{ borderColor: errors.minValue ? 'red' : undefined }}
                ></input>
            </FormField>
            <FormField label={t('Slider max value')}>
                <input
                    type="number"
                    value={maxValue ?? ''}
                    onBlur={handleBlur}
                    onChange={handleMaxValueChange}
                    style={{ borderColor: errors.maxValue ? 'red' : undefined }}
                ></input>
            </FormField>
            <FormField label={t('Slider step value')}>
                <input
                    type="number"
                    value={stepValue ?? ''}
                    onBlur={handleBlur}
                    onChange={handleStepValueChange}
                    style={{ borderColor: errors.stepValue ? 'red' : undefined }}
                ></input>
            </FormField>
        </div>
        {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
        </>
    );
}

export default SliderSettings;
