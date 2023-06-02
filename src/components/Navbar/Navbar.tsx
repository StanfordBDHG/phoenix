import { useContext, useRef, useState } from 'react';
import { generateQuestionnaire } from '../../helpers/generateQuestionnaire';
import { Languages, TreeContext } from '../../store/treeStore/treeStore';
import Btn from '../Btn/Btn';
import useOutsideClick from '../../hooks/useOutsideClick';
import './Navbar.css';
import JSONView from '../JSONView/JSONView';
import PredefinedValueSetModal from '../PredefinedValueSetModal/PredefinedValueSetModal';
import ImportValueSet from '../ImportValueSet/ImportValueSet';
import { saveAction } from '../../store/treeStore/treeActions';
import { validateOrphanedElements, validateTranslations, ValidationErrors } from '../../helpers/orphanValidation';
import { ValidationErrorsModal } from '../ValidationErrorsModal/validationErrorsModal';
import { useTranslation } from 'react-i18next';
import IconBtn from '../IconBtn/IconBtn';

type Props = {
    showFormFiller: () => void;
    setValidationErrors: (errors: ValidationErrors[]) => void;
    validationErrors: ValidationErrors[];
    translationErrors: ValidationErrors[];
    setTranslationErrors: (errors: ValidationErrors[]) => void;
    toggleFormDetails: () => void;
    close: () => void;
    title: String | undefined;
};

enum MenuItem {
    none = 'none',
    file = 'file',
    more = 'more',
}

const Navbar = ({
    showFormFiller,
    setValidationErrors,
    validationErrors,
    translationErrors,
    setTranslationErrors,
    toggleFormDetails,
    close,
    title
}: Props): JSX.Element => {
    const { i18n, t } = useTranslation();
    const { state, dispatch } = useContext(TreeContext);
    const [selectedMenuItem, setSelectedMenuItem] = useState(MenuItem.none);
    const [showContained, setShowContained] = useState(false);
    const [showImportValueSet, setShowImportValueSet] = useState(false);
    const [showJSONView, setShowJSONView] = useState(false);
    const [showValidationErrors, setShowValidationErrors] = useState<boolean>(false);
    const navBarRef = useRef<HTMLDivElement>(null);
    const fileExtension = 'json';

    const hideMenu = () => {
        setSelectedMenuItem(MenuItem.none);
    };

    useOutsideClick(navBarRef, hideMenu, selectedMenuItem === MenuItem.none);

    const callbackAndHide = (callback: () => void) => {
        callback();
        hideMenu();
    };

    const getFileName = (): string => {
        let technicalName = state.qMetadata.name || 'survey';
        technicalName = technicalName.length > 40 ? technicalName.substring(0, 40) + '...' : technicalName;
        const version = state.qMetadata.version ? `-v${state.qMetadata.version}` : '';
        if (state.qAdditionalLanguages && Object.values(state.qAdditionalLanguages).length < 1) {
            return `${technicalName}-${state.qMetadata.language}${version}`;
        }
        return `${technicalName}${version}`;
    };

    function exportToJsonAndDownload() {
        const questionnaire = generateQuestionnaire(state);
        const filename = `${getFileName()}.${fileExtension}`;
        const contentType = 'application/json;charset=utf-8;';

        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            const blob = new Blob([decodeURIComponent(encodeURI(questionnaire))], {
                type: contentType,
            });
            navigator.msSaveOrOpenBlob(blob, filename);
        } else {
            const a = document.createElement('a');
            a.download = filename;
            a.href = 'data:' + contentType + ',' + encodeURIComponent(questionnaire);
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
        dispatch(saveAction());
    }

    const handleMenuItemClick = (clickedItem: MenuItem) => {
        if (selectedMenuItem !== clickedItem) {
            setSelectedMenuItem(clickedItem);
        } else {
            hideMenu();
        }
    };

    const cachedProfile = sessionStorage.getItem('profile');
    const profile = cachedProfile ? JSON.parse(cachedProfile) : null;

    function getProfileName(): string {
        return `${profile.given_name} ${profile.family_name}`;
    }

    const hasTranslations = (languages: Languages | undefined): boolean => {
        return !!languages && Object.keys(languages).length > 0;
    };

    return (
        <>
            <header ref={navBarRef}>
                <div className="pull-left form-title">
                    <h1><IconBtn type="x" title={t('Close')} onClick={() => {close()}} /><a className="survey-title-button" onClick={toggleFormDetails}>{title || 'CardinalKit Survey Builder'}</a></h1>
                </div>

                <div className="pull-right">
                    {profile && profile.name && (
                        <p
                            className="truncate profile-name"
                            title={t('You are logged in as {0}').replace('{0}', profile.name)}
                        >
                            {getProfileName()}
                        </p>
                    )}
                    <Btn title={t('Edit Metadata')} onClick={() => toggleFormDetails()} />
                    <Btn
                            title={t('Validate')}
                            onClick={() => {
                                setValidationErrors(
                                    validateOrphanedElements(t, state.qOrder, state.qItems, state.qContained || []),
                                );
                                setTranslationErrors(
                                    validateTranslations(t, state.qOrder, state.qItems, state.qAdditionalLanguages),
                                );
                                setShowValidationErrors(true);
                            }}
                        />
                    <Btn title={t('Preview')} onClick={() => {
                        // validate the FHIR and then show the JSON
                        setValidationErrors(
                            validateOrphanedElements(t, state.qOrder, state.qItems, state.qContained || []),
                        );
                        setShowJSONView(!showJSONView);
                    }} />
                    <Btn title={t('Download')} onClick={() => exportToJsonAndDownload()} />
                    
                </div>
                {selectedMenuItem === MenuItem.more && (
                    <div className="menu">
                        <Btn
                            title={t('Validate')}
                            onClick={() => {
                                setValidationErrors(
                                    validateOrphanedElements(t, state.qOrder, state.qItems, state.qContained || []),
                                );
                                setTranslationErrors(
                                    validateTranslations(t, state.qOrder, state.qItems, state.qAdditionalLanguages),
                                );
                                setShowValidationErrors(true);
                            }}
                        />
                        <Btn
                            title={t('Import choices')}
                            onClick={() => callbackAndHide(() => setShowImportValueSet(!showImportValueSet))}
                        />
                        <Btn
                            title={t('Choices')}
                            onClick={() => callbackAndHide(() => setShowContained(!showContained))}
                        />
                    </div>
                )}
            </header>
            {showValidationErrors && (
                <ValidationErrorsModal
                    validationErrors={validationErrors}
                    translationErrors={translationErrors}
                    hasTranslations={hasTranslations(state.qAdditionalLanguages)}
                    onClose={() => setShowValidationErrors(false)}
                />
            )}
            {showContained && <PredefinedValueSetModal close={() => setShowContained(!showContained)} />}
            {showImportValueSet && <ImportValueSet close={() => setShowImportValueSet(!showImportValueSet)} />}
            {showJSONView && <JSONView showJSONView={() => setShowJSONView(!showJSONView)} validationErrors={validationErrors} />}
        </>
    );
};

export default Navbar;
