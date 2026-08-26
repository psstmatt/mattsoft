import { createFileRoute } from "@tanstack/react-router";
import { cases, howIWork, site } from "@/content/site";
import { Reveal } from "@/components/reveal";
import { SoundLink } from "@/components/sound-link";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Matt Reynolds — Product & Software Designer" },
      {
        name: "description",
        content:
          "I turn complex, high-stakes systems into simple products — and stay hands-on until they ship. GenAI at TikTok, consent at Meta, marketplaces at Uber, operations at Boeing.",
      },
      { property: "og:title", content: "Matt Reynolds — Product & Software Designer" },
      {
        property: "og:description",
        content:
          "Fifteen years turning complex systems into products people can trust. Selected work from TikTok, Meta, Uber, Expedia, and Boeing.",
      },
      { name: "twitter:title", content: "Matt Reynolds — Product & Software Designer" },
      {
        name: "twitter:description",
        content:
          "Fifteen years turning complex systems into products people can trust. Selected work from TikTok, Meta, Uber, Expedia, and Boeing.",
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
                <p className="mt-2 max-h-0 overflow-hidden pl-[calc(1.5rem+1ch)] font-mono text-[12px] text-muted-foreground opacity-0 transition-all duration-500 ease-out group-hover:max-h-16 group-hover:opacity-100 group-focus-visible:max-h-16 group-focus-visible:opacity-100">
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
          {howIWork.map((p, i) => (
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
