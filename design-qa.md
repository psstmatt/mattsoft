# Design QA

- Source: `https://motion-whisper-portfolio.lovable.app`
- Lovable source commit: `50de093c6d9a3935225a7de0672c0618d905e095`
- Local QA date: 2026-08-26
- Browser: Playwright Chromium
- Desktop comparison viewport: `1280 × 720`
- Mobile comparison viewport: `390 × 844`

## Visual fidelity

The original source comparison established the layout baseline. This iteration was then reviewed in dark and light themes at matching desktop and mobile viewports after the requested content and control changes.

Evidence is stored for this handoff under `/private/tmp/mattsoft-local-qa/`:

- `comparisons/desktop-dark-source-left-local-right.jpg`
- `comparisons/desktop-light-source-left-local-right.jpg`
- `comparisons/mobile-dark-source-left-local-right.jpg`
- `comparisons/mobile-light-source-left-local-right.jpg`
- `local/final-desktop-dark-1280x720.jpg`
- `local/final-mobile-dark-390x844.jpg`
- `current/desktop-dark-1280x720.png`
- `current/desktop-light-1280x720.png`
- `current/mobile-dark-390x844.png`
- `current/mobile-light-390x844.png`

Results:

- The centered `68ch` column, 24px gutters, typography, paper/ink colors, rules, spacing, header, navigation, and footer retain the source composition.
- The deliberate differences are the four-project reverse-chronological list, removed Independent work, updated TikTok title, linked iF recognition, and Sun/Moon theme control. The Lovable hosting badge remains intentionally omitted.
- The header stays on one row at `390 × 844`. Measured document width equals viewport width at both tested sizes (`390/390` and `1280/1280`), with no horizontal overflow.
- No P0, P1, P2, or residual P3 visual differences remain.

## Routes and metadata

| Route                      | Status | Title                                                                | Content contract                                |
| -------------------------- | -----: | -------------------------------------------------------------------- | ----------------------------------------------- |
| `/`                        |    200 | Matt Reynolds — Product & Software Designer                          | Four selected projects; How I work              |
| `/about`                   |    200 | About — Matt Reynolds                                                | How I work; What I want next; Elsewhere         |
| `/catalog`                 |    200 | Work catalog — Matt Reynolds                                         | TikTok, Meta, Uber, Expedia, Boeing             |
| `/work/symphony`           |    200 | Symphony Creative Studio — TikTok / ByteDance — Matt Reynolds        | Five case-study sections                        |
| `/work/consent`            |    200 | Consent Platform & Design Library — Meta — Matt Reynolds             | Five case-study sections                        |
| `/work/reserve`            |    200 | Reserve, Dispatch & Marketplace Systems — Uber — Matt Reynolds       | Five case-study sections                        |
| `/work/deliveries`         |    200 | Aircraft Deliveries & Enterprise Operations — Boeing — Matt Reynolds | Five case-study sections                        |
| `/work/petloop`            |    404 | Not found — Matt Reynolds                                            | Removed project uses the custom 404 and noindex |
| `/work/not-a-real-project` |    404 | Not found — Matt Reynolds                                            | Custom message, catalog link, noindex           |

- Route descriptions, Open Graph titles/descriptions, Twitter titles/descriptions, favicon, and the copied OG image were verified.
- Every review page includes a noindex meta directive. `vercel.json` adds `X-Robots-Tag: noindex, nofollow` to the deployed review responses.
- The four employment case-study next links loop in reverse chronological order: Symphony → Consent → Reserve → Deliveries → Symphony.

## Interactions and accessibility

- Dark is the default. The theme toggle is a single Sun/Moon action icon with a matching title and ARIA name; it persists through reload and survives navigation.
- Work and About navigation is client-side, the active link receives `aria-current="page"`, and browser Back restores `/` at scroll position 0.
- Header controls, work cards, and footer links show a visible browser focus ring. Focused work cards reveal their metric.
- Desktop work-card hover was measured from 0px to 9.6px left padding, transparent to 4% foreground tint, 138.625px to 156.625px height, and hidden to 64px/opacity 1 metric reveal.
- The inherited count-up bug was fixed by stabilizing the parsed metric dependency. Symphony was observed at zero before intersection and then at its final values: `#1`, `60%`, `92%`, `$3.3M`.
- The reduced-motion branches render static reveals and immediate final metric values. The selected browser does not expose media-query emulation, so this branch was verified directly in the component code rather than by changing a system accessibility preference.
- Hover, reveal, navigation, and theme interactions exercised the Web Audio trigger path after user activation; the browser reported no warnings or errors.
- External footer links retain `_blank` plus `noreferrer`; email remains a `mailto:` URL.
- The Symphony case study links its iF Design recognition to the official award page with keyboard focus, sound behavior, `_blank`, and `noreferrer` intact.

## Assets and platform exclusions

- Work Sans 300/400/400 italic/500, JetBrains Mono 400/500, the 256px favicon, and the 1920×1080 OG image are local and returned HTTP 200.
- The copied asset hashes match the captured Lovable production assets.
- Browser asset inventory showed only same-origin product assets. No Google Fonts, Lovable, R2, or GPT Engineer asset dependency remains.
- The build contains no Lovable badge, CameraPlain font, `~flock.js`, `~api/analytics`, `__lovableEvents`, or `__lovableReportRuntimeError` integration.

## Build verification

- Frozen Bun install: passed (`bun install --frozen-lockfile`) in an isolated mirror after the iCloud checkout stalled.
- Exported lint script: passed with 0 errors and 8 inherited Fast Refresh warnings.
- TypeScript: passed (`tsc --noEmit`).
- Exported production build: passed.
- Vercel-targeted Nitro SSR build: passed and produced `.vercel/output/functions/__server.func`.
- Browser console: 0 warnings and 0 errors across routes and interactions.

## P3 notes

- The build reports the inherited 517KB client-chunk warning.
- The exported shadcn/Radix component scaffold is broader than the current site uses; pruning it is optional later and was excluded from this fidelity checkpoint.

final result: passed
