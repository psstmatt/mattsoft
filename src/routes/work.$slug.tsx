import { createFileRoute, notFound } from "@tanstack/react-router";
import { cases, type CaseStudyListItem } from "@/content/site";
import { Reveal } from "@/components/reveal";
import { SoundAnchor, SoundLink } from "@/components/sound-link";
import { CountUp } from "@/components/count-up";

export const Route = createFileRoute("/work/$slug")({
  loader: ({ params }) => {
    const study = cases.find((c) => c.slug === params.slug);
    if (!study) throw notFound();
    return { study };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Not found — Matt Reynolds" }, { name: "robots", content: "noindex" }],
      };
    }
    const { study } = loaderData;
    const title = `${study.title} — ${study.company} — Matt Reynolds`;
    return {
      meta: [
        { title },
        { name: "description", content: study.proof },
        { property: "og:title", content: title },
        { property: "og:description", content: study.proof },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: study.proof },
      ],
    };
  },
  component: CasePage,
  notFoundComponent: () => (
    <div className="mx-auto w-full max-w-[68ch] px-6 py-16">
      <h1 className="text-2xl">No case study at that address.</h1>
      <p className="mt-6 text-[15px]">
        <SoundLink to="/catalog">See the full catalog →</SoundLink>
      </p>
    </div>
  ),
});

function Section({
  label,
  paragraphs,
  list,
}: {
  label: string;
  paragraphs?: string[];
  list?: CaseStudyListItem[];
}) {
  return (
    <section className="mt-20">
      <Reveal>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </h2>
      </Reveal>
      {paragraphs && (
        <div className="mt-6 space-y-5 text-[17px] leading-[1.65]">
          {paragraphs.map((p, i) => (
            <Reveal as="p" key={i} delay={i * 0.05}>
              {p}
            </Reveal>
          ))}
        </div>
      )}
      {list && (
        <ul className="mt-6">
          {list.map((item, i) => (
            <Reveal
              as="li"
              key={typeof item === "string" ? item : item.text}
              delay={i * 0.04}
              className="rule-row flex gap-4 py-4"
            >
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[16px] leading-relaxed">
                {typeof item === "string" ? (
                  item
                ) : (
                  <SoundAnchor href={item.href} target="_blank" rel="noreferrer">
                    {item.text}
                  </SoundAnchor>
                )}
              </span>
            </Reveal>
          ))}
        </ul>
      )}
    </section>
  );
}

function CasePage() {
  const { study } = Route.useLoaderData();
  const index = cases.findIndex((c) => c.slug === study.slug);
  const next = cases[(index + 1) % cases.length];

  return (
    <article className="mx-auto w-full max-w-[68ch] px-6">
      <Reveal>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {study.company} — {study.years}
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <h1 className="mt-5 text-[clamp(1.9rem,5.5vw,2.6rem)] leading-[1.15] tracking-[-0.02em]">
          {study.title}
        </h1>
      </Reveal>
      <Reveal delay={0.12}>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
          {study.proof}
        </p>
      </Reveal>
      <Reveal delay={0.18}>
        <dl className="mt-6 grid gap-2 border-t border-border pt-5 sm:grid-cols-[5rem_1fr]">
          <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Role
          </dt>
          <dd className="text-[15px] leading-relaxed text-muted-foreground">{study.role}</dd>
        </dl>
      </Reveal>

      <Section label="Problem" paragraphs={study.problem} />
      <Section label="My scope" list={study.scope} />
      <Section label="The decision" paragraphs={study.decision} />
      <Section label="What shipped" list={study.shipped} />
      {study.recognition && <Section label="Recognition" list={study.recognition} />}

      <section className="mt-20">
        <Reveal>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Result
          </h2>
        </Reveal>
        <dl className="mt-6">
          {study.result.map((r, i) => (
            <Reveal
              as="div"
              key={i}
              delay={i * 0.05}
              className={`rule-row flex gap-6 py-5 ${i === 0 ? "result-primary" : ""}`}
              sound
            >
              <dt className="w-28 shrink-0 font-mono text-[1.6rem] leading-tight tabular-nums">
                <CountUp value={r.value} />
              </dt>
              <dd className="self-center text-[15px] leading-relaxed text-muted-foreground">
                {r.label}
              </dd>
            </Reveal>
          ))}
        </dl>
        <Reveal delay={0.1}>
          <p className="mt-6 font-mono text-[11px] leading-relaxed text-muted-foreground">
            {study.resultNote}
          </p>
        </Reveal>
      </section>

      <nav className="mt-24 flex flex-wrap gap-x-8 gap-y-3 border-t border-border pt-8 text-[15px]">
        {next && (
          <SoundLink to="/work/$slug" params={{ slug: next.slug }}>
            Next: {next.title} →
          </SoundLink>
        )}
        <SoundLink to="/catalog">Full catalog</SoundLink>
        <SoundLink to="/">Index</SoundLink>
      </nav>
    </article>
  );
}
