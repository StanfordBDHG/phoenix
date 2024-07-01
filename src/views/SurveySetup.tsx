import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../store/treeStore/treeStore';
import Btn from '../components/Btn/Btn';
import FormField from '../components/FormField/FormField';
import { IQuestionnaireMetadataType } from '../types/IQuestionnaireMetadataType';
import { updateQuestionnaireMetadataAction } from '../store/treeStore/treeActions';
import './SurveySetup.css';

const SurveySetup = () => {

    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [title, setTitle] = useState(state.qMetadata.title || 'Untitled')

    const updateMeta = (
        propName: IQuestionnaireMetadataType,
        value: string,
    ) => {
        dispatch(updateQuestionnaireMetadataAction(propName, value));
    };

    return (
        <div className="metadata-message-container">
            <p className="metadata-message-header">
                New Survey Setup
            </p>
            <div className="metadata-input">
                <FormField label={'Enter a title to identify your survey'}>
                    <input
                        style={{ color: 'black' }}
                        defaultValue={title}
                        placeholder={t('A title that will be shown to users')}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </FormField>
                <br />
                <Btn
                    onClick={() => {
                        updateMeta(IQuestionnaireMetadataType.title, title)
                    }}
                    title={t('Continue')}
                    variant="primary"
                />
            </div>
        </div>
    )
}

export default SurveySetup;