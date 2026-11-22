import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { checkQuestionnaire, DEFAULT_TARGET, extractQuestionnaire, getTarget, Issue, TARGET_IDS } from '../../../src/compatibility';
import type { Questionnaire } from '../../../src/types/fhir';

const HELP = `Usage: questionnaire-check <questionnaire.json> [options]

Checks a FHIR Questionnaire against what a Spezi app renderer actually supports,
and reports anything the app would reject (error) or silently ignore (warning).

Options:
  -t, --target <ids>    Renderers to check, comma-separated (default: ${DEFAULT_TARGET}).
                          researchkit-on-fhir[@version]     iOS, SpeziQuestionnaire 1.x (alias: ios, rkof)
                          spezivibe-react-native[@version]  SpeziVibe React Native template (alias: react-native)
                        Without a version, the newest known one is used (for React Native, with a
                        note: existing apps may have an older package version). A version the checker
                        doesn't list uses the closest earlier version's rules, with a note.
      --list-targets    Print every known target and exit.
      --json            Print the result as JSON.
      --strict          Exit with status 1 on warnings too, not only errors.
      --link            Also print a link that opens the questionnaire in Phoenix for review.
      --phoenix-url <u> Phoenix instance for --link (default: https://stanfordbdhg.github.io/phoenix/).
  -h, --help            Show this help.

Exit status: 0 when there are no errors, 1 when there are (or warnings with --strict), 2 on bad input.
`;

interface Options {
    file?: string;
    targets: string[];
    json: boolean;
    strict: boolean;
    link: boolean;
    phoenixUrl: string;
}

const fail = (message: string): never => {
    process.stderr.write(`questionnaire-check: ${message}\n`);
    process.exit(2);
};

const parseArgs = (args: string[]): Options => {
    const options: Options = { targets: [], json: false, strict: false, link: false, phoenixUrl: 'https://stanfordbdhg.github.io/phoenix/' };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const value = () => args[++i] ?? fail(`${arg} needs a value.`);
        if (arg === '-h' || arg === '--help') {
            process.stdout.write(HELP);
            process.exit(0);
        } else if (arg === '--list-targets') {
            process.stdout.write(`${TARGET_IDS.join('\n')}\n`);
            process.exit(0);
        } else if (arg === '-t' || arg === '--target') {
            options.targets.push(...value().split(','));
        } else if (arg.startsWith('--target=')) {
            options.targets.push(...arg.slice('--target='.length).split(','));
        } else if (arg === '--json') {
            options.json = true;
        } else if (arg === '--strict') {
            options.strict = true;
        } else if (arg === '--link') {
            options.link = true;
        } else if (arg === '--phoenix-url') {
            options.phoenixUrl = value();
        } else if (arg.startsWith('-') && arg !== '-') {
            fail(`unknown option ${arg}. Run with --help for usage.`);
        } else if (options.file) {
            fail('give exactly one questionnaire file.');
        } else {
            options.file = arg;
        }
    }
    if (!options.file) {
        process.stderr.write(HELP);
        process.exit(2);
    }
    if (options.targets.length === 0) options.targets.push(DEFAULT_TARGET);
    return options;
};

// Same format as Phoenix's #questionnaire-deflate= links (src/helpers/questionnaireLink.ts on the Phoenix side).
const phoenixLink = (baseUrl: string, json: string): string =>
    `${baseUrl.split('#')[0]}#questionnaire-deflate=${deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url')}`;

const formatIssue = (i: Issue): string => `  ${i.severity === 'error' ? 'error  ' : 'warning'}  ${i.linkId ? `[${i.linkId}] ` : ''}${i.message}  (${i.rule})`;

const main = () => {
    const options = parseArgs(process.argv.slice(2));
    const file = options.file as string;
    let text = '';
    try {
        text = readFileSync(file === '-' ? 0 : file, 'utf8');
    } catch (error) {
        fail(`can't read ${file}: ${(error as Error).message}`);
    }
    let parsed: unknown;
    try {
        // Strip a UTF-8 byte order mark, which some Windows tools write.
        parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
    } catch (error) {
        return fail(`${file} is not valid JSON: ${(error as Error).message}`);
    }
    // A Bundle is what Phoenix exports for a survey with translations: check its main questionnaire.
    const questionnaire = extractQuestionnaire(parsed) as Questionnaire;
    if (!questionnaire) {
        fail(`${file} is not a FHIR Questionnaire, or a Bundle containing one.`);
    }

    let targets: ReturnType<typeof getTarget>[] = [];
    try {
        targets = options.targets.map(getTarget);
    } catch (error) {
        fail((error as Error).message);
    }

    let results: { target: string; name: string; note?: string; issues: Issue[] }[] = [];
    try {
        results = targets.map((target) => ({
            target: target.id,
            name: target.name,
            ...(target.note ? { note: target.note } : {}),
            issues: checkQuestionnaire(questionnaire, target),
        }));
    } catch (error) {
        // Malformed JSON that parses (e.g. "item" that isn't an array). Exit 2, not 1, which means "has errors".
        fail(`couldn't check ${file}, it isn't a well-formed Questionnaire: ${(error as Error).message}`);
    }
    const all = results.flatMap((r) => r.issues);
    const errors = all.filter((i) => i.severity === 'error').length;
    const warnings = all.length - errors;
    const link = options.link ? phoenixLink(options.phoenixUrl, text) : undefined;

    if (options.json) {
        process.stdout.write(`${JSON.stringify({ file, errors, warnings, results, ...(link ? { link } : {}) }, null, 2)}\n`);
    } else {
        for (const result of results) {
            process.stdout.write(`${file}: ${result.name}\n`);
            if (result.note) process.stdout.write(`  note: ${result.note}\n`);
            process.stdout.write(result.issues.length ? `${result.issues.map(formatIssue).join('\n')}\n` : '  no issues\n');
        }
        process.stdout.write(`${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}\n`);
        if (link) process.stdout.write(`\nReview in Phoenix: ${link}\n`);
    }
    // exitCode rather than exit(), so piped output is flushed before the process ends.
    process.exitCode = errors > 0 || (options.strict && warnings > 0) ? 1 : 0;
};

main();
