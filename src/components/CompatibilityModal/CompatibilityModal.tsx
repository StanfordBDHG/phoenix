import { useMemo, useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { checkQuestionnaire, DEFAULT_TARGET, getTarget, RKOF_DEFAULT_VERSION, RKOF_VERSIONS } from '../../compatibility';
import Modal from '../Modal/Modal';
import type { Questionnaire } from '../../types/fhir';
import './CompatibilityModal.css';

interface CompatibilityModalProps {
    /** The questionnaire as Phoenix exports it. */
    questionnaire: Questionnaire;
    onClose: () => void;
}

const TARGET_STORAGE_KEY = 'phoenix-compatibility-target';

const readStoredTarget = (): string => {
    try {
        const stored = localStorage.getItem(TARGET_STORAGE_KEY);
        if (stored) {
            getTarget(stored);
            return stored;
        }
    } catch {
        // Storage unavailable, or a target that no longer exists.
    }
    return DEFAULT_TARGET;
};

// Shows what an app renderer would reject or silently ignore in the survey. The rules are shared with the
// questionnaire-check CLI (packages/questionnaire-check).
const CompatibilityModal = ({ questionnaire, onClose }: CompatibilityModalProps): JSX.Element => {
    const { t } = useTranslation();
    const [target, setTarget] = useState(readStoredTarget);
    const issues = useMemo(() => checkQuestionnaire(questionnaire, target), [questionnaire, target]);
    const errors = issues.filter((issue) => issue.severity === 'error').length;
    const warnings = issues.length - errors;

    const selectTarget = (value: string) => {
        setTarget(value);
        try {
            localStorage.setItem(TARGET_STORAGE_KEY, value);
        } catch {
            // Remembering the choice is a convenience only.
        }
    };

    return (
        <Modal close={onClose} title={t('App Compatibility')} size="large" bottomCloseText={t('Close')}>
            <div className="compatibility">
                <label className="compatibility__target">
                    {t('Check against')}
                    <select value={target} onChange={(event) => selectTarget(event.target.value)}>
                        <optgroup label="iOS (SpeziQuestionnaire 1.x)">
                            {[...RKOF_VERSIONS].reverse().map((version) => (
                                <option key={version} value={`researchkit-on-fhir@${version}`}>
                                    ResearchKitOnFHIR {version}
                                    {version === RKOF_DEFAULT_VERSION ? ` (${t('current')})` : ''}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="React Native">
                            <option value="spezivibe-react-native">SpeziVibe React Native template</option>
                        </optgroup>
                    </select>
                </label>
                <p className="compatibility__summary">
                    {issues.length === 0
                        ? t('No issues found: the app supports everything in this survey.')
                        : `${errors} ${errors === 1 ? t('error') : t('errors')}, ${warnings} ${warnings === 1 ? t('warning') : t('warnings')}. ${t('Errors stop the app from loading the survey or stop participants from finishing it. Warnings are parts of the survey the app ignores without telling anyone.')}`}
                </p>
                <ul className="compatibility__issues">
                    {issues.map((issue, index) => (
                        <li key={index} className={`compatibility__issue compatibility__issue--${issue.severity}`}>
                            <span className="compatibility__severity">{issue.severity === 'error' ? t('Error') : t('Warning')}</span>
                            <span>{issue.message}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
};

export default CompatibilityModal;
