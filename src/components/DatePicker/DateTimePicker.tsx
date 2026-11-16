import 'react-datepicker/dist/react-datepicker.css';
import './DatePicker.css';

import DatePicker from 'react-datepicker';
import { useState, type JSX } from 'react';
import { useTranslation } from 'react-i18next';

type DateTimePickerProps = {
    disabled?: boolean;
    nowButton?: boolean;
    // Called with null when the field is cleared.
    callback?: (date: Date | null) => void;
    selected?: Date;
};

const DateTimePicker = ({ disabled = true, callback, nowButton, selected }: DateTimePickerProps): JSX.Element => {
    const { t } = useTranslation();
    const [startDate, setStartDate] = useState<Date>();
    return (
        <div className="datepicker">
            <DatePicker
                disabled={disabled}
                placeholderText={t('mm.dd.yyyy 00:00')}
                selected={selected || startDate}
                onChange={(date: Date | null) => {
                    setStartDate(date ?? undefined);
                    callback?.(date);
                }}
                todayButton={nowButton ? t('Today') : undefined}
                timeIntervals={15}
                showTimeSelect
                dateFormat="MM.dd.yyyy HH:mm"
                timeCaption={t('Time')}
            />
            <i className="calendar-icon" aria-label="date and time picker" />
        </div>
    );
};

export default DateTimePicker;
