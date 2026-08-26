# Mattsoft

Matt Reynolds's text-first portfolio, exported from Lovable for independent local development and Vercel review deployments.

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
bun run lint
bun run build
```

The repository is configured as a noindex review build. Production promotion, aliases, domains, and DNS are intentionally out of scope.
