import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { removeItemExtension, setItemExtension } from '../../../helpers/extensionHelper';
import { updateItemAction } from '../../../store/treeStore/treeActions';
import { TreeContext } from '../../../store/treeStore/treeStore';
import { Extension, QuestionnaireItem } from '../../../types/fhir';
import { IItemProperty, IExtentionType } from '../../../types/IQuestionnareItemType';
import FormField from '../../FormField/FormField';
import InputField from '../../InputField/inputField';
import Select from '../../Select/Select';

const CUSTOM_REGEX_OPTION = 'CUSTOM';

type Props = {
    item: QuestionnaireItem;
};

const ValidationAnswerTypeString = ({ item }: Props): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const regexOptions = [
        {
            display: t('Email'),
            code: '.*@.*',
        },
        {
            display: t('URL'),
            code:
                '^(http[s]?:\\/\\/(www\\.)?|ftp:\\/\\/(www\\.)?|www\\.){1}([0-9A-Za-z-\\.@:%_+~#=]+)+((\\.[a-zA-Z]{2,3})+)(/(.)*)?(\\?(.)*)?',
        },
        {   display: t('US ZIP code'), 
            code: '^(000[1-9]|0[1-9][0-9][0-9]|[1-9][0-9][0-9][0-8])$' 
        },
    ];

    const updateMaxLength = (number: number) => {
        dispatch(updateItemAction(item.linkId, IItemProperty.maxLength, number));
    };

    const setRegexExtension = (regexValue: string): void => {
        const newExtention: Extension = {
            url: IExtentionType.regEx,
            valueString: regexValue,
        };
        setItemExtension(item, newExtention, dispatch);
    };

    const validationText = item?.extension?.find((x) => x.url === IExtentionType.validationtext)?.valueString || '';
    const selectedRegEx = item?.extension?.find((x) => x.url === IExtentionType.regEx)?.valueString || '';
    const minLength = item?.extension?.find((x) => x.url === IExtentionType.minLength)?.valueInteger;
    const isSelectedRegexCustomRegex = selectedRegEx ? !regexOptions.find((x) => x.code === selectedRegEx) : false;

    const [isCustomRegex, setIsCustomRegex] = useState<boolean>(isSelectedRegexCustomRegex);

    return (
        <>
            <FormField label={t('Answer should be:')}>
                <Select
                    value={isCustomRegex ? CUSTOM_REGEX_OPTION : selectedRegEx}
                    options={[
                        { display: t('No character validation'), code: '' },
                        ...regexOptions,
                        { display: t('Custom regular expression'), code: CUSTOM_REGEX_OPTION },
                    ]}
                    onChange={(event) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.regEx, dispatch);
                            setIsCustomRegex(false);
                        } else if (event.target.value === CUSTOM_REGEX_OPTION) {
                            setIsCustomRegex(true);
                            removeItemExtension(item, IExtentionType.regEx, dispatch);
                        } else {
                            setIsCustomRegex(false);
                            setRegexExtension(event.target.value);
                        }
                    }}
                />
                {isCustomRegex && (
                    <textarea
                        defaultValue={selectedRegEx}
                        placeholder={t('Enter custom regular expression')}
                        onBlur={(event) => {
                            if (!event.target.value) {
                                removeItemExtension(item, IExtentionType.regEx, dispatch);
                            } else {
                                setRegexExtension(event.target.value);
                            }
                        }}
                    />
                )}
            </FormField>
            <FormField label={t('Enter custom error message')}>
                <InputField
                    defaultValue={validationText}
                    onChange={(event) => {
                        if (!event.target.value) {
                            removeItemExtension(item, IExtentionType.validationtext, dispatch);
                        } else {
                            const newExtention: Extension = {
                                url: IExtentionType.validationtext,
                                valueString: event.target.value,
                            };
                            setItemExtension(item, newExtention, dispatch);
                        }
                    }}
                />
            </FormField>
            <div className="horizontal equal">
                <FormField label={t('Minimum characters')}>
                    <input
                        defaultValue={minLength}
                        type="number"
                        aria-label="minimum sign"
                        onBlur={(e) => {
                            const newValue = parseInt(e.target.value);
                            if (!newValue) {
                                removeItemExtension(item, IExtentionType.minLength, dispatch);
                            } else {
                                const extension = {
                                    url: IExtentionType.minLength,
                                    valueInteger: newValue,
                                };
                                setItemExtension(item, extension, dispatch);
                            }
                        }}
                    />
                </FormField>
                <FormField label={t('Maximum characters')}>
                    <input
                        defaultValue={item.maxLength || ''}
                        type="number"
                        aria-label="maximum sign"
                        onBlur={(e) => updateMaxLength(parseInt(e.target.value.toString()))}
                    />
                </FormField>
            </div>
        </>
    );
};

export default ValidationAnswerTypeString;
