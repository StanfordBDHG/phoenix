/** Compares `major.minor.patch[-beta.n]` versions; a pre-release sorts before its release. */
export const compareVersions = (a: string, b: string): number => {
    const parse = (v: string) => {
        const [core, pre] = v.split('-');
        const nums = [...core.split('.').map(Number), 0, 0].slice(0, 3); // "2.0" is "2.0.0"
        // A release sorts after its pre-releases. (A large number, not Infinity: Infinity - Infinity is NaN.)
        const preNum = pre ? Number(pre.replace(/\D+/g, '')) || 0 : Number.MAX_SAFE_INTEGER;
        return [...nums, preNum];
    };
    const [pa, pb] = [parse(a), parse(b)];
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

const VERSION_PATTERN = /^\d+(\.\d+){0,2}(-[a-z]+\.?\d*)?$/;

export interface ResolvedVersion {
    /** The version whose rules apply. */
    version: string;
    /** Set when that isn't the requested version: explains which rules were used instead. */
    note?: string;
}

/**
 * Picks the rules for `requested` from the versions the rules were researched for (`known`, oldest first). Renderers
 * keep releasing, so a version the checker doesn't list isn't an error: it uses the closest earlier version's rules,
 * and says so. Only versions older than every known one, or malformed versions, are rejected.
 */
export const resolveVersion = (renderer: string, known: string[], requested: string): ResolvedVersion => {
    if (!VERSION_PATTERN.test(requested)) {
        throw new Error(`"${requested}" isn't a ${renderer} version. Known versions: ${known.join(', ')}.`);
    }
    if (known.includes(requested)) {
        return { version: requested };
    }
    const earlier = known.filter((v) => compareVersions(v, requested) < 0);
    if (earlier.length === 0) {
        throw new Error(`The checker covers ${renderer} ${known[0]} and later, not ${requested}.`);
    }
    const version = earlier[earlier.length - 1];
    const newest = known[known.length - 1];
    const note =
        version === newest
            ? `${renderer} ${requested} is newer than the checker's rules, which were last checked against ${newest}. ` +
              `Its rules were used, so newer features may be reported as unsupported.`
            : `${renderer} ${requested} isn't a version the checker lists, so the rules for ${version}, the closest earlier one, were used.`;
    return { version, note };
};
