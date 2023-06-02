import { useTranslation } from 'react-i18next';
import MetadataEditor from '../../Metadata/MetadataEditor';
import Drawer from '../Drawer';
import { useKeyPress } from '../../../hooks/useKeyPress';

type FormDetailsDrawerProps = {
    setTranslateLang: (language: string) => void;
    closeDrawer: () => void;
    isOpen?: boolean;
};

const FormDetailsDrawer = ({ closeDrawer, isOpen = false }: FormDetailsDrawerProps): JSX.Element => {
    const { t } = useTranslation();

    useKeyPress('Escape', closeDrawer, !isOpen);

    return (
        <Drawer title={t('Survey Settings')} position="left" visible={isOpen} hide={closeDrawer}>
            <MetadataEditor />
        </Drawer>
    );
};

export default FormDetailsDrawer;
