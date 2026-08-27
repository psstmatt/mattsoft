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
import type { ReactNode } from "react";

import appCss from "../styles.css?url";
import { SoundProvider } from "../lib/sound";
import { Header, Footer } from "../components/chrome";

const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('psstmatt.theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`;

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
      { property: "og:image", content: "/og-image.png" },
      { property: "og:image:width", content: "1920" },
      { property: "og:image:height", content: "1080" },
      { property: "og:image:alt", content: "Matt Reynolds — Product & Software Designer" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/og-image.png" },
      { name: "twitter:image:alt", content: "Matt Reynolds — Product & Software Designer" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
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
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (reduced) return <>{children}</>;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } }}
        exit={{ opacity: 0, y: -4, transition: { duration: 0.09, ease: "easeIn" } }}
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
