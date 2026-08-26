import { createFileRoute } from "@tanstack/react-router";
import { cases, catalog } from "@/content/site";
import { Reveal } from "@/components/reveal";
import { SoundLink } from "@/components/sound-link";

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Work catalog — Matt Reynolds" },
      {
        name: "description",
        content:
          "Everything worth listing: TikTok Symphony, Meta consent infrastructure, Uber Reserve and dispatch, Expedia Trips and Bots & Voice, Boeing operations, and independent products.",
      },
      { property: "og:title", content: "Work catalog — Matt Reynolds" },
      {
        property: "og:description",
        content: "Fifteen years of shipped work across TikTok, Meta, Uber, Expedia, Boeing, and independent products.",
      },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const caseBySlugTitle = new Map(cases.map((c) => [c.title, c.slug]));

  return (
    <div className="mx-auto w-full max-w-[68ch] px-6">
      <Reveal>
        <h1 className="text-[clamp(1.9rem,5.5vw,2.6rem)] leading-[1.15] tracking-[-0.02em]">
          Work catalog
        </h1>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="mt-5 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
          Everything worth listing, grouped by where it happened. The five with a link go deeper.
        </p>
      </Reveal>

      {catalog.map((group, gi) => (
        <section key={group.company} className="mt-16">
          <Reveal delay={gi * 0.03}>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {group.company}
            </h2>
          </Reveal>
          <ul className="mt-5">
            {group.items.map((item, i) => {
              const slug = caseBySlugTitle.get(item.title);
              return (
                <Reveal as="li" key={item.title} delay={i * 0.03} className="rule-row py-4">
                  <div className="flex items-baseline justify-between gap-6">
                    <span className="text-[16px] leading-snug">
                      {slug ? (
                        <SoundLink to="/work/$slug" params={{ slug }}>
                          {item.title}
                        </SoundLink>
                      ) : (
                        item.title
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {item.years}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{item.note}</p>
                </Reveal>
              );
            })}
          </ul>
        </section>
      ))}

      <Reveal delay={0.05}>
        <p className="mt-16 text-[15px]">
          <SoundLink to="/">Back to the index →</SoundLink>
        </p>
      </Reveal>
    </div>
  );
}
