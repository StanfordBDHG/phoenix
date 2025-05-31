import { ReactNode, useState } from 'react';
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
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="form-field">
            {label && (
                <label>
                    <span>{label}</span>
                    {isOptional && <span className="form-field__optional">{` (${t('Optional')})`}</span>}
                    {tooltip && (
                        <span style={{ position: 'relative', display: 'inline-block' }}>
                            <img 
                                src={HelpIcon}
                                alt="Help"
                                style={{
                                    marginLeft: '2px',
                                    marginTop: '2px',
                                    width: '15px',
                                    height: '15px',
                                    cursor: 'help'
                                }}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                onClick={() => setShowTooltip(!showTooltip)}
                                />
                            {showTooltip && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        marginBottom: '5px',
                                        padding: '8px 12px',
                                        backgroundColor: '#333',
                                        color: 'white',
                                        fontSize: '12px',
                                        borderRadius: '4px',
                                        zIndex: 1000,
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                        minWidth: '200px',
                                        maxWidth: '500px',
                                        whiteSpace: 'normal'
                                    }}
                                >
                                    {tooltip}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 0,
                                            height: 0,
                                            borderLeft: '5px solid transparent',
                                            borderRight: '5px solid transparent',
                                            borderTop: '5px solid #333'
                                        }}
                                    />
                                </div>
                            )}
                        </span>
                    )}
                </label>
            )}
            {sublabel && <div style={{textAlign: 'left'}}>{sublabel}</div>}
            {children}
        </div>
    );
};

export default FormField;
