import { createFileRoute } from "@tanstack/react-router";
import { cases, homeHowIWork, site } from "@/content/site";
import { Reveal } from "@/components/reveal";
import { SoundLink } from "@/components/sound-link";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Matt Reynolds — Product & Software Designer" },
      {
        name: "description",
        content:
          "Staff product designer creating trustworthy products for complex AI, platform, marketplace, and operational systems.",
      },
      { property: "og:title", content: "Matt Reynolds — Product & Software Designer" },
      {
        property: "og:description",
        content:
          "Staff-level product design across GenAI at TikTok, consent at Meta, marketplaces at Uber, travel at Expedia, and operations at Boeing.",
      },
      { name: "twitter:title", content: "Matt Reynolds — Product & Software Designer" },
      {
        name: "twitter:description",
        content:
          "Staff-level product design across GenAI at TikTok, consent at Meta, marketplaces at Uber, travel at Expedia, and operations at Boeing.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto w-full max-w-[68ch] px-6">
      <h1 className="sr-only">Matt Reynolds, product and software designer</h1>

      <Reveal delay={0.08}>
        <p className="mt-6 text-[clamp(1.5rem,4.4vw,2rem)] leading-[1.28] tracking-[-0.015em]">
          {site.throughline}
        </p>
      </Reveal>
      <Reveal delay={0.16}>
        <p className="mt-6 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
          {site.status}
        </p>
      </Reveal>

      <section className="mt-24" aria-labelledby="selected-work">
        <Reveal>
          <h2
            id="selected-work"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            Selected work
          </h2>
        </Reveal>

        <ol className="mt-8">
          {cases.map((c, i) => (
            <Reveal as="li" key={c.slug} delay={i * 0.05} sound>
              <SoundLink
                to="/work/$slug"
                params={{ slug: c.slug }}
                className="rule-row group block py-6 no-underline"
              >
                <div className="flex items-baseline gap-4">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <span className="block text-lg leading-snug">{c.title}</span>
                    <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {c.company} — {c.years}
                    </span>
                  </span>
                </div>
                <p className="mt-3 pl-[calc(1.5rem+1ch)] text-[15px] leading-relaxed text-muted-foreground">
                  {c.proof}
                </p>
                <p className="metric-detail mt-2 overflow-hidden pl-[calc(1.5rem+1ch)] font-mono text-[12px] text-muted-foreground">
                  {c.headlineMetric.value} — {c.headlineMetric.label}
                </p>
              </SoundLink>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <p className="mt-10 text-[15px]">
            <SoundLink to="/catalog">Full work catalog →</SoundLink>
          </p>
        </Reveal>
      </section>

      <section className="mt-24" aria-labelledby="how-i-work">
        <Reveal>
          <h2
            id="how-i-work"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            How I work
          </h2>
        </Reveal>
        <div className="mt-8 space-y-5 text-[17px] leading-[1.65]">
          {homeHowIWork.map((p, i) => (
            <Reveal as="p" key={i} delay={i * 0.05}>
              {p}
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <p className="mt-8 text-[15px]">
            <SoundLink to="/about">More about how I got here →</SoundLink>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
