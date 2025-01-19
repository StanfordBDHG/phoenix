import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { generateQuestionnaire } from '../../helpers/generateQuestionnaire';
import { TreeContext } from '../../store/treeStore/treeStore';
import { ValidationErrors } from '../../helpers/orphanValidation';
import Btn from '../Btn/Btn';
import IconBtn from '../IconBtn/IconBtn';

type Props = {
    showJSONView: () => void;
    validationErrors: ValidationErrors[]
};

const JSONView = ({ showJSONView, validationErrors }: Props): JSX.Element => {
    const { t } = useTranslation();
    const { state } = useContext(TreeContext);
    const jsonText = JSON.stringify(JSON.parse(generateQuestionnaire(state)), undefined, 2);

    return (
        <div className="overlay">
            <div className="structor-helper">
                <div className="title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex' }}>
                        <IconBtn type="x" title={t('Back')} onClick={showJSONView} />
                        <h1>{t('FHIR R4 Questionnaire JSON')}</h1>
                    </span>
                    {validationErrors.length == 0 && <span>
                        <Btn title='Copy to Clipboard' onClick={() => navigator.clipboard.writeText(jsonText)}/>
                    </span>}
                </div>
                {validationErrors.length > 0 ? (
                    <div>
                        {t('Found {0} errors. Questions with errors are marked with a red border.')
                            .replace('{0}', validationErrors.length.toString())}
                    </div>
                ) : (
                    <div style={{paddingLeft: 20, paddingTop: 15, textAlign: 'left' }}>
                        <h3>{t('✅  This is valid FHIR.')}</h3>
                    </div>
                )}
                <code className="json">{jsonText}</code>
            </div>
        </div>
    );
};

export default JSONView;
