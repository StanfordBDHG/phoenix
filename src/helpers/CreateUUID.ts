// Builds an RFC 4122 version 4 UUID from 16 random bytes.
const uuidFromRandomBytes = (bytes: Uint8Array): string => {
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const createUUID = (): string => {
    const cryptoApi = globalThis.crypto as Crypto | undefined;

    // crypto.randomUUID is only exposed in secure contexts (HTTPS or localhost).
    if (typeof cryptoApi?.randomUUID === 'function') {
        return cryptoApi.randomUUID();
    }

    // crypto.getRandomValues is available in all contexts in supported browsers.
    if (typeof cryptoApi?.getRandomValues === 'function') {
        return uuidFromRandomBytes(cryptoApi.getRandomValues(new Uint8Array(16)));
    }

    // Last resort for environments without Web Crypto.
    const bytes = new Uint8Array(16);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return uuidFromRandomBytes(bytes);
};

export default createUUID;
