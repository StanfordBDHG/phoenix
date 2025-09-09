import { removeSpace } from './formatHelper';

describe('removeSpace', () => {
    it('removes spaces and converts to lowercase', () => {
        expect(removeSpace('Apple Orange')).toBe('apple-orange');
    });

    it('removes special characters including ampersand from issue #103', () => {
        expect(removeSpace('Apple & Orange')).toBe('apple-orange');
    });

    it('removes various special characters', () => {
        expect(removeSpace('Test @ Symbol')).toBe('test-symbol');
        expect(removeSpace('Test ! Exclamation')).toBe('test-exclamation');
        expect(removeSpace('Test # Hash')).toBe('test-hash');
        expect(removeSpace('Test $ Dollar')).toBe('test-dollar');
        expect(removeSpace('Test % Percent')).toBe('test-percent');
    });

    it('handles multiple consecutive spaces', () => {
        expect(removeSpace('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('preserves valid characters (letters, numbers, underscores)', () => {
        expect(removeSpace('Valid_Code123')).toBe('valid_code123');
    });

    it('handles existing hyphens', () => {
        expect(removeSpace('Already-Valid-Code')).toBe('already-valid-code');
    });

    it('handles empty string', () => {
        expect(removeSpace('')).toBe('');
    });

    it('handles string with only special characters', () => {
        expect(removeSpace('!@#$%^&*()')).toBe('');
    });
});