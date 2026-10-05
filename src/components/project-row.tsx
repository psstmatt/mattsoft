import type { CaseStudy } from "@/content/site";
import { SoundAnchor, SoundLink } from "./sound-link";
import { RowEffects } from "./row-effects";
import { useRowLight } from "@/lib/use-row-light";

export function ProjectRow({ project, index }: { project: CaseStudy; index: number }) {
  const light = useRowLight();
  return (
    <SoundLink
      to="/work/$slug"
      params={{ slug: project.slug }}
      {...light}
      className="portfolio-row interactive-row project-row group no-underline"
    >
      <RowEffects />
      <span className="project-number font-mono text-[11px] text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="project-content">
        <div className="row-heading">
          <span className="row-title text-lg leading-snug">{project.title}</span>
          <span className="row-cue" aria-hidden="true">
            →
          </span>
        </div>
        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {project.company} — {project.years}
        </span>
        <p className="project-proof mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {project.proof}
        </p>
        <p className="metric-detail mt-2 font-mono text-[12px] leading-relaxed text-muted-foreground">
          {project.headlineMetric.value} — {project.headlineMetric.label}
        </p>
      </div>
    </SoundLink>
  );
}

export function CatalogRow({
  title,
  years,
  note,
  slug,
  url,
}: {
  title: string;
  years?: string;
  note: string;
  slug?: string;
  url?: string;
}) {
  const light = useRowLight();
  const contents = (
    <>
      {(slug || url) && <RowEffects />}
      <div className="row-heading">
        <span className="row-title text-[16px] leading-snug">{title}</span>
        {(slug || url) && (
          <span className="row-cue" aria-hidden="true">
            {slug ? "→" : "↗"}
          </span>
        )}
      </div>
      {years && (
        <span className="catalog-years font-mono text-[11px] tabular-nums text-muted-foreground">
          {years}
        </span>
      )}
      <p className="catalog-note text-[14px] leading-relaxed text-muted-foreground">{note}</p>
    </>
  );
  if (slug)
    return (
      <SoundLink
        to="/work/$slug"
        params={{ slug }}
        {...light}
        className="portfolio-row interactive-row catalog-row no-underline"
      >
        {contents}
      </SoundLink>
    );
  if (url)
    return (
      <SoundAnchor
        {...light}
        href={url}
        className="portfolio-row interactive-row catalog-row no-underline"
      >
        {contents}
      </SoundAnchor>
    );
  return <div className="portfolio-row catalog-row">{contents}</div>;
}
