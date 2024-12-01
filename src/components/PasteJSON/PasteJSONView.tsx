import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconBtn from '../IconBtn/IconBtn';
import '../Modal/Modal.css'

interface PasteJSONModalProps {
    onCancel: () => void
    onImport: (json: string) => void
}

const PasteJSONModal = (props: PasteJSONModalProps) => {
    const [value, setValue] = useState<string>('');
    const { t } = useTranslation();
    return (
        <div className="overlay">
            <div className="structor-helper modal large">
                <div className="title" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex' }}>
                        <IconBtn type="x" title={t('Back')} onClick={props.onCancel} />
                        <h1>{t('JSON Questionnaire Import')}</h1>
                    </span>
                    <span>
                        <IconBtn type="check" title={t('Import')} onClick={() => props.onImport(value)} />
                    </span>
                </div>
                <div className='content'>
                    <textarea
                        style={{width: '100%', height: '65vh', resize: 'none', fontFamily: 'monospace' }}
                        value={value}
                        placeholder='Paste your JSON here...'
                        onChange={e => setValue(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default PasteJSONModal;
