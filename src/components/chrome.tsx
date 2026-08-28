import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { site } from "@/content/site";
import { useSound } from "@/lib/sound";
import { applyTheme, persistTheme, readStoredTheme, syncThemeFavicons } from "@/lib/theme";
import { SoundAnchor, SoundLink } from "./sound-link";

function useTheme() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const isDark = readStoredTheme();
    setDark(isDark);
    applyTheme(isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  };
  return { dark, toggle };
}

const controlClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground transition-colors duration-150 hover:text-foreground";

export function Header() {
  const { play } = useSound();
  const { dark, toggle: toggleTheme } = useTheme();
  const hasMounted = useRef(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const themeLabel = dark ? "Switch to light mode" : "Switch to dark mode";
  const workActive = pathname === "/catalog" || pathname.startsWith("/work/");

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    syncThemeFavicons(dark);
  }, [dark, pathname]);

  return (
    <header className="mx-auto flex w-full max-w-[68ch] items-center justify-between px-6 pt-8 pb-12 sm:pt-12 sm:pb-14">
      <SoundLink
        to="/"
        className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.18em] no-underline text-foreground"
      >
        Matt Reynolds
      </SoundLink>
      <nav className="flex items-center gap-2" aria-label="Primary navigation">
        <SoundLink
          to="/catalog"
          className={`${controlClass} no-underline ${workActive ? "text-foreground underline decoration-[0.5px] underline-offset-[5px]" : ""}`}
          aria-current={workActive ? "page" : undefined}
        >
          Work
        </SoundLink>
        <SoundLink
          to="/about"
          className={`${controlClass} no-underline ${pathname === "/about" ? "text-foreground underline decoration-[0.5px] underline-offset-[5px]" : ""}`}
          aria-current={pathname === "/about" ? "page" : undefined}
        >
          About
        </SoundLink>
        <button
          type="button"
          onClick={() => {
            play("click");
            toggleTheme();
          }}
          onMouseEnter={() => play("hover")}
          className={`${controlClass} p-0 align-middle`}
          aria-label={themeLabel}
          title={themeLabel}
        >
          {dark ? (
            <Sun className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Moon className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          )}
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
              <SoundAnchor
                href={c.href}
                target={c.href.startsWith("mailto:") ? undefined : "_blank"}
                rel={c.href.startsWith("mailto:") ? undefined : "noreferrer"}
              >
                {c.value}
              </SoundAnchor>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
