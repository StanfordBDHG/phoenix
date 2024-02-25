import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../../../store/treeStore/treeStore';
import { removeItemExtension, setItemExtension } from '../../../helpers/extensionHelper';
import FormField from '../../FormField/FormField';
import { QuestionnaireItem } from '../../../types/fhir';

interface SliderSettingsProp {
    item: QuestionnaireItem;
}

const SliderSettings = ({ item }: SliderSettingsProp): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const [minValue, setMinValue] = useState(item.extension?.find((x) => x.url === 'minValue')?.valueInteger);
    const [maxValue, setMaxValue] = useState(item.extension?.find((x) => x.url === 'maxValue')?.valueInteger);
    const [stepValue, setStepValue] = useState(item.extension?.find((x) => x.url === 'questionnaireSliderStepValue')?.valueInteger);
    const [error, setError] = useState('');

    const validate = () => {
        if (minValue == null || maxValue == null) {
            setError(t('Both min and max values must be filled in.'));
            return false;
        }
        if (stepValue == null || (maxValue - minValue) % stepValue !== 0) {
            setError(t('Step value must be divisible by the difference between max and min values.'));
            return false;
        }
        setError('');
        return true;
    };

    const handleMinValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        setMinValue(value);
        if (!event.target.value) {
            removeItemExtension(item, 'minValue', dispatch);
        } else {
            const extension = {
                url: 'minValue',
                valueInteger: value,
            };
            setItemExtension(item, extension, dispatch);
        }
    };

    const handleMaxValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        setMaxValue(value);
        if (!event.target.value) {
            removeItemExtension(item, 'maxValue', dispatch);
        } else {
            const extension = {
                url: 'maxValue',
                valueInteger: value,
            };
            setItemExtension(item, extension, dispatch);
        }
    };

    const handleStepValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(event.target.value);
        setStepValue(value);
        if (!event.target.value) {
            removeItemExtension(item, 'questionnaireSliderStepValue', dispatch);
        } else {
            const extension = {
                url: 'questionnaireSliderStepValue',
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
                    value={minValue || ''}
                    onBlur={handleBlur}
                    onChange={handleMinValueChange}
                ></input>
            </FormField>
            <FormField label={t('Slider max value')}>
                <input
                    type="number"
                    value={maxValue || ''}
                    onBlur={handleBlur}
                    onChange={handleMaxValueChange}
                ></input>
            </FormField>
            <FormField label={t('Slider step value')}>
                <input
                    type="number"
                    value={stepValue || ''}
                    onBlur={handleBlur}
                    onChange={handleStepValueChange}
                ></input>
            </FormField>
        </div>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        </>
    )
}

export default SliderSettings;
