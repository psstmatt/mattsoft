# Design QA

- Source: `https://motion-whisper-portfolio.lovable.app`
- Lovable source commit: `50de093c6d9a3935225a7de0672c0618d905e095`
- Local QA date: 2026-08-26; social identity assets: 2026-08-27
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

The hiring-panel content, motion, and responsive-state audit is stored under
`/private/tmp/mattsoft-audit-2026-08-26/`.

Results:

- The centered `68ch` column, 24px gutters, typography, paper/ink colors, rules, spacing, header, navigation, and footer retain the source composition.
- The deliberate differences are the four-project reverse-chronological list, removed Independent work, staff-level TikTok positioning, linked iF recognition, and Sun/Moon theme control. The Lovable hosting badge remains intentionally omitted.
- The header stays on one row at `390 × 844`. Measured document width equals viewport width at both tested sizes (`390/390` and `1280/1280`), with no horizontal overflow.
- No P0, P1, P2, or residual P3 visual differences remain.

## Routes and metadata

| Route                      | Status | Title                                                                | Content contract                                |
| -------------------------- | -----: | -------------------------------------------------------------------- | ----------------------------------------------- |
| `/`                        |    200 | Matt Reynolds — Product & Software Designer                          | Four selected projects; How I work              |
| `/about`                   |    200 | About — Matt Reynolds                                                | How I work; What I want next                    |
| `/catalog`                 |    200 | Work catalog — Matt Reynolds                                         | TikTok, Meta, Uber, Expedia, Boeing             |
| `/work/symphony`           |    200 | Symphony Creative Studio — TikTok / ByteDance — Matt Reynolds        | Case study plus separate recognition            |
| `/work/consent`            |    200 | Consent Platform & Design Library — Meta — Matt Reynolds             | Five case-study sections                        |
| `/work/reserve`            |    200 | Reserve, Dispatch & Marketplace Systems — Uber — Matt Reynolds       | Five case-study sections                        |
| `/work/deliveries`         |    200 | Aircraft Deliveries & Enterprise Operations — Boeing — Matt Reynolds | Five case-study sections                        |
| `/work/petloop`            |    404 | Not found — Matt Reynolds                                            | Removed project uses the custom 404 and noindex |
| `/work/not-a-real-project` |    404 | Not found — Matt Reynolds                                            | Custom message, catalog link, noindex           |

- Route descriptions, Open Graph titles/descriptions, Twitter titles/descriptions, the portrait favicon links, and the social-card metadata were verified.
- Every review page includes a noindex meta directive. `vercel.json` adds `X-Robots-Tag: noindex, nofollow` to the deployed review responses.
- The four employment case-study next links loop in reverse chronological order: Symphony → Consent → Reserve → Deliveries → Symphony.

## Interactions and accessibility

- Dark is the default. The theme toggle is a single Sun/Moon action icon with a matching title and ARIA name; it persists through reload and survives navigation.
- Work and About navigation is client-side, the active link receives `aria-current="page"`, and browser Back restores `/` at scroll position 0.
- Work, About, and theme controls provide at least `44 × 44px` targets. Header controls, work cards, and footer links use an authored high-contrast focus ring; Work and About expose visible active states.
- Work-card hover and focus use a 150ms tint without changing padding or row position. Metrics remain exposed on coarse pointers and reserve their reveal space on fine pointers without shifting adjacent content.
- Count-up values retain their final accessible name from first render while a decorative copy animates for 600ms. Symphony exposes `#1`, `60%`, `92%`, and `$3.3M`; Consent exposes `6 wks → 4 days`, `32`, `4`, and `100%`.
- Reduced-motion branches render static reveals and immediate final metric values, and CSS disables remaining transitions and animations.
- Hover, reveal, navigation, and theme interactions exercised the Web Audio trigger path after user activation; the browser reported no warnings or errors.
- External footer links retain `_blank` plus `noreferrer`; email remains a `mailto:` URL.
- The Symphony case study separates iF Design recognition from shipped deliverables and links to the official award page with keyboard focus, sound behavior, `_blank`, and `noreferrer` intact.

## Hiring-panel content review

- The homepage now leads with staff-level AI, platform, and operational-systems positioning plus Matt's current advertiser-facing GenAI mandate at TikTok.
- Case-study titles are Staff Product Designer, GenAI at TikTok; Staff Product Designer, Privacy at Meta; Senior Product Designer at Uber; and Front End Developer at Boeing. Meta's scope records ownership of the Consent Platform, Consent Simulator, and their design system.
- Case-study structure and length remain intact. Decision language now distinguishes individual design work, cross-functional partnership, and broader program outcomes without changing any result value.
- Consent consistently treats `6 wks → 4 days` as its primary outcome while retaining all four original metrics.
- Catalog entries remain reverse chronological within each company. Symphony and Consent sub-work is explicitly labeled as program contributions or capabilities rather than independent projects.
- Uber now reads final-to-first: Identity & Rewards; Rentals, Intercity, Hourly, and Reserve; Multi-driver Dispatch; then Fleet Match. Sequence labels avoid inventing unsupported project-level dates. Expedia entries are constrained to Matt's 2016–2017 tenure.
- Homepage and About use complementary descriptions of the working model, and “What I want next” is focused on two hiring-relevant problem spaces.
- The About page ends with the catalog link; the redundant Elsewhere section is removed while contact links remain in the global footer.
- Independent content, new media, new routes, and unsupported evidence were not introduced.

## Assets and platform exclusions

- Work Sans 300/400/400 italic/500 and JetBrains Mono 400/500 remain local. The active multi-size portrait favicon family, separately named cloud favicon family, 1200×630 Open Graph card, and 1200×600 X card are local and present in the production build.
- Unchanged baseline asset hashes continue to match the captured Lovable production assets.
- Browser asset inventory showed only same-origin product assets. No Google Fonts, Lovable, R2, or GPT Engineer asset dependency remains.
- The build contains no Lovable badge, CameraPlain font, `~flock.js`, `~api/analytics`, `__lovableEvents`, or `__lovableReportRuntimeError` integration.

The social identity update keeps the portrait family active through `/favicon.ico`, exact-size PNG links, and `/apple-touch-icon.png`. The cloud family ships under `clouds-*` filenames as a separate inactive option. Shared metadata points Open Graph consumers to `/og-image.jpg` and X to `/x-image.jpg`; the lossless `/og-image.png` master also ships for future use.

## Build verification

- Frozen Bun install: passed (`bun install --frozen-lockfile`) in an isolated mirror after the iCloud checkout stalled.
- Exported lint script: passed with 0 errors and 8 inherited Fast Refresh warnings.
- TypeScript: passed (`tsc --noEmit`).
- Exported production build: passed.
- Vercel-targeted Nitro SSR build: passed and produced `.vercel/output/functions/__server.func`.
- Browser console: 0 warnings and 0 errors across routes and interactions.

## Production-readiness verification

The 2026-08-26 production gate added host-aware indexing, canonical metadata, discovery files, legacy-link continuity, Vercel observability, and CI without changing the approved visual or content baseline.

- Frozen Bun 1.3.14 install passed from the committed lockfile in an isolated non-iCloud mirror.
- TypeScript passed with no errors. ESLint passed with the same 8 inherited Fast Refresh warnings documented above. The production Nitro build passed.
- SSR returned `200` for all seven canonical routes. On the exact `psstmatt.com` host, each returned one `index, follow` robots meta tag and matching response header. On a generated-host simulation, each returned one `noindex, nofollow` robots meta tag and matching response header.
- `/work/petloop`, `/work/not-a-real-project`, and `/not-a-real-route` returned real HTTP `404` responses with the custom recovery UI and `noindex, nofollow`.
- Canonical links and `og:url` values were verified on every public route. `sitemap.xml` contains exactly the same seven routes, and `robots.txt` references it.
- All 31 legacy project hashes were checked against the compatibility map. Browser checks covered one representative from each destination, query-string preservation, and safe clearing of an unknown hash.
- Web Analytics and Speed Insights use one exact-host `beforeSend` guard. Canonical-host events pass; generated-host and malformed-URL events return `null`. Browser debug output confirmed the localhost pageview was ignored.
- The compiled client contains neither the TanStack server import nor the server request helper used to choose robots metadata.
- Responsive browser checks at 320, 390, 768, and 1280px found no horizontal overflow. Header controls remained in one row and measured at least `44 × 44px`.
- Theme switching, hydration, persistence across route navigation and reload, active navigation state, case-study metadata, recognition-link safety, final accessible metric values, and custom 404 content passed browser checks.

The final Vercel Production URL, exact merged Git SHA, deployment state, and runtime-log check are reported with the release handoff so the deployed artifact can remain byte-identical to GitHub `main`.

## P3 notes

- The build reports the inherited 527KB client-chunk warning.
- The exported shadcn/Radix component scaffold is broader than the current site uses; pruning it is optional later and was excluded from this fidelity checkpoint.

final result: passed
