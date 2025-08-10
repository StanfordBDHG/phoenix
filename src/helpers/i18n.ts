import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Currently using English as the primary language
// Localization infrastructure is maintained for future use
const resources = {};

i18n.use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: 'en-US', // Default to English
        fallbackLng: 'en-US',
        nsSeparator: false, // allow colon in strings (language file is flat JSON)
        keySeparator: false, // we do not use keys in form messages.welcome

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;
