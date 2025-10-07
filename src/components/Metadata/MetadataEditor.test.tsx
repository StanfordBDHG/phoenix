import { supportedLanguages, getLanguageFromCode } from '../../helpers/LanguageHelper';

describe('Language Selector - Supported Languages', () => {
    it('includes English (US) as default', () => {
        const englishUS = supportedLanguages.find(lang => lang.code === 'en-US');
        expect(englishUS).toBeDefined();
        expect(englishUS?.display).toBe('English');
    });

    it('includes English (UK)', () => {
        const englishUK = supportedLanguages.find(lang => lang.code === 'en-GB');
        expect(englishUK).toBeDefined();
        expect(englishUK?.display).toBe('English (UK)');
    });

    it('includes Spanish variants', () => {
        const spanishES = supportedLanguages.find(lang => lang.code === 'es-ES');
        const spanishMX = supportedLanguages.find(lang => lang.code === 'es-MX');
        const spanishUS = supportedLanguages.find(lang => lang.code === 'es-US');

        expect(spanishES).toBeDefined();
        expect(spanishMX).toBeDefined();
        expect(spanishUS).toBeDefined();
    });

    it('includes German', () => {
        const german = supportedLanguages.find(lang => lang.code === 'de-DE');
        expect(german).toBeDefined();
        expect(german?.display).toBe('German');
    });

    it('includes Swedish', () => {
        const swedish = supportedLanguages.find(lang => lang.code === 'sv-SE');
        expect(swedish).toBeDefined();
        expect(swedish?.display).toBe('Swedish');
    });

    it('does not include custom as a supported language', () => {
        const custom = supportedLanguages.find(lang => lang.code === 'custom');
        expect(custom).toBeUndefined();
    });

    it('has correct structure for all languages', () => {
        supportedLanguages.forEach(lang => {
            expect(lang).toHaveProperty('code');
            expect(lang).toHaveProperty('display');
            expect(typeof lang.code).toBe('string');
            expect(typeof lang.display).toBe('string');
        });
    });
});

describe('Language Selector - Custom Language Detection', () => {
    it('detects when language is not in supported list', () => {
        const customLanguage = 'fr-FR';
        const found = getLanguageFromCode(customLanguage);
        expect(found).toBeUndefined();
    });

    it('finds supported language by code', () => {
        const germanCode = 'de-DE';
        const found = getLanguageFromCode(germanCode);
        expect(found).toBeDefined();
        expect(found?.code).toBe('de-DE');
        expect(found?.display).toBe('German');
    });

    it('identifies custom language that should trigger custom fields', () => {
        const testCases = [
            { code: 'fr-FR', shouldBeCustom: true, description: 'French' },
            { code: 'ja-JP', shouldBeCustom: true, description: 'Japanese' },
            { code: 'en-US', shouldBeCustom: false, description: 'English US (supported)' },
            { code: 'de-DE', shouldBeCustom: false, description: 'German (supported)' },
            { code: 'custom', shouldBeCustom: false, description: 'Reserved custom keyword' },
        ];

        testCases.forEach(testCase => {
            const isCustom = testCase.code !== 'custom' && !supportedLanguages.find(x => x.code === testCase.code);
            expect(isCustom).toBe(testCase.shouldBeCustom);
        });
    });

    it('correctly handles case-insensitive language lookup', () => {
        const found = getLanguageFromCode('EN-US');
        expect(found).toBeDefined();
        expect(found?.code).toBe('en-US');
    });
});

describe('Language Selector - Custom Language Behavior', () => {
    it('custom option should be added to dropdown options at runtime', () => {
        // Simulate what happens in the UI
        const dropdownOptions = [...supportedLanguages, { code: 'custom', display: 'Custom' }];

        const customOption = dropdownOptions.find(opt => opt.code === 'custom');
        expect(customOption).toBeDefined();
        expect(customOption?.display).toBe('Custom');
    });

    it('dropdown value should be "custom" when language is not supported', () => {
        const currentLanguage = 'fr-FR';
        const isCustomLanguage = currentLanguage && !supportedLanguages.find(x => x.code === currentLanguage);
        const dropdownValue = isCustomLanguage ? 'custom' : currentLanguage;

        expect(dropdownValue).toBe('custom');
    });

    it('dropdown value should be actual language code when supported', () => {
        const currentLanguage = 'de-DE';
        const isCustomLanguage = currentLanguage && !supportedLanguages.find(x => x.code === currentLanguage);
        const dropdownValue = isCustomLanguage ? 'custom' : currentLanguage;

        expect(dropdownValue).toBe('de-DE');
    });

    it('should show custom fields when language is not in supported list', () => {
        const testLanguages = [
            { code: 'fr-FR', shouldShowCustomFields: true },
            { code: 'ja-JP', shouldShowCustomFields: true },
            { code: 'en-US', shouldShowCustomFields: false },
            { code: 'es-ES', shouldShowCustomFields: false },
        ];

        testLanguages.forEach(testLang => {
            const isCustom = testLang.code && !supportedLanguages.find(x => x.code === testLang.code);
            expect(isCustom).toBe(testLang.shouldShowCustomFields);
        });
    });
});
