// Tests the bundled CLI as users run it. Build it first: `npm run build:check`.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const fixture = (name) => fileURLToPath(new URL(`../../../e2e/fixtures/${name}`, import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

test('reports errors and exits with status 1', () => {
    const result = run(fixture('date-conditions.json'), '--target', 'ios');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /error\s+\[follow-up\] The app can't load this survey/);
    assert.match(result.stdout, /3 errors, 0 warnings/);
});

test('exits with status 0 on warnings only, and 1 with --strict', () => {
    assert.equal(run(fixture('legacy-item-controls.json')).status, 0);
    assert.equal(run(fixture('legacy-item-controls.json'), '--strict').status, 1);
});

test('checks several targets and prints JSON', () => {
    const result = run(fixture('date-conditions.json'), '-t', 'ios@2.0.6,react-native', '--json');
    const output = JSON.parse(result.stdout);
    assert.deepEqual(
        output.results.map((r) => r.target),
        ['researchkit-on-fhir@2.0.6', 'spezivibe-react-native@1.1.0'],
    );
    assert.equal(output.results[0].note, undefined);
    assert.match(output.results[1].note, /check those with spezivibe-react-native@1\.0\.0/);
    assert.equal(output.errors, 3);
    assert.equal(output.warnings, 0);
});

test('uses the newest rules for a newer version, with a note', () => {
    const result = run(fixture('date-conditions.json'), '--target', 'ios@3.2.0');
    assert.match(result.stdout, /ResearchKitOnFHIR 3\.0\.0-beta\.2 \(iOS/);
    assert.match(result.stdout, /note: ResearchKitOnFHIR 3\.2\.0 is newer than the checker's rules/);
    const json = JSON.parse(run(fixture('date-conditions.json'), '--target', 'ios@3.2.0', '--json').stdout);
    assert.match(json.results[0].note, /last checked against 3\.0\.0-beta\.2/);
});

test('prints a Phoenix link that decodes to the original file', () => {
    const result = run(fixture('legacy-item-controls.json'), '--link', '--phoenix-url', 'http://localhost:5173/phoenix/');
    const link = result.stdout.match(/Review in Phoenix: (\S+)/)[1];
    assert.ok(link.startsWith('http://localhost:5173/phoenix/#questionnaire-deflate='));
    const json = inflateRawSync(Buffer.from(link.split('=')[1], 'base64url')).toString('utf8');
    assert.equal(json, readFileSync(fixture('legacy-item-controls.json'), 'utf8'));
});

test('exits with status 2 on bad input', () => {
    assert.equal(run('does-not-exist.json').status, 2);
    assert.equal(run(fileURLToPath(new URL('../package.json', import.meta.url))).status, 2);
    assert.equal(run(fixture('date-conditions.json'), '--target', 'android').status, 2);
    assert.equal(run(fixture('date-conditions.json'), '--target', 'ios@1.0.0').status, 2);
    assert.equal(run().status, 2);
});

test('exits with status 2, not a crash, on a malformed Questionnaire', () => {
    for (const malformed of [{ item: {} }, { item: [{ linkId: 'a', type: 'choice', answerOption: [null] }] }, { item: [{ linkId: 'a', type: 'string', extension: 'x' }] }]) {
        const result = spawnSync(process.execPath, [cli, '-'], { input: JSON.stringify({ resourceType: 'Questionnaire', ...malformed }), encoding: 'utf8' });
        assert.equal(result.status, 2, JSON.stringify(malformed));
        assert.match(result.stderr, /isn't a well-formed Questionnaire/);
    }
});

test('reads a file that starts with a byte order mark', () => {
    const json = readFileSync(fixture('legacy-item-controls.json'), 'utf8');
    const result = spawnSync(process.execPath, [cli, '-'], { input: `\uFEFF${json}`, encoding: 'utf8' });
    assert.equal(result.status, 0);
});

test('packs the CLI and its license for publishing', () => {
    const packageDir = fileURLToPath(new URL('..', import.meta.url));
    // --ignore-scripts: test:check has just built dist/cli.js, so skip prepack's rebuild.
    const result = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: packageDir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const files = JSON.parse(result.stdout)[0].files.map((f) => f.path).sort();
    assert.deepEqual(files, ['LICENSE', 'README.md', 'dist/cli.js', 'package.json']);
});

