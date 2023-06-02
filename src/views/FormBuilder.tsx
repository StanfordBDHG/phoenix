import { useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TreeContext } from '../store/treeStore/treeStore';
import AnchorMenu from '../components/AnchorMenu/AnchorMenu';
import Navbar from '../components/Navbar/Navbar';
import QuestionDrawer from '../components/QuestionDrawer/QuestionDrawer';
import Modal from '../components/Modal/Modal'
import './FormBuilder.css';
import { ValidationErrors } from '../helpers/orphanValidation';
import TranslationModal from '../components/Languages/Translation/TranslationModal';
import MetadataEditor from '../components/Metadata/MetadataEditor';
import SurveySetup from './SurveySetup'

type FormBuilderProps = {
    close: () => void
}

const FormBuilder = (props: FormBuilderProps): JSX.Element => {
    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [showFormDetails, setShowFormDetails] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Array<ValidationErrors>>([]);
    const [translationErrors, setTranslationErrors] = useState<Array<ValidationErrors>>([]);
    const [translateLang, setTranslateLang] = useState('');


    const toggleFormDetails = useCallback(() => {
        setShowFormDetails(!showFormDetails);
    }, [showFormDetails]);

    return (
        <>
            <Navbar
                showFormFiller={() => setShowPreview(!showPreview)}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
                translationErrors={translationErrors}
                setTranslationErrors={setTranslationErrors}
                toggleFormDetails={toggleFormDetails}
                close={props.close}
                title={state.qMetadata.title}
            />
            <div className="editor">
                { state.qMetadata.url && state.qMetadata.title ? (
                <AnchorMenu
                    dispatch={dispatch}
                    qOrder={state.qOrder}
                    qItems={state.qItems}
                    qCurrentItem={state.qCurrentItem}
                    validationErrors={validationErrors}
                />
                ) : (
                    <SurveySetup />
                )}
                {translateLang && (
                    <TranslationModal close={() => setTranslateLang('')} targetLanguage={translateLang} />
                )}
            </div>
            <div className="page-wrapper">
                {(showFormDetails) &&
                    <Modal size={'large'}
                        title={'Survey Metadata'}
                        close={toggleFormDetails}
                        bottomCloseText={'Save'}
                        bottomButtonAlignment={'right-text'}>
                        <MetadataEditor />
                    </Modal>
                }
                <QuestionDrawer validationErrors={validationErrors} />
            </div>
        </>
    );
};

export default FormBuilder;
