type InputFieldProps = {
    defaultValue?: string;
    value?: string;
    placeholder?: string;
    pattern?: string;
    maxLength?: number;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
};

const InputField = ({
    defaultValue,
    value,
    placeholder,
    pattern,
    maxLength,
    required,
    disabled,
    name,
    onChange,
    onBlur,
}: InputFieldProps): JSX.Element => {
    return (
        <input
            type="text"
            autoComplete="off"
            defaultValue={defaultValue}
            value={value}
            placeholder={placeholder}
            pattern={pattern}
            maxLength={maxLength}
            required={required}
            disabled={disabled}
            name={name}
            onChange={onChange}
            onBlur={onBlur}
        />
    );
};

export default InputField;
