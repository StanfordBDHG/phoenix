import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

import ReactDatePicker from 'react-datepicker';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

type PickerProps = {
    type?: 'date' | 'time';
    disabled?: boolean;
    nowButton?: boolean;
    // Called with null when the field is cleared.
    callback?: (date: Date | null) => void;
    selected?: Date;
};

const DatePicker = ({ type, disabled = true, nowButton, callback, selected }: PickerProps): JSX.Element => {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState<Date>();
    return (
        <div className="datepicker">
            <ReactDatePicker
                disabled={disabled}
                placeholderText={type === 'time' ? '00:00' : t('mm.dd.yyyy')}
                selected={selected || startDate}
                onChange={(date: Date | null) => {
                    setStartDate(date ?? undefined);
                    callback?.(date);
                }}
                todayButton={nowButton ? t('Today') : undefined}
                showTimeSelect={type === 'time'}
                showTimeSelectOnly={type === 'time'}
                dateFormat={type === 'date' ? 'MM.dd.yyyy' : 'HH:mm'}
                timeCaption={t('Time')}
            />
            <i className={type === 'time' ? 'time-icon' : 'calendar-icon'} aria-label="datepicker" />
        </div>
    );
};

export default DatePicker;
