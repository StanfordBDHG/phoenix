import './Btn.css';

type BtnProps = {
    title: string;
    onClick?: () => void;
    id?: string;
    type?: 'button' | 'submit' | 'reset';
    icon?: 'ion-plus-round' | 'ion-ios-trash' | 'ion-create-outline';
    variant?: 'primary' | 'secondary' | 'error';
};

const Btn = ({ title, onClick, id, type = 'button', icon, variant }: BtnProps): JSX.Element => {
    return (
        <button type={type} className={`regular-btn ${variant}`} id={id} onClick={onClick}>
            {icon && <i className={icon} />} {title}
        </button>
    );
};

export default Btn;
