import { CANONICAL_HOST } from "./site-metadata";

export function allowCanonicalTelemetry<T extends { url: string }>(event: T): T | null {
  try {
    return new URL(event.url).hostname === CANONICAL_HOST ? event : null;
  } catch {
    return null;
  }
}
