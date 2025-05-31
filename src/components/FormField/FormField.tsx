import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import HelpIcon from '../../images/icons/help-circle-outline.svg';

type Props = {
    label?: string;
    sublabel?: string;
    tooltip?: string;
    isOptional?: boolean;
    children?: ReactNode;
};

const FormField = ({ label, sublabel, tooltip, isOptional, children }: Props): JSX.Element => {
    const { t } = useTranslation();

    return (
        <div className="form-field">
            {label && (
                <label>
                    <span>{label}</span>
                    {isOptional && <span className="form-field__optional">{` (${t('Optional')})`}</span>}
                    {tooltip && (
                        <img 
                            src={HelpIcon}
                            alt="Help"
                            title={tooltip}
                            style={{
                                marginLeft: '2px',
                                marginTop: '2px',
                                width: '15px',
                                height: '15px',
                                cursor: 'help'
                            }}
                            />
                    )}
                </label>
            )}
            {sublabel && <div style={{textAlign: 'left'}}>{sublabel}</div>}
            {children}
        </div>
    );
};

export default FormField;
