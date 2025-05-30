import { useTranslation } from 'react-i18next';
import './Question.css';

import {
    Element,
    Extension,
    QuestionnaireItem,
    QuestionnaireItemAnswerOption,
    ValueSet,
    ValueSetComposeIncludeConcept,
} from '../../types/fhir';
import { IExtentionType, IItemProperty, IQuestionnaireItemType } from '../../types/IQuestionnareItemType';

import { updateItemAction } from '../../store/treeStore/treeActions';
import { isRecipientList } from '../../helpers/QuestionHelper';
import { removeItemExtension, setItemExtension, hasExtension } from '../../helpers/extensionHelper';
import { isItemControlInline, isItemControlHighlight } from '../../helpers/itemControl';

import Accordion from '../Accordion/Accordion';
import { ActionType } from '../../store/treeStore/treeStore';
import AdvancedQuestionOptions from '../AdvancedQuestionOptions/AdvancedQuestionOptions';
import Choice from './QuestionType/Choice';
import EnableWhen from '../EnableWhen/EnableWhen';
import Infotext from './QuestionType/Infotext';

import SwitchBtn from '../SwitchBtn/SwitchBtn';
import ValidationAnswerTypes from './ValidationAnswerTypes/ValidationAnswerTypes';
import Codes from '../AdvancedQuestionOptions/Code/Codes';
import OptionReference from './QuestionType/OptionReference';
import FormField from '../FormField/FormField';
import UnitTypeSelector from './UnitType/UnitTypeSelector';
import { DateType } from './QuestionType/DateType';
import { ValidationErrors } from '../../helpers/orphanValidation';
import {
    canTypeBeRequired,
    canTypeBeValidated,
    getItemDisplayType,
} from '../../helpers/questionTypeFeatures';
import SliderSettings from './SliderSettings/SliderSettings';

interface QuestionProps {
    item: QuestionnaireItem;
    formExtensions: Array<Extension> | undefined;
    parentArray: Array<string>;
    containedResources?: Array<ValueSet>;
    conditionalArray: ValueSetComposeIncludeConcept[];
    itemValidationErrors: ValidationErrors[];
    getItem: (linkId: string) => QuestionnaireItem;
    dispatch: React.Dispatch<ActionType>;
}

const Question = (props: QuestionProps): JSX.Element => {
    const { t } = useTranslation();
    const codeElements = props.item.code ? `(${props.item.code.length})` : '(0)';

    const dispatchUpdateItem = (
        name: IItemProperty,
        value: string | boolean | QuestionnaireItemAnswerOption[] | Element | Extension[] | undefined,
    ): void => {
        props.dispatch(updateItemAction(props.item.linkId, name, value));
    };

    const getLabelText = (): string => {
        let labelText = '';
        return labelText || props.item.text || '';
    };

    const isNumber = props.item.type === IQuestionnaireItemType.decimal || props.item.type === IQuestionnaireItemType.integer || props.item.type === IQuestionnaireItemType.quantity;
    const isDecimal = props.item.type === IQuestionnaireItemType.decimal;
    const isQuantity = props.item.type === IQuestionnaireItemType.quantity;
    const isDecimalOrQuantity = isDecimal || isQuantity;
    const isSlider = isNumber && hasExtension(props.item, IExtentionType.itemControl);

    // Adds instructions for the user
    const instructionType = (): JSX.Element => {
        if(props.item.type === IQuestionnaireItemType.attachment) {
            return (
                <p>
                    <i>Note:</i> <a href="https://github.com/StanfordBDHG/ResearchKitOnFHIR" target="_blank" rel="noopener noreferrer">ResearchKitOnFHIR</a> maps the 'attachment' type to an <strong>ORKImageCaptureStep</strong> which allows the user to take a photo with the device camera.
                </p>
            );
        }
        return <></>;
    }

    const respondType = (): JSX.Element => {
        if (
            isItemControlInline(props.item) ||
            isItemControlHighlight(props.item) ||
            props.item.type === IQuestionnaireItemType.display
        ) {
            return <Infotext item={props.item} parentArray={props.parentArray} />;
        }
        if (isRecipientList(props.item)) {
            return <OptionReference item={props.item} />;
        }
        if (props.item.type === IQuestionnaireItemType.date || props.item.type === IQuestionnaireItemType.dateTime) {
            return <DateType item={props.item} dispatch={props.dispatch} />;
        }
        if (
            props.item.type === IQuestionnaireItemType.choice ||
            props.item.type === IQuestionnaireItemType.openChoice
        ) {
            return <Choice item={props.item} />;
        }
        if (props.item.type === IQuestionnaireItemType.quantity) {
            return <UnitTypeSelector item={props.item} />;
        }
        if (props.item.type === IQuestionnaireItemType.string || props.item.type === IQuestionnaireItemType.text) {
            return (
                <FormField>
                    <SwitchBtn
                        label={t('Multi-line textfield')}
                        value={props.item.type === IQuestionnaireItemType.text}
                        onChange={() => {
                            if (props.item.type === IQuestionnaireItemType.text) {
                                dispatchUpdateItem(IItemProperty.type, IQuestionnaireItemType.string);
                            } else {
                                dispatchUpdateItem(IItemProperty.type, IQuestionnaireItemType.text);
                            }
                        }}
                    />
                </FormField>
            );
        }
        return <></>;
    };

    const enableWhenCount =
        props.item.enableWhen && props.item.enableWhen.length > 0 ? `(${props.item.enableWhen?.length})` : '';

    return (
        <div className="question" id={props.item.linkId}>
            <div className="question-form">
                <h2 className="question-type-header">{t(getItemDisplayType(props.item))}</h2>
                <div className="horizontal">
                    {instructionType()}
                </div>
                <div className="horizontal">
                    {canTypeBeRequired(props.item) && (
                        <FormField>
                            <SwitchBtn
                                label={t('Required')}
                                value={props.item.required || false}
                                onChange={() => dispatchUpdateItem(IItemProperty.required, !props.item.required)}
                            />
                        </FormField>
                    )}
                    {(isNumber) && (
                        <>
                            <FormField>
                                <SwitchBtn label={t('Allow decimals')} value={isDecimalOrQuantity} onChange={() => {
                                    const newItemType = isDecimal || isQuantity
                                            ? IQuestionnaireItemType.integer
                                            : IQuestionnaireItemType.decimal;
                                    dispatchUpdateItem(IItemProperty.type, newItemType)

                                    // remove slider-related extensions if toggling decimals on, as sliders currently only support integers
                                    if (newItemType === IQuestionnaireItemType.decimal) {
                                        const extensionsToRemove = [
                                            IExtentionType.itemControl,
                                            IExtentionType.questionnaireSliderStepValue,
                                            IExtentionType.minValue,
                                            IExtentionType.maxValue
                                        ]
                                        removeItemExtension(
                                            props.item, 
                                            extensionsToRemove, 
                                            props.dispatch
                                        );
                                    }

                                    // remove max decimal places extension if toggling decimals off
                                    if (newItemType === IQuestionnaireItemType.integer) {
                                        removeItemExtension(props.item, IExtentionType.maxDecimalPlaces, props.dispatch);
                                    }
                                }} />
                            </FormField>
                        </>
                    )}
                    {(isDecimalOrQuantity) && (
                        <FormField>
                            <SwitchBtn label={t('Allow units')} value={isQuantity} onChange={() => {
                                const newItemType =
                                    isDecimal
                                    ? IQuestionnaireItemType.quantity
                                    : IQuestionnaireItemType.decimal;
                            dispatchUpdateItem(IItemProperty.type, newItemType)

                            // remove unit extension if toggling off
                            if (newItemType === IQuestionnaireItemType.decimal) {
                                removeItemExtension(props.item, IExtentionType.questionnaireUnit, props.dispatch);
                            }
                        }} />
                    </FormField>
                    )}
                </div>
                <FormField label={t('Text')}>
                    <textarea
                        defaultValue={getLabelText()}
                        onBlur={(e) => {
                            dispatchUpdateItem(IItemProperty.text, e.target.value);
                        }}
                    />
                </FormField>
                <br />
                {isNumber && !isDecimalOrQuantity &&
                    <FormField>
                        <SwitchBtn 
                            label={t('Display as a slider')} 
                            value={isSlider} 
                            onChange={(() => {
                                const newExtension = {
                                    url: IExtentionType.itemControl,
                                    valueCodeableConcept: {
                                        coding: [
                                            {
                                                system: "http://hl7.org/fhir/questionnaire-item-control",
                                                code: "slider",
                                                display: "Slider"
                                                }
                                            ]
                                        }
                                    };
                                    if (!isSlider) {
                                        setItemExtension(props.item, newExtension, props.dispatch);
                                    } else {
                                        const extensionsToRemove = [
                                            IExtentionType.itemControl,
                                            IExtentionType.questionnaireSliderStepValue,
                                            IExtentionType.minValue,
                                            IExtentionType.maxValue
                                        ]
                                        removeItemExtension(
                                            props.item, 
                                            extensionsToRemove,
                                            props.dispatch
                                        );
                                    }
                                })}
                        />
                    </FormField>
                }
                {isSlider && <SliderSettings item={props.item} /> }
                {respondType()}
            </div>
            <div className="question-addons">
                {canTypeBeValidated(props.item) && !isSlider && (
                    <Accordion title={t('Add validation')}>
                        <ValidationAnswerTypes item={props.item} />
                    </Accordion>
                )}
                <Accordion title={`${t('Enable when')} ${enableWhenCount}`}>
                    <EnableWhen
                        getItem={props.getItem}
                        conditionalArray={props.conditionalArray}
                        linkId={props.item.linkId}
                        enableWhen={props.item.enableWhen || []}
                        containedResources={props.containedResources}
                        itemValidationErrors={props.itemValidationErrors}
                    />
                </Accordion>
                <Accordion title={`${t('Code')} ${codeElements}`}>
                    <Codes linkId={props.item.linkId} itemValidationErrors={props.itemValidationErrors} />
                </Accordion>
                <Accordion title={t('Advanced Options')}>
                    <AdvancedQuestionOptions item={props.item} parentArray={props.parentArray} />
                </Accordion>
            </div>
        </div>
    );
};

export default Question;
