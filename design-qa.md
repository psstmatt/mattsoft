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

The hiring-panel content, motion, and responsive-state audit is stored under
`/private/tmp/mattsoft-audit-2026-08-26/`.

Results:

- The centered `68ch` column, 24px gutters, typography, paper/ink colors, rules, spacing, header, navigation, and footer retain the source composition.
- The deliberate differences are the four-project reverse-chronological list, removed Independent work, staff-level TikTok positioning, linked iF recognition, and Sun/Moon theme control. The Lovable hosting badge remains intentionally omitted.
- The header stays on one row at `390 × 844`. Measured document width equals viewport width at both tested sizes (`390/390` and `1280/1280`), with no horizontal overflow.
- No P0, P1, P2, or residual P3 visual differences remain.

## Footer and navigation clarity regression — 2026-08-27

- Source visual truth: `/var/folders/x6/ckgkpwsj29l5svpybht0thtw0000gn/T/codex-clipboard-21676f25-5976-4d14-9c91-6c7e87ee7bfe.png` (`3040 × 1926`, annotated Safari capture).
- Rendered implementation evidence:
  - `/private/tmp/mattsoft-footer-qa-evidence/catalog-footer-desktop-dark-1280x720-render.png`
  - `/private/tmp/mattsoft-footer-qa-evidence/catalog-footer-desktop-light-1280x720-render.png`
  - `/private/tmp/mattsoft-footer-qa-evidence/catalog-footer-mobile-dark-390x844.jpg`
  - `/private/tmp/mattsoft-footer-qa-evidence/catalog-footer-mobile-light-390x844.jpg`
- Focused source/implementation comparison: `/private/tmp/mattsoft-footer-qa-evidence/source-left-implementation-right-footer-comparison.png` (source left, implementation right). The annotated source footer was cropped from `1400 × 520` source pixels and normalized 2:1 to `700 × 260`; the implementation footer used a same-size `700 × 260` crop from the `1280 × 720` browser render.
- Browser and state: Codex in-app browser, `/catalog` scrolled to the footer, dark and light themes, `devicePixelRatio: 1`. Primary captures used `1280 × 720` and `390 × 844`; overflow smokes used 320px and 768px widths.

Findings and required fidelity surfaces:

- **Fonts and typography:** passed. All four contact rows compute to `align-items: baseline`; the existing 11px JetBrains Mono labels and 15px Work Sans values are unchanged and now share the intended typographic baseline.
- **Spacing and layout rhythm:** passed. The 96px label column and 24px gap are unchanged. All labels and all values retain identical column starts at desktop, mobile, and tablet widths; measured document width equals client width at 320, 390, 768, and 1280px.
- **Colors and tokens:** passed. No color or theme token changed, and the footer remains visually coherent in dark and light themes.
- **Image quality and assets:** not applicable to the affected UI. No image or icon asset was added, replaced, or altered; the red markup belongs only to the supplied reference.
- **Copy and content:** passed. Case-study navigation now says `Home`; the catalog says `Back home →`; the 404 says `Back home`; every destination remains `/`. The visible email remains `mr@hey.com`, and its decoded subject is exactly `👋 Hey from psstmatt.com` with no body or quotation marks.
- **Interaction and accessibility:** passed. Home links returned to `/` from Symphony, Consent, Reserve, Deliveries, the catalog, and the 404. The email retains no `target` or `rel`; external footer links retain `_blank` and `noreferrer`. Keyboard focus exposes the existing 2px solid focus ring with a 4px offset. Browser console check returned zero warnings and zero errors.
- **Build gate:** passed in a clean non-iCloud mirror with Bun 1.3.14 using `npx --yes bun@1.3.14 run check`. TypeScript and the production build passed; ESLint retained only the eight previously documented Fast Refresh warnings and the build retained the inherited 527KB chunk warning.

Comparison history:

- Pre-fix P2: the smaller mono labels sat visibly above the contact values in the supplied Safari screenshot. Fix: baseline-align the existing flex rows without changing dimensions or typography. Post-fix evidence: the focused comparison above plus the four rendered viewport captures. No actionable P0, P1, or P2 finding remains.

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

- Route descriptions, Open Graph titles/descriptions, Twitter titles/descriptions, favicon, and the copied OG image were verified.
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
- External footer links retain `_blank` plus `noreferrer`; email remains a `mailto:` URL with subject `👋 Hey from psstmatt.com` and no new-window attributes.
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
- The repository has no committed browser-test harness, so the exact footer alignment, Home copy, and decoded email subject are covered by this dated browser evidence rather than an automated regression test.

final result: passed
