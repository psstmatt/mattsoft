import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SoundProvider } from "../lib/sound";
import { Header, Footer } from "../components/chrome";
import { LEGACY_HASH_SCRIPT } from "../lib/legacy-hashes";
import { canonicalUrl } from "../lib/site-metadata";
import { allowCanonicalTelemetry } from "../lib/telemetry";
import { THEME_FAVICONS, THEME_STORAGE_KEY } from "../lib/theme";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`;
const FAVICON_SCRIPT = `(function(){var f=${JSON.stringify(THEME_FAVICONS)}[document.documentElement.classList.contains('dark')?'dark':'light'];for(var id in f){var l=document.getElementById(id);if(l)l.setAttribute('href',f[id]);}})();`;
const SOCIAL_IMAGE_ALT =
  "A glossy floating avatar in purple sunglasses bursting through bright white clouds, followed by a pink pixel star.";

function NotFoundComponent() {
  return (
    <div className="mx-auto w-full max-w-[68ch] px-6 py-24">
      <h1 className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">404</h1>
      <p className="mt-6 text-2xl leading-snug">That page doesn't exist.</p>
      <p className="mt-4 text-muted-foreground">
        <Link to="/" className="underline underline-offset-[5px]">
          Back to the index
        </Link>
      </p>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-[68ch] px-6 py-24">
      <h1 className="font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">Error</h1>
      <p className="mt-6 text-2xl leading-snug">This page didn't load.</p>
      <div className="mt-6 flex gap-6 text-[15px]">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="underline underline-offset-[5px]"
        >
          Try again
        </button>
        <a href="/" className="underline underline-offset-[5px]">
          Go home
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Matt Reynolds — Product & Software Designer" },
      {
        name: "description",
        content:
          "Matt Reynolds is a staff product designer creating trustworthy products for complex AI, platform, marketplace, and operational systems.",
      },
      { name: "author", content: "Matt Reynolds" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: canonicalUrl("/og-image.jpg") },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: SOCIAL_IMAGE_ALT },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: canonicalUrl("/x-image.jpg") },
      { name: "twitter:image:alt", content: SOCIAL_IMAGE_ALT },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        id: "theme-favicon-ico",
        rel: "icon",
        href: THEME_FAVICONS.dark["theme-favicon-ico"],
        type: "image/x-icon",
      },
      {
        id: "theme-favicon-16",
        rel: "icon",
        href: THEME_FAVICONS.dark["theme-favicon-16"],
        type: "image/png",
        sizes: "16x16",
      },
      {
        id: "theme-favicon-32",
        rel: "icon",
        href: THEME_FAVICONS.dark["theme-favicon-32"],
        type: "image/png",
        sizes: "32x32",
      },
      {
        id: "theme-favicon-48",
        rel: "icon",
        href: THEME_FAVICONS.dark["theme-favicon-48"],
        type: "image/png",
        sizes: "48x48",
      },
      {
        id: "theme-apple-touch-icon",
        rel: "apple-touch-icon",
        href: THEME_FAVICONS.dark["theme-apple-touch-icon"],
        sizes: "180x180",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LEGACY_HASH_SCRIPT }} />
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: FAVICON_SCRIPT }} />
      </head>
      <body>
        {children}
        <Analytics beforeSend={allowCanonicalTelemetry} />
        <SpeedInsights beforeSend={allowCanonicalTelemetry} />
        <Scripts />
      </body>
    </html>
  );
}

function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: reduced ? { duration: 0 } : { duration: 0.16, ease: "easeOut" },
        }}
        exit={
          reduced
            ? { opacity: 1, y: 0, transition: { duration: 0 } }
            : { opacity: 0, y: -4, transition: { duration: 0.09, ease: "easeIn" } }
        }
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <SoundProvider>
        <div className="min-h-screen">
          <Header />
          <PageTransition>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
          </PageTransition>
          <Footer />
        </div>
      </SoundProvider>
    </QueryClientProvider>
  );
}
