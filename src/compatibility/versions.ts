// scripts/watch-renderer-releases.ts imports this file directly with Node's TypeScript type stripping. Keep it free
// of imports and of syntax Node can't strip (enums, namespaces, parameter properties); CI runs the script's import.

const parse = (version: string): { core: number[]; pre?: { name: string; number: number } } => {
    const [core, pre] = version.split('-');
    const nums = [...core.split('.').map(Number), 0, 0].slice(0, 3); // "2.0" is "2.0.0"
    if (!pre) {
        return { core: nums };
    }
    const match = /^([a-z]*)\.?(\d*)$/i.exec(pre);
    return { core: nums, pre: { name: (match?.[1] ?? pre).toLowerCase(), number: Number(match?.[2]) || 0 } };
};

/**
 * Compares `major.minor.patch[-pre.n]` versions. A pre-release sorts before its release, and pre-releases sort by
 * name, then number: alpha.2 < beta.1 < rc.1.
 */
export const compareVersions = (a: string, b: string): number => {
    const [pa, pb] = [parse(a), parse(b)];
    for (let i = 0; i < 3; i++) {
        if (pa.core[i] !== pb.core[i]) return pa.core[i] - pb.core[i];
    }
    if (!pa.pre || !pb.pre) {
        return (pa.pre ? -1 : 0) - (pb.pre ? -1 : 0);
    }
    if (pa.pre.name !== pb.pre.name) {
        return pa.pre.name < pb.pre.name ? -1 : 1;
    }
    return pa.pre.number - pb.pre.number;
};

const VERSION_PATTERN = /^\d+(\.\d+){0,2}(-[a-z]+\.?\d*)?$/i;

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
    const exact = known.find((v) => compareVersions(v, requested) === 0);
    if (exact) {
        return { version: exact };
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
