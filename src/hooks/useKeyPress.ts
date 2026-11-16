import { useEffect } from 'react';

const unhandledKeyPressTargets = ['INPUT', 'TEXTAREA', 'SELECT'];

export const useKeyPress = (targetKey: string, callback: () => void, disabled?: boolean): void => {
    const keyPressHandler = ({ key, target }: KeyboardEvent) => {
        const { tagName } = target as Element;
        const ignoreTargetType = unhandledKeyPressTargets.includes(tagName);

        if (!ignoreTargetType && key === targetKey) {
            callback();
        }
    };

    useEffect(() => {
        if (!disabled) {
            window.addEventListener('keydown', keyPressHandler);
        }

        return () => {
            window.removeEventListener('keydown', keyPressHandler);
        };
    });
};
