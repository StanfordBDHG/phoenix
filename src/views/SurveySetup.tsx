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
    const [title, setTitle] = useState(state.qMetadata.title || 'New Survey')
    const [isTitleEdited, setIsTitleEdited] = useState(false);
    const [validationMessage, setValidationMessage] = useState('');


    const updateMeta = (
        propName: IQuestionnaireMetadataType,
        value: string,
    ) => {
        dispatch(updateQuestionnaireMetadataAction(propName, value));
    };

    const handleFocus = () => {
        if (!isTitleEdited) {
            setTitle("");
            setIsTitleEdited(true);
        }
    }

    const handleSubmit = () => {
        if (title.trim() !== '') {
            updateMeta(IQuestionnaireMetadataType.title, title);
        } else {
            setValidationMessage(t('Title cannot be empty.'));
            setTitle('');
        }
    };

    return (
        <div className="metadata-message-container">
            <p className="metadata-message-header">
                Create a New Survey
            </p>
            <div className="metadata-input">
                <FormField label={'Enter a title for your survey'}>
                    <input
                        style={{ color: 'black' }}
                        value={title}
                        onFocus={handleFocus}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                    {validationMessage && (
                        <p className="msg-error">{validationMessage}</p>
                    )}
                </FormField>
                <Btn
                    onClick={handleSubmit}
                    title={t('Continue')}
                    variant="primary"
                />
            </div>
        </div>
    )
}

export default SurveySetup;