import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { generateQuestionnaire } from '../../helpers/generateQuestionnaire';
import { TreeContext } from '../../store/treeStore/treeStore';
import { ValidationErrors } from '../../helpers/orphanValidation';
import IconBtn from '../IconBtn/IconBtn';

type Props = {
    showJSONView: () => void;
    validationErrors: ValidationErrors[]
};

const JSONView = ({ showJSONView, validationErrors }: Props): JSX.Element => {
    const { t } = useTranslation();
    const { state } = useContext(TreeContext);

    return (
        <div className="overlay">
            <div className="structor-helper">
                <div className="title">
                    <IconBtn type="x" title={t('Back')} onClick={showJSONView} />
                    <h1>{t('FHIR R4 Questionnaire JSON')}</h1>
                </div>
                {validationErrors.length > 0 ? (
                <div>
                    {t('Found {0} errors. Questions with errors are marked with a red border.').replace(
                        '{0}',
                        validationErrors.length.toString(),
                    )}
                </div>
            ) : (
                <div style={{paddingLeft: 20, paddingTop: 15, textAlign: 'left' }}>
                    <h3>{t('✅  This is valid FHIR.')}</h3>
                </div>
            )}
                <code className="json">{JSON.stringify(JSON.parse(generateQuestionnaire(state)), undefined, 2)}</code>
            </div>
        </div>
    );
};

export default JSONView;
