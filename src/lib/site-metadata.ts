export const CANONICAL_ORIGIN = "https://psstmatt.com";
export const CANONICAL_HOST = "psstmatt.com";
export const CANONICAL_PATHS = [
  "/",
  "/about",
  "/catalog",
  "/work/symphony",
  "/work/consent",
  "/work/reserve",
  "/work/deliveries",
] as const;

export function canonicalUrl(path: string): string {
  return new URL(path, CANONICAL_ORIGIN).toString();
}

export function canonicalLink(path: string) {
  return { rel: "canonical", href: canonicalUrl(path) } as const;
}

export function isCanonicalPath(pathname: string): boolean {
  return (CANONICAL_PATHS as readonly string[]).includes(pathname);
}
