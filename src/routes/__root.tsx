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
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SoundProvider } from "../lib/sound";
import { Header, Footer } from "../components/chrome";

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
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

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
          "Matt Reynolds turns complex, high-stakes systems into simple products. GenAI at TikTok, consent at Meta, marketplaces at Uber, operations at Boeing.",
      },
      { name: "author", content: "Matt Reynolds" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Work+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap",
      },
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
    <html lang="en" className="dark">
      <head>
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
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
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
