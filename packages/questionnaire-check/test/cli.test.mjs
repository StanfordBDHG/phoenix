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
        ['researchkit-on-fhir@2.0.6', 'spezivibe-react-native'],
    );
    assert.equal(output.errors, 3);
    assert.equal(output.warnings, 1);
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
    assert.equal(run().status, 2);
});
