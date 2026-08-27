# Mattsoft

Matt Reynolds's text-first portfolio, exported from Lovable for independent development and deployment on Vercel.

## Source provenance

- Original Lovable project: `b791c73d-1837-469e-b9f9-67d654d497b7`
- Private source backup: `psstmatt/motion-whisper-portfolio`
- Imported source commit: `50de093c6d9a3935225a7de0672c0618d905e095`
- Import method: the tracked tree at that commit was copied without its Git history.
- Visual baseline: [motion-whisper-portfolio.lovable.app](https://motion-whisper-portfolio.lovable.app)

The first commit in this repository is the untouched source snapshot. Later commits contain only portability and review-deployment changes.

## Development

The project uses Bun and its committed lockfile.

```bash
bun install --frozen-lockfile
bun run dev
```

Available checks:

```bash
bun run typecheck
bun run lint
bun run build
bun run check
```

## Production safety

- Only the seven canonical HTML routes on `https://psstmatt.com` are indexable.
- Preview and generated `vercel.app` hosts, unknown routes, and server errors remain `noindex, nofollow`.
- Canonical links, Open Graph URLs, `robots.txt`, and `sitemap.xml` all resolve to the apex domain.
- Vercel Web Analytics and Speed Insights are present, but their `beforeSend` guards allow telemetry only when the page URL is on the exact `psstmatt.com` host.
- Legacy hash URLs from the previous portfolio resolve to the closest surviving case study or catalog entry.

The Vercel Production artifact can be staged without assigning a domain. Moving `psstmatt.com`, changing aliases, and changing DNS remain a separate, explicit cutover step.
