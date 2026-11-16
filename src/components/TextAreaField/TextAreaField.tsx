import { useEffect, useState } from 'react';

interface TextAreaFieldProps {
    data: string;
    onBlur?: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

// A plain multi-line text field that reports its value when it loses focus.
const TextAreaField = ({ data, onBlur, disabled, placeholder }: TextAreaFieldProps): JSX.Element => {
    const [value, setValue] = useState<string>(data);

    // Keep in sync when the value is changed elsewhere (e.g. switching the translation language).
    useEffect(() => {
        setValue(data);
    }, [data]);

    return (
        <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={(event) => onBlur?.(event.target.value)}
            disabled={disabled}
            placeholder={placeholder}
        />
    );
};

export default TextAreaField;
