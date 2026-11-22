import createUUID from './CreateUUID';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

const setCrypto = (value: Partial<Crypto> | undefined): void => {
    Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
};

afterEach(() => {
    if (originalCrypto) {
        Object.defineProperty(globalThis, 'crypto', originalCrypto);
    } else {
        delete (globalThis as { crypto?: Crypto }).crypto;
    }
    jest.restoreAllMocks();
});

describe('createUUID', () => {
    it('uses crypto.randomUUID when it is available', () => {
        const randomUUID = jest.fn(() => '123e4567-e89b-42d3-a456-426614174000');
        setCrypto({ randomUUID } as Partial<Crypto>);

        expect(createUUID()).toBe('123e4567-e89b-42d3-a456-426614174000');
        expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    it('falls back to crypto.getRandomValues outside secure contexts', () => {
        const getRandomValues = jest.fn(<T extends ArrayBufferView | null>(array: T): T => {
            (array as unknown as Uint8Array).fill(0xff);
            return array;
        });
        setCrypto({ getRandomValues } as Partial<Crypto>);

        expect(createUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
        expect(getRandomValues).toHaveBeenCalledTimes(1);
    });

    it('sets the version and variant bits from getRandomValues output', () => {
        setCrypto({
            getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
                (array as unknown as Uint8Array).fill(0x00);
                return array;
            },
        } as Partial<Crypto>);

        expect(createUUID()).toBe('00000000-0000-4000-8000-000000000000');
    });

    it('falls back to Math.random when Web Crypto is unavailable', () => {
        setCrypto(undefined);
        jest.spyOn(Math, 'random').mockReturnValue(0.999);

        expect(createUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    });

    it('produces valid, distinct v4 UUIDs with the Math.random fallback', () => {
        setCrypto(undefined);
        const ids = Array.from({ length: 1000 }, () => createUUID());

        ids.forEach((id) => expect(id).toMatch(UUID_V4));
        expect(new Set(ids).size).toBe(ids.length);
        // Variant characters should not all collapse to '8' as with the old implementation.
        expect(new Set(ids.map((id) => id[19])).size).toBeGreaterThan(1);
    });
});
