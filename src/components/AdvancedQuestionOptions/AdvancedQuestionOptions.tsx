import { FocusEvent, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { findTreeArray, TreeContext } from '../../store/treeStore/treeStore';
import { Extension, QuestionnaireItem } from '../../types/fhir';
import {
    deleteItemAction,
    newItemHelpIconAction,
    updateItemAction,
    updateLinkIdAction,
} from '../../store/treeStore/treeActions';
import UriField from '../FormField/UriField';
import UndoIcon from '../../images/icons/arrow-undo-outline.svg';
import './AdvancedQuestionOptions.css';
import { IExtentionType, IItemProperty } from '../../types/IQuestionnareItemType';
import SwitchBtn from '../SwitchBtn/SwitchBtn';
import Initial from './Initial/Initial';
import FormField from '../FormField/FormField';
import MarkdownEditor from '../MarkdownEditor/MarkdownEditor';
import { createItemControlExtension, getHelpText, isItemControlHelp, ItemControlType } from '../../helpers/itemControl';
import CalculatedExpression from './CalculatedExpression/CalculatedExpression';
import { createMarkdownExtension, removeItemExtension, setItemExtension } from '../../helpers/extensionHelper';
import InputField from '../InputField/inputField';
import {
    canTypeBeReadonly,
    canTypeBeRepeatable,
    canTypeHaveCalculatedExpressionExtension,
    canTypeHaveHelp,
    canTypeHaveInitialValue,
    canTypeHavePlaceholderText,
    canTypeHavePrefix,
    canTypeHaveSummary,
    canTypeHaveTextInput
} from '../../helpers/questionTypeFeatures';

type AdvancedQuestionOptionsProps = {
    item: QuestionnaireItem;
    parentArray: Array<string>;
};

const AdvancedQuestionOptions = ({ item, parentArray }: AdvancedQuestionOptionsProps): JSX.Element => {
    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [isDuplicateLinkId, setDuplicateLinkId] = useState(false);
    const [linkId, setLinkId] = useState(item.linkId);
    const { qItems, qOrder } = state;

    const dispatchUpdateItem = (name: IItemProperty, value: boolean) => {
        dispatch(updateItemAction(item.linkId, name, value));
    };

    const dispatchUpdateItemHelpText = (id: string, value: string) => {
        const newValue = createMarkdownExtension(value);
        dispatch(updateItemAction(id, IItemProperty._text, newValue));
    };

    const dispatchHelpText = () => {
        const helpItem = getHelpTextItem();
        if (helpItem) {
            dispatch(deleteItemAction(helpItem.linkId, [...parentArray, item.linkId]));
        } else {
            dispatch(newItemHelpIconAction([...parentArray, item.linkId]));
        }
    };

    function dispatchUpdateLinkId(event: FocusEvent<HTMLInputElement>): void {
        // Verify no duplicates
        if (isDuplicateLinkId || event.target.value === item.linkId) {
            return;
        }
        dispatch(updateLinkIdAction(item.linkId, event.target.value, parentArray));
    }

    function validateLinkId(linkIdToValidate: string): void {
        const hasLinkIdConflict = !(qItems[linkIdToValidate] === undefined || linkIdToValidate === item.linkId);
        setDuplicateLinkId(hasLinkIdConflict);
    }

    function resetLinkId(): void {
        setLinkId(item.linkId);
        validateLinkId(item.linkId);
    }

    const handleHelpText = (markdown: string): void => {
        const helpItem = getHelpTextItem();
        if (helpItem) {
            dispatchUpdateItemHelpText(helpItem.linkId, markdown);
        }
    };

    const getHelpTextForItem = (): string => {
        const helpItem = getHelpTextItem();
        return helpItem ? getHelpText(helpItem) : '';
    };

    const getHelpTextItem = (): QuestionnaireItem | undefined => {
        const selfArray = findTreeArray(parentArray, qOrder);
        const selfOrder = selfArray.find((node) => node.linkId === item.linkId)?.items || [];
        const helpItem = selfOrder.find((child) => isItemControlHelp(qItems[child.linkId]));
        return helpItem ? qItems[helpItem.linkId] : undefined;
    };

    const handleExtension = (extension: Extension) => {
        setItemExtension(item, extension, dispatch);
    };

    const removeExtension = (extensionUrl: IExtentionType) => {
        removeItemExtension(item, extensionUrl, dispatch);
    };

    const getPlaceholder = item?.extension?.find((x) => x.url === IExtentionType.entryFormat)?.valueString ?? '';
    const getRepeatsText = item?.extension?.find((x) => x.url === IExtentionType.repeatstext)?.valueString ?? '';
    const minOccurs = item?.extension?.find((x) => x.url === IExtentionType.minOccurs)?.valueInteger;
    const maxOccurs = item?.extension?.find((x) => x.url === IExtentionType.maxOccurs)?.valueInteger;
    const hasSummaryExtension = !!item?.extension?.find((x) =>
        x.valueCodeableConcept?.coding?.filter((y) => y.code === ItemControlType.summary),
    );

    const helpTextItem = getHelpTextItem();
    const isHiddenItem = item.extension?.some((ext) => ext.url === IExtentionType.hidden && ext.valueBoolean);

    return (
        <>
            <div className="horizontal equal">
                {canTypeBeReadonly(item) && (
                    <FormField>
                        <SwitchBtn
                            onChange={() => dispatchUpdateItem(IItemProperty.readOnly, !item.readOnly)}
                            value={item.readOnly || false}
                            label={t('Read-only')}
                        />
                    </FormField>
                )}
                <FormField>
                    <SwitchBtn
                        onChange={() => {
                            if (isHiddenItem) {
                                removeItemExtension(item, IExtentionType.hidden, dispatch);
                            } else {
                                const extension = {
                                    url: IExtentionType.hidden,
                                    valueBoolean: true,
                                };
                                setItemExtension(item, extension, dispatch);
                            }
                        }}
                        value={isHiddenItem || false}
                        label={t('Hidden field')}
                    />
                </FormField>
            </div>
            {canTypeBeRepeatable(item) && (
                <FormField>
                    <SwitchBtn
                        onChange={(): void => {
                            if (item.repeats) {
                                removeItemExtension(
                                    item,
                                    [IExtentionType.repeatstext, IExtentionType.minOccurs, IExtentionType.maxOccurs],
                                    dispatch,
                                );
                            }
                            dispatchUpdateItem(IItemProperty.repeats, !item.repeats);
                        }}
                        value={item.repeats || false}
                        label={t('Repeatable')}
                    />
                    {item.repeats && (
                        <>
                            <FormField label={t('Repeat button text')}>
                                <InputField
                                    defaultValue={getRepeatsText}
                                    onBlur={(e) => {
                                        if (e.target.value) {
                                            handleExtension({
                                                url: IExtentionType.repeatstext,
                                                valueString: e.target.value,
                                            });
                                        } else {
                                            removeExtension(IExtentionType.repeatstext);
                                        }
                                    }}
                                />
                            </FormField>
                            <div className="horizontal equal">
                                <FormField label={t('Min answers')}>
                                    <input
                                        type="number"
                                        defaultValue={minOccurs}
                                        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                                            if (!event.target.value) {
                                                removeExtension(IExtentionType.minOccurs);
                                            } else {
                                                const extension = {
                                                    url: IExtentionType.minOccurs,
                                                    valueInteger: parseInt(event.target.value),
                                                };
                                                handleExtension(extension);
                                            }
                                        }}
                                    />
                                </FormField>
                                <FormField label={t('max answers')}>
                                    <input
                                        type="number"
                                        defaultValue={maxOccurs}
                                        onBlur={(event: React.ChangeEvent<HTMLInputElement>) => {
                                            if (!event.target.value) {
                                                removeExtension(IExtentionType.maxOccurs);
                                            } else {
                                                const extension = {
                                                    url: IExtentionType.maxOccurs,
                                                    valueInteger: parseInt(event.target.value),
                                                };
                                                handleExtension(extension);
                                            }
                                        }}
                                    />
                                </FormField>
                            </div>
                        </>
                    )}
                </FormField>
            )}
            {canTypeHaveTextInput(item) && (
                <>
                <FormField label={t('Keyboard type (iOS)')}>
                    <select
                        defaultValue={item.extension?.find((x) => x.url === IExtentionType.iosKeyboardType)?.valueString}
                        onChange={(e) => {
                            if (e.target.value) {
                                handleExtension({
                                    url: IExtentionType.iosKeyboardType,
                                    valueString: e.target.value,
                                });
                            } else {
                                removeExtension(IExtentionType.iosKeyboardType);
                            }
                        }}
                    >
                        <option value="">{t('')}</option>
                        <option value="default">{t('Default')}</option>
                        <option value="asciiCapable">{t('ASCII Capable')}</option>
                        <option value="numbersAndPunctuation">{t('Numbers And Punctuation')}</option>
                        <option value="URL">{t('URL')}</option>
                        <option value="numberPad">{t('Number Pad')}</option>
                        <option value="phonePad">{t('Phone Pad')}</option>
                        <option value="namePhonePad">{t('Name Phone Pad')}</option>
                        <option value="emailAddress">{t('Email Address')}</option>
                        <option value="decimalPad">{t('Decimal Pad')}</option>
                        <option value="twitter">{t('Twitter')}</option>
                        <option value="webSearch">{t('Web Search')}</option>
                        <option value="asciiCapableNumberPad">{t('ASCII Capable Number Pad')}</option>
                    </select>
                </FormField>
                <FormField label={t('Text Content Type (iOS)')}>
                    <select
                        defaultValue={item.extension?.find((x) => x.url === IExtentionType.iosTextContentType)?.valueString}
                        onChange={(e) => {
                            if (e.target.value) {
                                handleExtension({
                                    url: IExtentionType.iosTextContentType,
                                    valueString: e.target.value,
                                });
                            } else {
                                removeExtension(IExtentionType.iosTextContentType);
                            }
                        }}
                    >
                        <option value="">{t('')}</option>
                        <option value="URL">{t('URL')}</option>
                        <option value="namePrefix">{t('Name Prefix')}</option>
                        <option value="name">{t('Name')}</option>
                        <option value="nameSuffix">{t('Name Suffix')}</option>
                        <option value="givenName">{t('Given Name')}</option>
                        <option value="middleName">{t('Middle Name')}</option>
                        <option value="familyName">{t('Family Name')}</option>
                        <option value="nickname">{t('Nickname')}</option>
                        <option value="organizationName">{t('Organization Name')}</option>
                        <option value="jobTitle">{t('Job Title')}</option>
                        <option value="location">{t('Location')}</option>
                        <option value="fullStreetAddress">{t('Full Street Address')}</option>
                        <option value="streetAddressLine1">{t('Street Address Line 1')}</option>
                        <option value="streetAddressLine2">{t('Street Address Line 2')}</option>
                        <option value="addressCity">{t('Address City')}</option>
                        <option value="addressCityAndState">{t('Address City and State')}</option>
                        <option value="addressState">{t('Address State')}</option>
                        <option value="postalCode">{t('Postal Code')}</option>
                        <option value="sublocality">{t('Sublocality')}</option>
                        <option value="countryName">{t('Country Name')}</option>
                        <option value="username">{t('Username')}</option>
                        <option value="password">{t('Password')}</option>
                        <option value="newPassword">{t('New Password')}</option>
                        <option value="oneTimeCode">{t('One-Time Code')}</option>
                        <option value="emailAddress">{t('Email Address')}</option>
                        <option value="telephoneNumber">{t('Telephone Number')}</option>
                        <option value="creditCardNumber">{t('Credit Card Number')}</option>
                        <option value="dateTime">{t('Date Time')}</option>
                        <option value="flightNumber">{t('Flight Number')}</option>
                        <option value="shipmentTrackingNumber">{t('Shipment Tracking Number')}</option>
                        <option value="creditCardExpiration">{t('Credit Card Expiration')}</option>
                        <option value="creditCardExpirationMonth">{t('Credit Card Expiration Month')}</option>
                        <option value="creditCardExpirationYear">{t('Credit Card Expiration Year')}</option>
                        <option value="creditCardSecurityCode">{t('Credit Card Security Code')}</option>
                        <option value="creditCardType">{t('Credit Card Type')}</option>
                        <option value="creditCardName">{t('Credit Card Name')}</option>
                        <option value="creditCardGivenName">{t('Credit Card Given Name')}</option>
                        <option value="creditCardMiddleName">{t('Credit Card Middle Name')}</option>
                        <option value="creditCardFamilyName">{t('Credit Card Family Name')}</option>
                        <option value="birthdate">{t('Birthdate')}</option>
                    </select>
                </FormField>
                <FormField label={t('Text Autocapitalization Type (iOS)')}>
                    <select
                        defaultValue={item.extension?.find((x) => x.url === IExtentionType.iosAutoCapitalizationType)?.valueString}
                        onChange={(e) => {
                            if (e.target.value) {
                                handleExtension({
                                    url: IExtentionType.iosAutoCapitalizationType,
                                    valueString: e.target.value,
                                });
                            } else {
                                removeExtension(IExtentionType.iosAutoCapitalizationType);
                            }
                        }}
                    >
                        <option value="">{t('')}</option>
                        <option value="none">{t('None')}</option>
                        <option value="words">{t('Words')}</option>
                        <option value="sentences">{t('Sentences')}</option>
                        <option value="allCharacters">{t('All Characters')}</option>
                    </select>
                </FormField>
                </>
            )}
            {canTypeHaveCalculatedExpressionExtension(item) && (
                <CalculatedExpression item={item} updateExtension={handleExtension} removeExtension={removeExtension} />
            )}
            {canTypeHavePlaceholderText(item) && (
                <FormField label={t('Placeholder text')}>
                    <InputField
                        defaultValue={getPlaceholder}
                        onBlur={(e) => {
                            if (e.target.value) {
                                handleExtension({
                                    url: IExtentionType.entryFormat,
                                    valueString: e.target.value,
                                });
                            } else {
                                removeExtension(IExtentionType.entryFormat);
                            }
                        }}
                    />
                </FormField>
            )}
            {canTypeHaveInitialValue(item) && (
                <div className="horizontal full">
                    <Initial item={item} />
                </div>
            )}
            <div className="horizontal full">
                <div className={`form-field ${isDuplicateLinkId ? 'field-error' : ''}`}>
                    <label>{t('LinkId') as string}</label>
                    <InputField
                        value={linkId}
                        onChange={(event) => {
                            const {
                                target: { value: newLinkId },
                            } = event;
                            validateLinkId(newLinkId);
                            setLinkId(event.target.value);
                        }}
                        onBlur={dispatchUpdateLinkId}
                    />
                    {isDuplicateLinkId && (
                        <div className="msg-error" aria-live="polite">
                            {`${t('LinkId is already in use')} `}
                            <button onClick={resetLinkId}>
                                <img src={UndoIcon} height={16} />
                                {` ${t('Sett tilbake til opprinnelig verdi')}`}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {canTypeHavePrefix(item) && (
                <div className="horizontal full">
                    <FormField label={t('Prefix')}>
                        <InputField
                            defaultValue={item.prefix}
                            onBlur={(e) => {
                                dispatch(updateItemAction(item.linkId, IItemProperty.prefix, e.target.value));
                            }}
                        />
                    </FormField>
                </div>
            )}
            <div className="horizontal full">
                <FormField label={t('Definition')}>
                    <UriField
                        value={item.definition}
                        onBlur={(e) => {
                            dispatch(updateItemAction(item.linkId, IItemProperty.definition, e.target.value));
                        }}
                    />
                </FormField>
            </div>
            {canTypeHaveHelp(item) && (
                <div>
                    <FormField>
                        <SwitchBtn
                            onChange={() => dispatchHelpText()}
                            value={!!helpTextItem}
                            label={t('Enable help button')}
                        />
                    </FormField>
                    {!!helpTextItem && (
                        <FormField label={t('Enter a helping text')}>
                            <MarkdownEditor data={getHelpTextForItem()} onBlur={handleHelpText} />
                        </FormField>
                    )}
                </div>
            )}

            {canTypeHaveSummary(item) && (
                <FormField>
                    <SwitchBtn
                        onChange={() => {
                            if (hasSummaryExtension) {
                                removeExtension(IExtentionType.itemControl);
                            } else {
                                const newExtension = createItemControlExtension(ItemControlType.summary);
                                handleExtension(newExtension);
                            }
                        }}
                        value={hasSummaryExtension}
                        label={t('Enable summary')}
                    />
                </FormField>
            )}
        </>
    );
};

export default AdvancedQuestionOptions;
