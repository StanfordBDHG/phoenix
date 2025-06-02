import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import HelpIcon from '../../images/icons/help-circle-outline.svg';
import './FormField.css';

type Props = {
    label?: string;
    sublabel?: string;
    tooltip?: string;
    isOptional?: boolean;
    children?: ReactNode;
};

const FormField = ({ label, sublabel, tooltip, isOptional, children }: Props): JSX.Element => {
    const { t } = useTranslation();
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="form-field">
            {label && (
                <label>
                    <span>{label}</span>
                    {isOptional && <span className="form-field__optional">{` (${t('Optional')})`}</span>}
                    {tooltip && (
                        <span className="form-field__tooltip-container">
                            <button 
                                type="button"
                                className="form-field__help-button"
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                onClick={() => setShowTooltip(!showTooltip)}
                                aria-label="Show help information"
                                aria-expanded={showTooltip}
                                aria-describedby={showTooltip ? "tooltip-content" : undefined}
                            >
                                <img 
                                    src={HelpIcon}
                                    alt=""
                                    className="form-field__help-icon"
                                    aria-hidden="true"
                                />
                            </button>
                            {showTooltip && (
                                <div className="form-field__tooltip">
                                    {tooltip}
                                    <div className="form-field__tooltip-arrow" />
                                </div>
                            )}
                        </span>
                    )}
                </label>
            )}
            {sublabel && <div className="form-field__sublabel">{sublabel}</div>}
            {children}
        </div>
    );
};

export default FormField;
