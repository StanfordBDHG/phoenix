// Opening a questionnaire in Phoenix from a link, so that tools such as coding agents can hand a survey to a person
// for review. Two forms are supported:
//
// - `#questionnaire=<base64url JSON>` or `#questionnaire-deflate=<base64url deflate-raw JSON>` in the URL fragment.
//   The fragment is never sent to a server, so the questionnaire stays on the reviewer's machine.
// - `?url=<https URL>` to fetch the questionnaire JSON, e.g. from a raw GitHub file. The host must allow CORS.

export const QUESTIONNAIRE_PARAM = 'questionnaire';
export const QUESTIONNAIRE_DEFLATE_PARAM = 'questionnaire-deflate';
export const URL_PARAM = 'url';

export type LinkedQuestionnaire = { json: string } | { error: string };

const bytesToBase64Url = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const transform = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> => {
    const output = new Blob([bytes as BlobPart]).stream().pipeThrough(stream as ReadableWritablePair<Uint8Array, Uint8Array>);
    return new Uint8Array(await new Response(output).arrayBuffer());
};

// Builds a link that opens `json` in the Phoenix instance at `baseUrl`. Compressing keeps longer surveys short enough
// to paste; browsers accept fragments of well over a megabyte, but chat and terminal tools may truncate long links.
export const createQuestionnaireLink = async (baseUrl: string, json: string, compress = true): Promise<string> => {
    const bytes = new TextEncoder().encode(json);
    const fragment = compress
        ? `${QUESTIONNAIRE_DEFLATE_PARAM}=${bytesToBase64Url(await transform(bytes, new CompressionStream('deflate-raw')))}`
        : `${QUESTIONNAIRE_PARAM}=${bytesToBase64Url(bytes)}`;
    return `${baseUrl.split('#')[0]}#${fragment}`;
};

const isAllowedUrl = (value: string): boolean => {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
    } catch {
        return false;
    }
};

const checkIsQuestionnaire = (json: string): string | undefined => {
    let parsed: unknown;
    try {
        parsed = JSON.parse(json);
    } catch (error) {
        return `The linked survey is not valid JSON: ${error}`;
    }
    if ((parsed as { resourceType?: unknown } | null)?.resourceType !== 'Questionnaire') {
        return 'The linked JSON is not a FHIR Questionnaire (its resourceType must be "Questionnaire").';
    }
    return undefined;
};

// Reads a questionnaire from the link Phoenix was opened with. Returns undefined when the link has none.
export const readLinkedQuestionnaire = async (
    search: string,
    hash: string,
    fetchFn: typeof fetch = fetch,
): Promise<LinkedQuestionnaire | undefined> => {
    const fragment = new URLSearchParams(hash.replace(/^#/, ''));
    const query = new URLSearchParams(search);
    let json: string;

    try {
        if (fragment.has(QUESTIONNAIRE_DEFLATE_PARAM)) {
            const bytes = base64UrlToBytes(fragment.get(QUESTIONNAIRE_DEFLATE_PARAM) ?? '');
            json = new TextDecoder().decode(await transform(bytes, new DecompressionStream('deflate-raw')));
        } else if (fragment.has(QUESTIONNAIRE_PARAM)) {
            json = new TextDecoder().decode(base64UrlToBytes(fragment.get(QUESTIONNAIRE_PARAM) ?? ''));
        } else if (query.has(URL_PARAM)) {
            const url = query.get(URL_PARAM) ?? '';
            if (!isAllowedUrl(url)) {
                return { error: `Phoenix only opens surveys from https:// URLs, not "${url}".` };
            }
            const response = await fetchFn(url);
            if (!response.ok) {
                return { error: `Could not load the survey from ${url} (HTTP ${response.status}).` };
            }
            json = await response.text();
        } else {
            return undefined;
        }
    } catch (error) {
        return { error: `Could not read the survey from the link: ${error}` };
    }

    const problem = checkIsQuestionnaire(json);
    return problem ? { error: problem } : { json };
};

// Returns `href` without the questionnaire link parameters, so reloading the page does not import the survey again.
export const removeLinkParameters = (href: string): string => {
    const url = new URL(href);
    url.searchParams.delete(URL_PARAM);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
    fragment.delete(QUESTIONNAIRE_PARAM);
    fragment.delete(QUESTIONNAIRE_DEFLATE_PARAM);
    const rest = fragment.toString();
    url.hash = rest ? `#${rest}` : '';
    return url.toString();
};
