import { useContext, useEffect, useRef, useState } from 'react';
import { TreeContext, TreeState } from '../store/treeStore/treeStore';
import { getStateFromDb } from '../store/treeStore/indexedDbHelper';
import { resetQuestionnaireAction } from '../store/treeStore/treeActions';
import { mapToTreeState } from '../helpers/FhirToTreeStateMapper';
import Modal from '../components/Modal/Modal';
import SpinnerBox from '../components/Spinner/SpinnerBox';
import { useTranslation } from 'react-i18next';
import FormBuilder from './FormBuilder';
import Btn from '../components/Btn/Btn';
import './FrontPage.css';
import cardinalkitSpaceman from '../images/cardinalkit-spaceman.png';
import { isMobile } from "react-device-detect";
import PasteJSONModal from '../components/PasteJSON/PasteJSONView';


const FrontPage = (): JSX.Element => {
    const { t } = useTranslation();
    const { dispatch } = useContext(TreeContext);
    const [stateFromStorage, setStateFromStorage] = useState<TreeState>();
    const [isLoading, setIsLoading] = useState(false);
    const [isFormBuilderShown, setIsFormBuilderShown] = useState<boolean>(false);
    const [isDeletionAlertShown, setIsDeletionAlertShown] = useState<boolean>(false);
    const [isMobileModalShown, setIsMobileModalShown] = useState<boolean>(isMobile);
    const uploadRef = useRef<HTMLInputElement>(null);
    const [isPasteJSONViewShown, setIsPasteJSONViewShown] = useState<boolean>(false);

    useEffect(() => {
        getStoredQuestionnaire();
    }, []);

    const getStoredQuestionnaire = async () => {
        const indexedDbState = await getStateFromDb();
        setStateFromStorage(indexedDbState);
    };

    const loadQuestionnaire = (json: string): boolean => {
        let questionnaireObj: any;
        try {
            questionnaireObj = JSON.parse(json);
        } catch (error) {
            alert(`Invalid JSON input: ${error}`)
            return false;
        }
        const importedState = mapToTreeState(questionnaireObj);
        dispatch(resetQuestionnaireAction(importedState));
        setIsLoading(false);
        setIsFormBuilderShown(true);
        return true;
    }

    const onReaderLoad = (event: ProgressEvent<FileReader>) => {
        if (event.target?.result) {
            loadQuestionnaire(event.target.result as string);
            // Reset file input
            if (uploadRef.current) {
                uploadRef.current.value = '';
            }
        }
    };

    const uploadQuestionnaire = (event: React.ChangeEvent<HTMLInputElement>) => {
        setIsLoading(true);
        const reader = new FileReader();
        reader.onload = onReaderLoad;
        if (event.target.files && event.target.files[0]) reader.readAsText(event.target.files[0]);
    };
    const suggestRestore: boolean = stateFromStorage?.qItems ? Object.keys(stateFromStorage.qItems).length > 0 : false;

    const onDenyRestoreModal = (): void => {
        dispatch(resetQuestionnaireAction());
        setStateFromStorage(undefined);
    };

    const onConfirmRestoreModal = (): void => {
        dispatch(resetQuestionnaireAction(stateFromStorage));
        setStateFromStorage(undefined);
        setIsFormBuilderShown(true);
    };

    const onConfirmDeleteSurvey = (): void => {
        dispatch(resetQuestionnaireAction());
        setIsFormBuilderShown(false);
        setIsDeletionAlertShown(false);
    }

    const onDenyDeleteSurvey = (): void => {
        setIsDeletionAlertShown(false);
    }

    const onCloseMobileModal = (): void => {
        setIsMobileModalShown(false);
    }

    return (
        <>
            {suggestRestore && (
                <Modal title={t('Restore Survey')} close={onDenyRestoreModal} size={'small'}>
                    <div>
                        <p>{t('It looks like you were working on a survey called ')} <strong>{stateFromStorage?.qMetadata.title || 'Untitled'}</strong>. {t('Do you want to restore it?')}</p>
                        <div className="modal-btn-bottom">
                            <div className="center-text">
                                <Btn title={t('Yes')} type="button" variant="primary" onClick={onConfirmRestoreModal} />{' '}
                                <Btn title={t('No')} type="button" variant="secondary" onClick={onDenyRestoreModal} />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {isMobileModalShown && (
                <Modal title={t('Warning')} close={onCloseMobileModal} size={'small'}>
                    <div>
                        <p>The Phoenix Survey Builder works best on a large screen and may not appear properly on mobile devices.</p>
                        <div className="modal-btn-bottom">
                            <div className="center-text">
                                <Btn title={t('Ok')} type="button" variant="primary" onClick={onCloseMobileModal} />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {isDeletionAlertShown && (
                <Modal title={t('Delete Survey')} close={onDenyDeleteSurvey} size={'small'}>
                    <div>
                        <p>The survey you are working on will be deleted. Do you want to continue?</p>
                        <div className="modal-btn-bottom">
                            <div className="center-text">
                                <Btn title={t('Yes')} type="button" variant="primary" onClick={onConfirmDeleteSurvey} />{' '}
                                <Btn title={t('No')} type="button" variant="secondary" onClick={onDenyDeleteSurvey} />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {isLoading && (
                <Modal>
                    <div className="align-everything">
                        <SpinnerBox />
                    </div>
                    <p className="center-text">{t('Loading survey...')}</p>
                </Modal>
            )}
            {isPasteJSONViewShown && (
                <PasteJSONModal
                    onCancel={() => setIsPasteJSONViewShown(false)}
                    onImport={json => {
                        if (loadQuestionnaire(json)) {
                            // if the import failed (ie, the retval was false), we want the JSONModal to stay around,
                            // so that the user can fix the issue and the entered data isn't lost.
                            setIsPasteJSONViewShown(false)
                        }
                    }
                }/>
            )}
            {isFormBuilderShown ? (
                <FormBuilder close={() => {
                    setIsDeletionAlertShown(true);
                }} />
            ) : (
                <>
                    <header>
                        <h1 className="form-title-frontpage">{`Phoenix Survey Builder`}</h1>
                    </header>
                    <div className="frontpage">
                        <img src={cardinalkitSpaceman} alt="Spezi Spaceman" width="200" className="spaceman" />
                        <h2>{`Easily build a healthcare survey using HL7® FHIR®!`}</h2>
                        <div className="frontpage__infotext">
                            {t('You can start a new survey, or upload and continue to work on one you\'ve already started.')}
                        </div>
                        <input
                            type="file"
                            ref={uploadRef}
                            onChange={uploadQuestionnaire}
                            accept="application/JSON"
                            style={{ display: 'none' }}
                        />
                        <Btn
                            onClick={() => {
                                setIsFormBuilderShown(true);
                            }}
                            title={t('Create New Survey')}
                            variant="primary"
                        />
                        <br />
                        <br />
                        <Btn
                            onClick={() => {
                                uploadRef.current?.click();
                            }}
                            title={t('Upload Existing Survey')}
                            variant="secondary"
                        />
                        <br/>
                        <br/>
                        <Btn
                            onClick={() => {
                                setIsPasteJSONViewShown(true)
                            }}
                            title={t('Paste JSON')}
                            variant="secondary"
                        />
                    </div>
                </>
            )}
            <footer className="footer">
                <p className="footer-text">
                    An <a href="https://github.com/StanfordBDHG/Phoenix">open-source project</a> of the <a href="https://bdh.stanford.edu">Biodesign Digital Health</a> team at Stanford University.
                </p>
            </footer>
        </>
    );
};

export default FrontPage;
