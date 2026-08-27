import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { CANONICAL_HOST } from "./site-metadata";

function normalizeHostname(host: string): string {
  try {
    return new URL(`http://${host}`).hostname.replace(/\.$/, "").toLowerCase();
  } catch {
    return "";
  }
}

const getCurrentHostname = createIsomorphicFn()
  .server(() => {
    try {
      return normalizeHostname(new URL(getRequest().url).host);
    } catch {
      return "";
    }
  })
  .client(() => normalizeHostname(window.location.host));

export function canonicalRobotsMeta() {
  return {
    name: "robots",
    content: getCurrentHostname() === CANONICAL_HOST ? "index, follow" : "noindex, nofollow",
  } as const;
}
