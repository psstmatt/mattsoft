# psstmatt.com — text-first portfolio with motion and sound

A typographic, near-imageless portfolio. Text does all the work; motion and sound are a thin craft layer that reward attention without ever getting in the way.

## Feel

- Monospace-inflected editorial: a mono display face for headings/labels, a clean grotesk for reading text. Paper-and-ink palette, dark by default with a light toggle.
- Everything is left-aligned, one measured column, mobile-first. No cards, no stock imagery, no gradient hero.
- Motion: staggered line reveals on scroll, a slow cursor-following underline on links, numbers that count up once when a metric enters view, and a soft crossfade between pages. All motion respects `prefers-reduced-motion`.
- Sound: tiny synthesized UI tones (Web Audio, no audio files) — a soft tick on link hover, a lower click on navigation, a faint rising note when a section reveals. Off by default, with a small persistent `sound ◦` toggle in the header; the choice is remembered.

## Pages

1. `/` — Index
   - Name, one-line throughline ("I turn complex, high-stakes systems into simple products — and stay hands-on until they ship."), current status line.
   - A numbered text list of the five featured projects: company, project, one-line proof, year. Hovering a row reveals its key metric inline.
   - A short "how I work" paragraph set and a contact block.
2. `/work/symphony` — TikTok Symphony Creative Studio (full case)
3. `/work/consent` — Meta Consent Platform (full case)
4. `/work/deliveries` — Boeing Aircraft Deliveries (full case)
5. `/work/reserve` — Uber Reserve & dispatch (medium case)
6. `/work/petloop` — PetLoop (medium case)
7. `/catalog` — the full text catalog: Expedia Trips, Bots & Voice, Uber Hourly, Fleet Match, Boeing platforms, current experiments — grouped by company, each two lines.
8. `/about` — longer bio, how he works, what he's looking for.

Every case page follows the same text structure: Problem → My scope → The decision → What shipped → Result. Result includes concrete metrics.

## Content and metrics

Copy is written from the uploaded corpus. Per your direction, each project gets plausible, specific metrics inferred from its context (e.g. adoption, cost-per-asset, time-to-first-draft, component reuse, error/exception rates) rather than vague claims. These are presentational figures to be vetted before you publish — I'll keep them in one content file so they're easy to edit or swap for verified numbers.

## Contact

Footer and `/about` list: email, LinkedIn, TikTok, and a "book time" calendar link. I'll use placeholders (`matt@psstmatt.com`, your LinkedIn/TikTok handles, a Cal.com link) — send the real URLs and I'll drop them in.

## Technical notes

- TanStack Start file routes; content lives in typed data modules under `src/content/` so text edits never touch layout code.
- Motion via Motion for React (`motion`), used sparingly: `whileInView` line reveals, layout crossfade on route change.
- Sound via a small `useSound` hook wrapping a lazily-created `AudioContext` with oscillator-based tones — no assets, no autoplay, unlocked on first user gesture, state in `localStorage`.
- Design tokens (paper/ink palette, mono + grotesk families, tight radii) defined in `src/styles.css` under `@theme`; fonts loaded via `<link>` in `__root.tsx`.
- Per-route `head()` metadata with unique titles/descriptions for SEO; single `h1` per page.
- No backend needed.

## Out of scope for this pass

Domain connection, analytics, a contact form, and image/case-study screenshots.
