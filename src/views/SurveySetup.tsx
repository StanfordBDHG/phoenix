import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../store/treeStore/treeStore';
import { createUrlUUID } from '../helpers/uriHelper';
import Btn from '../components/Btn/Btn';
import FormField from '../components/FormField/FormField';
import { IQuestionnaireMetadataType } from '../types/IQuestionnaireMetadataType';
import { updateQuestionnaireMetadataAction } from '../store/treeStore/treeActions';
import './SurveySetup.css'
import { IQuestionnaireItemType } from '../types/IQuestionnareItemType';

const SurveySetup = () => {

    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [title, setTitle] = useState(state.qMetadata.title || '')
    const [url, setURL] = useState(state.qMetadata.url || createUrlUUID());

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
                <p>Enter a title and a unique URL to identify your survey. It's OK if the URL isn't a real address on the web.
                    <br /><br />
                    These values can be changed later on by clicking <strong>Edit Metadata</strong> in the toolbar.</p>
                <FormField label={'Title'}>
                    <input
                        style={{ color: 'black' }}
                        defaultValue={title}
                        placeholder={t('A title that will be shown to users')}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </FormField>
                <FormField label={'Unique URL'}>
                    <input
                        style={{ color: 'black' }}
                        defaultValue={url}
                        placeholder={t('Unique URL')}
                        onChange={(e) => setURL(e.target.value)}
                        pattern="[Hh][Tt][Tt][Pp][Ss]?:\/\/(?:(?:[a-zA-Z\u00a1-\uffff0-9]+-?)*[a-zA-Z\u00a1-\uffff0-9]+)(?:\.(?:[a-zA-Z\u00a1-\uffff0-9]+-?)*[a-zA-Z\u00a1-\uffff0-9]+)*(?:\.(?:[a-zA-Z\u00a1-\uffff]{2,}))(?::\d{2,5})?(?:\/[^\s]*)?"
                    />
                </FormField>
                <br />
                <Btn
                    onClick={() => {
                        updateMeta(IQuestionnaireMetadataType.url, url);
                        updateMeta(IQuestionnaireMetadataType.title, title)
                    }}
                    title={t('Save and Continue')}
                    variant="primary"
                />
            </div>
        </div>
    )
}

export default SurveySetup;