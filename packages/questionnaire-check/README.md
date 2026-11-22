# questionnaire-check

Checks a FHIR Questionnaire against what a Spezi app renderer actually supports. It reports anything the app would reject or silently ignore, before a study ships.

FHIR allows far more than any renderer implements, and most gaps are silent. For example, the iOS app shows a question inside a group even when it has a condition, and the React Native app doesn't enforce the maximum of an optional question.

The CLI is a single file with no dependencies, attached to the [`questionnaire-check` release](https://github.com/StanfordBDHG/phoenix/releases/tag/questionnaire-check) and replaced whenever the rules change. Run it with Node.js 18 or later:

```bash
curl -fsSLO https://github.com/StanfordBDHG/phoenix/releases/download/questionnaire-check/questionnaire-check.mjs
node questionnaire-check.mjs survey.json
node questionnaire-check.mjs survey.json --target ios,react-native --link
```

It isn't on npm yet; `package.json` is set up for publishing (`npm publish` builds it) once there is a package name to publish under.

```
survey.json: ResearchKitOnFHIR 2.0.10 (iOS, SpeziQuestionnaire 1.x)
  error    [pain] ResearchKit rejects the slider "Pain": it has 100 steps, and ResearchKit allows at most 13. ...  (rkof/invalid-slider)
  warning  [cond] The condition on "Cond" is ignored because the question is inside a group, so it is always shown. ...  (rkof/enable-when-in-group)
1 error, 1 warning
```

- **error**: the app can't load the survey, may crash, or a participant can't finish it.
- **warning**: the app loads the survey but ignores or changes part of it.

## Targets

| Target | Renderer |
|---|---|
| `researchkit-on-fhir[@version]` (aliases `ios`, `rkof`) | [ResearchKitOnFHIR](https://github.com/StanfordBDHG/ResearchKitOnFHIR), used by SpeziQuestionnaire 1.x on iOS. Versions 2.0.0 to 3.0.0-beta.2; the default is 2.0.10. SpeziQuestionnaire 1.3 allows ResearchKitOnFHIR 2.0.4 up to 3.0.0, so an app may use an older version: use the one in the app's `Package.resolved`, e.g. `researchkit-on-fhir@2.0.4`. Run `--list-targets` for all of them. |
| `spezivibe-react-native[@version]` (alias `react-native`) | The questionnaire package of the [SpeziVibe React Native template](https://github.com/StanfordSpezi/SpeziVibeReactNativeTemplate). Apps get a copy of the package when they're created, so use the version in the app's `packages/questionnaire/package.json`: 1.0.0 (apps created before 2026-11-22), or 1.1.0, which fixed validation and saved answers. The default is 1.1.0; without a version, a note says so, since an existing app may have 1.0.0. |

SpeziQuestionnaire 2.x on iOS uses a new converter that isn't covered yet.

**Newer versions:** renderers keep releasing. A version the checker doesn't list isn't an error: it uses the rules of the closest earlier version it knows, and prints a note saying so (also in `--json` output). Only versions older than the checker covers are rejected.

**Keeping the rules current:** `src/compatibility/verified-renderers.json` records the version of each renderer the rules were last checked against. A weekly workflow (`.github/workflows/watch-renderer-releases.yml`) opens an issue in Phoenix when a renderer has newer releases or commits.

## Options

| Option | |
|---|---|
| `-t, --target <ids>` | Renderers to check, comma-separated. |
| `--json` | Print the result as JSON, for scripts and coding agents. |
| `--strict` | Exit with status 1 on warnings too. |
| `--link` | Also print a link that opens the questionnaire in [Phoenix](https://stanfordbdhg.github.io/phoenix) for review. The survey is in the part of the link after `#`, which is never sent to a server. |
| `--phoenix-url <url>` | Phoenix instance for `--link`. |

Pass `-` as the file to read from standard input. A Bundle, which Phoenix exports for a survey with translations, is checked through its main questionnaire. Exit status: 0 when there are no errors, 1 when there are (or warnings with `--strict`), and 2 on bad input.

## Development

The rules live in Phoenix's [`src/compatibility`](../../src/compatibility), and Phoenix uses the same code. Each rule cites the renderer source it is based on.

```bash
npm run test:check   # bundle dist/cli.js and test it
```
