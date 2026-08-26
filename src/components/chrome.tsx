import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { useSound } from "@/lib/sound";
import { SoundAnchor, SoundLink } from "./sound-link";

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("psstmatt.theme");
    } catch {
      /* ignore */
    }
    const isDark = stored ? stored === "dark" : true;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      try {
        window.localStorage.setItem("psstmatt.theme", next ? "dark" : "light");
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  return { dark, toggle };
}

const controlClass =
  "font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-300 hover:text-foreground";

export function Header() {
  const { play } = useSound();
  const { dark, toggle: toggleTheme } = useTheme();

  return (
    <header className="mx-auto flex w-full max-w-[68ch] items-baseline justify-between px-6 pt-10 pb-14 sm:pt-14">
      <SoundLink
        to="/"
        className="font-mono text-[11px] uppercase tracking-[0.18em] no-underline text-foreground"
      >
        Matt Reynolds
      </SoundLink>
      <nav className="flex items-baseline gap-5">
        <SoundLink to="/catalog" className={`${controlClass} no-underline`}>
          Work
        </SoundLink>
        <SoundLink to="/about" className={`${controlClass} no-underline`}>
          About
        </SoundLink>
        <button
          type="button"
          onClick={() => {
            play("click");
            toggleTheme();
          }}
          onMouseEnter={() => play("hover")}
          className={controlClass}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? "Light" : "Dark"}
        </button>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[68ch] px-6 pt-24 pb-20">
      <div className="border-t border-border pt-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Get in touch
        </p>
        <ul className="mt-5 space-y-2 text-[15px]">
          {site.contact.map((c) => (
            <li key={c.label} className="flex gap-6">
              <span className="w-24 shrink-0 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {c.label}
              </span>
              <SoundAnchor href={c.href} target="_blank" rel="noreferrer">
                {c.value}
              </SoundAnchor>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
