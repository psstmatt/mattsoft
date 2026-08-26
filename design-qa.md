# Design QA

- Source: `https://motion-whisper-portfolio.lovable.app`
- Lovable source commit: `50de093c6d9a3935225a7de0672c0618d905e095`
- Local QA date: 2026-08-26
- Browsers: Codex in-app browser only
- Desktop comparison viewport: `1280 × 720`
- Mobile comparison viewport: `390 × 844`

## Visual fidelity

The source and local implementation were captured in dark and light themes at matching desktop and mobile viewports. Each source/local pair was combined side by side and inspected together.

Evidence is stored for this handoff under `/private/tmp/mattsoft-local-qa/`:

- `comparisons/desktop-dark-source-left-local-right.jpg`
- `comparisons/desktop-light-source-left-local-right.jpg`
- `comparisons/mobile-dark-source-left-local-right.jpg`
- `comparisons/mobile-light-source-left-local-right.jpg`
- `local/final-desktop-dark-1280x720.jpg`
- `local/final-mobile-dark-390x844.jpg`

Results:

- The centered `68ch` column, 24px gutters, typography, paper/ink colors, rules, spacing, header, navigation, content, and footer match the source.
- Mobile remains a single-row header with no horizontal overflow. The measured home height is 2,491px, matching the source.
- The Lovable hosting badge is the only visible source/local difference and is intentionally omitted.
- No P0, P1, P2, or residual P3 visual differences remain.

## Routes and metadata

| Route | Status | Title | Content contract |
| --- | ---: | --- | --- |
| `/` | 200 | Matt Reynolds — Product & Software Designer | Five selected projects; How I work |
| `/about` | 200 | About — Matt Reynolds | How I work; What I want next; Elsewhere |
| `/catalog` | 200 | Work catalog — Matt Reynolds | TikTok, Meta, Uber, Expedia, Boeing, Independent |
| `/work/symphony` | 200 | Symphony Creative Studio — TikTok / ByteDance — Matt Reynolds | Five case-study sections |
| `/work/consent` | 200 | Consent Platform & Design Library — Meta — Matt Reynolds | Five case-study sections |
| `/work/deliveries` | 200 | Aircraft Deliveries & Enterprise Operations — Boeing — Matt Reynolds | Five case-study sections |
| `/work/reserve` | 200 | Reserve, Dispatch & Marketplace Systems — Uber — Matt Reynolds | Five case-study sections |
| `/work/petloop` | 200 | PetLoop — Independent — Matt Reynolds | Five case-study sections |
| `/work/not-a-real-project` | 404 | Not found — Matt Reynolds | Custom message, catalog link, noindex |

- Route descriptions, Open Graph titles/descriptions, Twitter titles/descriptions, favicon, and the copied OG image were verified.
- Every review page includes a noindex meta directive. `vercel.json` adds `X-Robots-Tag: noindex, nofollow` to the deployed review responses.
- The five case-study next links loop in the source order.

## Interactions and accessibility

- Dark is the default. The light/dark toggle updates its label and ARIA name, persists through reload, and survives navigation.
- Work and About navigation is client-side, the active link receives `aria-current="page"`, and browser Back restores `/` at scroll position 0.
- Header controls, work cards, and footer links show a visible browser focus ring. Focused work cards reveal their metric.
- Desktop work-card hover was measured from 0px to 9.6px left padding, transparent to 4% foreground tint, 138.625px to 156.625px height, and hidden to 64px/opacity 1 metric reveal.
- The inherited count-up bug was fixed by stabilizing the parsed metric dependency. Symphony was observed at zero before intersection and then at its final values: `#1`, `60%`, `92%`, `$3.3M`.
- The reduced-motion branches render static reveals and immediate final metric values. The selected browser does not expose media-query emulation, so this branch was verified directly in the component code rather than by changing a system accessibility preference.
- Hover, reveal, navigation, and theme interactions exercised the Web Audio trigger path after user activation; the browser reported no warnings or errors.
- External footer links retain `_blank` plus `noreferrer`; email remains a `mailto:` URL.

## Assets and platform exclusions

- Work Sans 300/400/400 italic/500, JetBrains Mono 400/500, the 256px favicon, and the 1920×1080 OG image are local and returned HTTP 200.
- The copied asset hashes match the captured Lovable production assets.
- Browser asset inventory showed only same-origin product assets. No Google Fonts, Lovable, R2, or GPT Engineer asset dependency remains.
- The build contains no Lovable badge, CameraPlain font, `~flock.js`, `~api/analytics`, `__lovableEvents`, or `__lovableReportRuntimeError` integration.

## Build verification

- Frozen Bun install: passed (`bun install --frozen-lockfile`).
- Exported lint script: passed with 0 errors and 8 inherited Fast Refresh warnings.
- TypeScript: passed (`tsc --noEmit`).
- Exported production build: passed.
- Vercel-targeted Nitro SSR build: passed and produced `.vercel/output/functions/__server.func`.
- Browser console: 0 warnings and 0 errors across routes and interactions.

## P3 notes

- The build reports the inherited 517KB client-chunk warning.
- The exported shadcn/Radix component scaffold is broader than the current site uses; pruning it is optional later and was excluded from this fidelity checkpoint.

final result: passed
