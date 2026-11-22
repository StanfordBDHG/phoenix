import { useContext, useEffect, useRef, useState, type JSX } from 'react';
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
import { LinkedQuestionnaire, readLinkedQuestionnaire, removeLinkParameters } from '../helpers/questionnaireLink';


const FrontPage = (): JSX.Element => {
    const { t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [stateFromStorage, setStateFromStorage] = useState<TreeState>();
    const [isLoading, setIsLoading] = useState(false);
    const [isFormBuilderShown, setIsFormBuilderShown] = useState<boolean>(false);
    const [isDeletionAlertShown, setIsDeletionAlertShown] = useState<boolean>(false);
    const [isMobileModalShown, setIsMobileModalShown] = useState<boolean>(isMobile);
    const uploadRef = useRef<HTMLInputElement>(null);
    const [isPasteJSONViewShown, setIsPasteJSONViewShown] = useState<boolean>(false);
    // A survey opened from a link (see questionnaireLink.ts) that would replace the survey in progress.
    const [linkedJson, setLinkedJson] = useState<string>();
    const [storedStateForLink, setStoredStateForLink] = useState<TreeState>();
    const [inProgressTitle, setInProgressTitle] = useState<string>();
    const [linkError, setLinkError] = useState<string>();

    // The latest values, for the hashchange listener registered once on mount (see below).
    const latest = useRef({ state, stateFromStorage, isFormBuilderShown, storedStateForLink });
    latest.current = { state, stateFromStorage, isFormBuilderShown, storedStateForLink };
    // The survey saved in the browser, read once on mount. A failed read counts as no saved survey, so that a link
    // still opens.
    const storedState = useRef<Promise<TreeState | undefined>>(undefined);
    // Whether the saved survey has been handed on: offered for restore, or considered by a link.
    const isStoredStateHandled = useRef(false);
    // Numbers each link import, so that only the newest one is applied when several finish out of order.
    const linkRequest = useRef(0);

    const hasItems = (treeState?: TreeState): boolean =>
        treeState?.qItems ? Object.keys(treeState.qItems).length > 0 : false;

    const loadInitialQuestionnaire = async () => {
        const request = ++linkRequest.current;
        const [indexedDbState, linked] = await Promise.all([
            storedState.current,
            readLinkedQuestionnaire(window.location.search, window.location.hash),
        ]);
        if (linked) {
            applyLinkedQuestionnaire(request, linked, indexedDbState);
        } else if (request === linkRequest.current && !isStoredStateHandled.current) {
            isStoredStateHandled.current = true;
            setStateFromStorage(indexedDbState);
        }
    };

    const openLinkedQuestionnaire = async () => {
        const request = ++linkRequest.current;
        const [indexedDbState, linked] = await Promise.all([
            storedState.current,
            readLinkedQuestionnaire(window.location.search, window.location.hash),
        ]);
        if (linked) {
            applyLinkedQuestionnaire(request, linked, indexedDbState);
        }
    };

    // Decides what the link would replace once it has loaded, since the user may have started editing or opened
    // another link in the meantime.
    const applyLinkedQuestionnaire = (request: number, linked: LinkedQuestionnaire, indexedDbState?: TreeState) => {
        if (request !== linkRequest.current) {
            return; // A newer link superseded this one.
        }
        const { state: current, stateFromStorage: pendingRestore, isFormBuilderShown: isEditing, storedStateForLink: retained } =
            latest.current;
        const stored = isStoredStateHandled.current ? undefined : indexedDbState;
        isStoredStateHandled.current = true;
        if (isEditing) {
            // Keeping the survey in progress means leaving the editor as it is.
            handleLinkedQuestionnaire(linked, current, false);
        } else {
            // Still on the front page: the survey in progress is the saved one, whether the restore prompt or an
            // earlier link prompt is offering it, or it hasn't been offered yet.
            setStateFromStorage(undefined);
            handleLinkedQuestionnaire(linked, retained ?? pendingRestore ?? stored);
        }
    };

    // `inProgress` is the survey the link would replace. When `restoreOnKeep` is set, keeping it (or dismissing an
    // error) restores it from storage, as on a fresh page load; otherwise it is already on screen. A new link replaces
    // any prompt or error from an earlier one.
    const handleLinkedQuestionnaire = (linked: LinkedQuestionnaire, inProgress?: TreeState, restoreOnKeep = true) => {
        // Remove the survey from the address bar, so reloading the page doesn't import it over the user's edits.
        window.history.replaceState(window.history.state, '', removeLinkParameters(window.location.href));
        setStoredStateForLink(restoreOnKeep ? inProgress : undefined);
        setLinkedJson(undefined);
        setLinkError(undefined);
        if ('error' in linked) {
            // The restore prompt (if any) is shown once the error is dismissed.
            setLinkError(linked.error);
        } else if (hasItems(inProgress)) {
            setInProgressTitle(inProgress?.qMetadata.title || 'Untitled');
            setLinkedJson(linked.json);
        } else {
            loadQuestionnaire(linked.json);
        }
    };

    const linkHandlers = useRef({ loadInitialQuestionnaire, openLinkedQuestionnaire });
    linkHandlers.current = { loadInitialQuestionnaire, openLinkedQuestionnaire };

    useEffect(() => {
        storedState.current = getStateFromDb().catch(() => undefined);
        linkHandlers.current.loadInitialQuestionnaire();
        // A link pasted into a tab that already shows Phoenix only changes the fragment and doesn't reload the page.
        const onHashChange = () => linkHandlers.current.openLinkedQuestionnaire();
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const onConfirmOpenLinked = (): void => {
        if (linkedJson) {
            loadQuestionnaire(linkedJson);
        }
        setLinkedJson(undefined);
        setStoredStateForLink(undefined);
    };

    const onCloseLinkError = (): void => {
        setLinkError(undefined);
        if (storedStateForLink) {
            setStateFromStorage(storedStateForLink);
        }
        setStoredStateForLink(undefined);
    };

    const onDenyOpenLinked = (): void => {
        if (storedStateForLink) {
            dispatch(resetQuestionnaireAction(storedStateForLink));
            setIsFormBuilderShown(true);
        }
        setLinkedJson(undefined);
        setStoredStateForLink(undefined);
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
    const suggestRestore: boolean = hasItems(stateFromStorage);

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
            {linkedJson && (
                <Modal title={t('Open Linked Survey')} close={onDenyOpenLinked} size={'small'}>
                    <div>
                        <p>
                            {t('This link opens a survey. Opening it replaces the survey you were working on,')}{' '}
                            <strong>{inProgressTitle}</strong>.
                        </p>
                        <div className="modal-btn-bottom">
                            <div className="center-text">
                                <Btn title={t('Open linked survey')} type="button" variant="primary" onClick={onConfirmOpenLinked} />{' '}
                                <Btn title={t('Keep my survey')} type="button" variant="secondary" onClick={onDenyOpenLinked} />
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
            {linkError && (
                <Modal title={t('Could Not Open Survey')} close={onCloseLinkError} size={'small'}>
                    <div>
                        <p>{linkError}</p>
                        <div className="modal-btn-bottom">
                            <div className="center-text">
                                <Btn title={t('Ok')} type="button" variant="primary" onClick={onCloseLinkError} />
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
                    <footer className="footer">
                        <p className="footer-text">
                            An <a href="https://github.com/StanfordBDHG/Phoenix">open-source project</a> of the <a href="https://bdh.stanford.edu">Biodesign Digital Health</a> team at Stanford University.
                        </p>
                    </footer>
                </>
            )}

        </>
    );
};

export default FrontPage;
