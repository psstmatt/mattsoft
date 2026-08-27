import { createFileRoute } from "@tanstack/react-router";
import { howIWork, lookingFor } from "@/content/site";
import { Reveal } from "@/components/reveal";
import { SoundAnchor, SoundLink } from "@/components/sound-link";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Matt Reynolds" },
      {
        name: "description",
        content:
          "Seattle-based product and software designer, 15 years across Boeing, Expedia, Uber, Meta, and TikTok. How I work, and what I'm looking for next.",
      },
      { property: "og:title", content: "About — Matt Reynolds" },
      {
        property: "og:description",
        content: "How I work as a player-coach designer, and the kinds of problems I want next.",
      },
      { name: "twitter:title", content: "About — Matt Reynolds" },
      {
        name: "twitter:description",
        content: "How I work as a player-coach designer, and the kinds of problems I want next.",
      },
    ],
  }),
  component: AboutPage,
});

const bio = [
  "I'm a product and software designer in Seattle. Fifteen years, five very different companies, and one consistent job: take a system that is genuinely complicated and make the product on top of it feel obvious.",
  "That started at Boeing, where a bad interface delays an airplane, and continued through Expedia's travel and conversational products, Uber's live two-sided marketplace, Meta's consent and privacy infrastructure, and most recently as a Staff Product Designer at TikTok — agents, avatars, voice, scripts, image, and video for advertisers and creators.",
  "The pattern that repeats: I define the product model, turn the edge cases into system behavior, design the interface, and stay involved through implementation and release. I like the part of the work where an ambitious idea meets what the system can actually promise, because that is where the design decision lives.",
];

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[68ch] px-6">
      <Reveal>
        <h1 className="text-[clamp(1.9rem,5.5vw,2.6rem)] leading-[1.15] tracking-[-0.02em]">
          About
        </h1>
      </Reveal>

      <div className="mt-8 space-y-5 text-[17px] leading-[1.65]">
        {bio.map((p, i) => (
          <Reveal as="p" key={i} delay={i * 0.05}>
            {p}
          </Reveal>
        ))}
      </div>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            How I work
          </h2>
        </Reveal>
        <div className="mt-6 space-y-5 text-[17px] leading-[1.65]">
          {howIWork.map((p, i) => (
            <Reveal as="p" key={i} delay={i * 0.05}>
              {p}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            What I want next
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.65]">
            I am looking for staff or principal product design work where I can own consequential
            decisions, work closely with product and engineering, learn directly from customers, and
            carry an ambitious idea from ambiguity through launch.
          </p>
        </Reveal>
        <ul className="mt-6">
          {lookingFor.map((item, i) => (
            <Reveal as="li" key={item} delay={i * 0.04} className="rule-row flex gap-4 py-3">
              <span className="font-mono text-[11px] text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[16px]">{item}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      <section className="mt-20">
        <Reveal>
          <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Elsewhere
          </h2>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-6 text-[15px] leading-relaxed text-muted-foreground">
            The fastest way to reach me is email, or you can book time directly.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-[15px]">
            <SoundAnchor href="mailto:mr@hey.com">Email me →</SoundAnchor>
            <SoundAnchor href="https://cal.com/psstmatt" target="_blank" rel="noreferrer">
              Book time →
            </SoundAnchor>
            <SoundLink to="/catalog">See the full work catalog →</SoundLink>
          </p>
        </Reveal>
      </section>
    </div>
  );
}
