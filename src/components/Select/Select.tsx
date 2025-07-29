import React from 'react';
import { useTranslation } from 'react-i18next';
import './Select.css';
import { ValueSetComposeIncludeConcept } from '../../types/fhir';

export interface OptionGroup {
    label: string;
    options: ValueSetComposeIncludeConcept[];
}

type Props = {
    options?: ValueSetComposeIncludeConcept[];
    optionGroups?: OptionGroup[];
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    value?: string;
    placeholder?: string;
    compact?: boolean;
};

const Select = ({ options, optionGroups, onChange, value, placeholder, compact }: Props): JSX.Element => {
    const { t } = useTranslation();
    return (
        <div className={`selector ${compact ? 'compact' : ''}`}>
            <select onChange={onChange} value={value || ''}>
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {optionGroups ? (
                    optionGroups.map((group, groupIndex) => (
                        <optgroup key={groupIndex} label={t(group.label)}>
                            {group.options.map((item, index) => (
                                <option key={`${groupIndex}-${index}`} value={item.code}>
                                    {t(item.display || '')}
                                </option>
                            ))}
                        </optgroup>
                    ))
                ) : (
                    options?.map((item, index) => (
                        <option key={index} value={item.code}>
                            {t(item.display || '')}
                        </option>
                    ))
                )}
            </select>
            <span className="down-arrow-icon" />
        </div>
    );
};

export default Select;
