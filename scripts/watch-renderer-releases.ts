// Checks the questionnaire renderers that the compatibility rules (src/compatibility) describe for changes since the
// rules were last checked (src/compatibility/verified-renderers.json). When there are any, it opens or updates one
// issue listing them, so the rules don't silently go out of date.
//
// Run by .github/workflows/watch-renderer-releases.yml. Locally: GITHUB_TOKEN=$(gh auth token) node
// scripts/watch-renderer-releases.ts --dry-run (Node 24 runs TypeScript directly).

import { readFileSync } from 'node:fs';
import { compareVersions } from '../src/compatibility/versions.ts';

interface Renderer {
    name: string;
    repo: string;
    watch: 'tags' | 'commits';
    verified: string;
    rules: string;
    branch?: string;
    path?: string;
}

const ISSUE_TITLE = 'Compatibility checker: renderer changes to review';
const VERSION = /^v?\d+\.\d+(\.\d+)?(-[a-z]+\.?\d*)?$/;

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

/** Lines describing what changed since `renderer.verified`, or none. */
const changesSince = async (renderer: Renderer): Promise<string[]> => {
    if (renderer.watch === 'tags') {
        const tags: { name: string }[] = await api(`/repos/${renderer.repo}/tags?per_page=100`);
        const newer = tags
            .map((tag) => tag.name)
            .filter((name) => VERSION.test(name))
            .map((name) => name.replace(/^v/, ''))
            .filter((version) => compareVersions(version, renderer.verified) > 0)
            .sort(compareVersions);
        return newer.map((version) => `[${version}](https://github.com/${renderer.repo}/releases/tag/${version})`);
    }

    const commits: { sha: string; html_url: string; commit: { message: string; author: { date: string } } }[] = await api(
        `/repos/${renderer.repo}/commits?sha=${renderer.branch}&path=${encodeURIComponent(renderer.path ?? '')}&per_page=100`,
    );
    const index = commits.findIndex((commit) => commit.sha.startsWith(renderer.verified));
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
        const changes = await changesSince(renderer);
        console.log(`${renderer.name}: ${changes.length ? `${changes.length} change(s)` : 'up to date'} since ${renderer.verified}`);
        if (changes.length) {
            const where = renderer.watch === 'tags' ? 'New releases' : `New commits to \`${renderer.path}\``;
            sections.push(
                `### ${renderer.name}\n\n${where} since ${renderer.verified}, the version the rules were last checked against:\n\n` +
                    `${changes.map((change) => `- ${change}`).join('\n')}\n\nRules: ${renderer.rules}`,
            );
        }
    }

    const issues: { number: number; title: string; body: string; pull_request?: unknown; html_url: string }[] = await api(
        `/repos/${thisRepo}/issues?state=open&per_page=100`,
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
        '3. Update `verified` in `src/compatibility/verified-renderers.json`.\n\n' +
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
