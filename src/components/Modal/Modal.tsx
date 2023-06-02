import { useTranslation } from 'react-i18next';
import Btn from '../Btn/Btn';
import IconBtn from '../IconBtn/IconBtn';
import './Modal.css';

type Props = {
    close?: () => void;
    title?: string;
    children: JSX.Element | JSX.Element[];
    size?: 'large' | 'small';
    id?: string;
    bottomCloseText?: string;
    bottomButtonAlignment?: 'center-text' | 'right-text';
};

const Modal = ({ close, children, title, size = 'small', id, bottomCloseText, bottomButtonAlignment = 'center-text' }: Props): JSX.Element => {
    const { t } = useTranslation();

    return (
        <div className="overlay align-everything">
            <div className={`modal ${size}`} id={id}>
                <div className="title sticky">
                    <IconBtn type="x" title={t('Close')} onClick={close} />
                    <h1>{title}</h1>
                </div>
                <div className="content">{children}</div>
                {bottomCloseText && (
                    <div className="modal-btn-bottom">
                        <div className={bottomButtonAlignment} style={{paddingRight: 10}}>
                            <Btn title={bottomCloseText} type="button" variant="primary" onClick={close} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
