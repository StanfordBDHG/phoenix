// Checks the questionnaire renderers that the compatibility rules (src/compatibility) describe for changes since the
// rules were last checked (src/compatibility/verified-renderers.json). When there are any, it opens or updates one
// issue listing them, so the rules don't silently go out of date.
//
// Run by .github/workflows/watch-renderer-releases.yml. Locally: GITHUB_TOKEN=$(gh auth token) node
// scripts/watch-renderer-releases.ts --dry-run (Node 24 runs TypeScript directly). --check only loads it.

import { readFileSync } from 'node:fs';
import { compareVersions } from '../src/compatibility/versions.ts';

interface Renderer {
    name: string;
    repo: string;
    watch: 'tags' | 'commits';
    rules: string;
    /** Tags: releases from `since` on are watched, and `checked` lists the ones reviewed. */
    since?: string;
    checked?: string[];
    /** Commits: the last reviewed commit to `path` on `branch`. */
    verified?: string;
    branch?: string;
    path?: string;
}

const ISSUE_TITLE = 'Compatibility checker: renderer changes to review';
// The workflow's token creates the issue, so its author identifies it; listing by author keeps the search small.
const ISSUE_AUTHOR = process.env.ISSUE_AUTHOR ?? 'github-actions[bot]';
const VERSION = /^v?\d+\.\d+(\.\d+)?(-[a-z]+\.?\d*)?$/;

// --check: only confirm the script and its imports load (CI runs this, since the weekly run is the only other use).
if (process.argv.includes('--check')) {
    console.log(compareVersions('2.0', '2.0.0') === 0 ? 'ok' : 'compareVersions is broken');
    process.exit(compareVersions('2.0', '2.0.0') === 0 ? 0 : 1);
}

const token = process.env.GITHUB_TOKEN;
const thisRepo = process.env.GITHUB_REPOSITORY ?? 'StanfordBDHG/phoenix';
const dryRun = process.argv.includes('--dry-run');

if (!token) {
    console.error('Set GITHUB_TOKEN.');
    process.exit(2);
}

const api = async (path: string, init: RequestInit = {}): Promise<any> => {
    const response = await fetch(`https://api.github.com${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    if (!response.ok) {
        throw new Error(`${init.method ?? 'GET'} ${path}: HTTP ${response.status} ${await response.text()}`);
    }
    return response.json();
};

/** Paginates a GitHub list endpoint (up to `maxPages` pages of 100). */
const list = async (path: string, maxPages = 10): Promise<any[]> => {
    const items: any[] = [];
    for (let page = 1; page <= maxPages; page++) {
        const batch: any[] = await api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
        items.push(...batch);
        if (batch.length < 100) break;
    }
    return items;
};

/** Lines describing what hasn't been reviewed yet, or none. */
const unreviewed = async (renderer: Renderer): Promise<string[]> => {
    if (renderer.watch === 'tags') {
        const checked = new Set(renderer.checked ?? []);
        const tags: { name: string }[] = await list(`/repos/${renderer.repo}/tags`);
        // Compare and show the version without a "v" prefix, but link to the tag as it is named.
        const pending = tags
            .map((tag) => ({ tag: tag.name, version: tag.name.replace(/^v/, '') }))
            .filter(({ tag, version }) => VERSION.test(tag) && compareVersions(version, renderer.since ?? '0.0.0') >= 0 && !checked.has(version))
            .sort((a, b) => compareVersions(a.version, b.version));
        return pending.map(({ tag, version }) => `[${version}](https://github.com/${renderer.repo}/releases/tag/${encodeURIComponent(tag)})`);
    }

    const commits: { sha: string; html_url: string; commit: { message: string; author: { date: string } } }[] = await api(
        `/repos/${renderer.repo}/commits?sha=${renderer.branch}&path=${encodeURIComponent(renderer.path ?? '')}&per_page=100`,
    );
    const index = commits.findIndex((commit) => commit.sha.startsWith(renderer.verified ?? '-'));
    if (index === -1) {
        return [`More than ${commits.length} commits to \`${renderer.path}\` since ${renderer.verified}, or it's no longer on ${renderer.branch}.`];
    }
    return commits
        .slice(0, index)
        .reverse()
        .map((commit) => `[\`${commit.sha.slice(0, 7)}\`](${commit.html_url}) ${commit.commit.message.split('\n')[0]} (${commit.commit.author.date.slice(0, 10)})`);
};

const main = async () => {
    const { renderers }: { renderers: Renderer[] } = JSON.parse(
        readFileSync(new URL('../src/compatibility/verified-renderers.json', import.meta.url), 'utf8'),
    );

    const sections: string[] = [];
    for (const renderer of renderers) {
        const changes = await unreviewed(renderer);
        console.log(`${renderer.name}: ${changes.length ? `${changes.length} to review` : 'up to date'}`);
        if (changes.length) {
            const what =
                renderer.watch === 'tags'
                    ? `Releases from ${renderer.since} on that the rules haven't been checked against:`
                    : `Commits to \`${renderer.path}\` since ${renderer.verified}, the last one the rules were checked against:`;
            sections.push(`### ${renderer.name}\n\n${what}\n\n${changes.map((change) => `- ${change}`).join('\n')}\n\nRules: ${renderer.rules}`);
        }
    }

    const issues: { number: number; title: string; body: string; pull_request?: unknown; html_url: string }[] = await list(
        `/repos/${thisRepo}/issues?state=open&creator=${encodeURIComponent(ISSUE_AUTHOR)}`,
    );
    const existing = issues.find((issue) => issue.title === ISSUE_TITLE && !issue.pull_request);

    if (sections.length === 0) {
        console.log(existing ? `Nothing new; leaving ${existing.html_url} open.` : 'Nothing new.');
        return;
    }

    const body =
        'The questionnaire renderers that the compatibility checker (`src/compatibility`) describes have changed since its rules were last checked. ' +
        'Rules that are out of date report problems that no longer exist, or miss new ones.\n\n' +
        `${sections.join('\n\n')}\n\n` +
        '### To do\n\n' +
        '1. Read what changed in each renderer, and update the rules and their tests (`src/compatibility`).\n' +
        '2. For a new release, add it to `RKOF_VERSIONS` or `RN_VERSIONS` if its behaviour differs.\n' +
        '3. Record it in `src/compatibility/verified-renderers.json`: add releases to `checked`, or set `verified` to the last commit reviewed.\n\n' +
        '_This issue is kept up to date by `.github/workflows/watch-renderer-releases.yml`._';

    if (dryRun) {
        console.log(`\n--dry-run: would ${existing ? `update ${existing.html_url}` : 'open an issue'}:\n\n${body}`);
    } else if (existing) {
        if (existing.body !== body) {
            await api(`/repos/${thisRepo}/issues/${existing.number}`, { method: 'PATCH', body: JSON.stringify({ body }) });
            console.log(`Updated ${existing.html_url}`);
        } else {
            console.log(`${existing.html_url} is already up to date.`);
        }
    } else {
        const created = await api(`/repos/${thisRepo}/issues`, { method: 'POST', body: JSON.stringify({ title: ISSUE_TITLE, body }) });
        console.log(`Opened ${created.html_url}`);
    }
};

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
