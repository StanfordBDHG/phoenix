import React, { useState, useEffect } from 'react';
import './ConditionPopup.css';

interface ConditionPopupProps {
    onClose: () => void;
    onSave: (condition: string) => void;
    initialCondition?: string;
}

const ConditionPopup: React.FC<ConditionPopupProps> = ({ onClose, onSave, initialCondition = 'true' }) => {
    const [condition, setCondition] = useState<string>(initialCondition);

    useEffect(() => {
        setCondition(initialCondition);
    }, [initialCondition]);

    const handleSave = () => {
        onSave(condition);
        onClose();
    };

    return (
        <div className="condition-popup-overlay">
            <div className="condition-popup">
                <div className="condition-popup__content">
                    <h3>Set Condition</h3>
                    <div className="condition-popup__options">
                        <button
                            className={`condition-popup__option ${condition === 'true' ? 'selected' : ''}`}
                            onClick={() => setCondition('true')}
                        >
                            True
                        </button>
                        <button
                            className={`condition-popup__option ${condition === 'false' ? 'selected' : ''}`}
                            onClick={() => setCondition('false')}
                        >
                            False
                        </button>
                    </div>
                    <div className="condition-popup__buttons">
                        <button className="condition-popup__button" onClick={handleSave}>Save</button>
                        <button className="condition-popup__button" onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConditionPopup;