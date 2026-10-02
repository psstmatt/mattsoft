import { describe, expect, it } from "bun:test";
import { allowCanonicalTelemetry } from "../src/lib/telemetry";

describe("Vercel telemetry continuity", () => {
  it("preserves canonical production events", () => {
    const event = { type: "pageview", url: "https://psstmatt.com/catalog" };
    expect(allowCanonicalTelemetry(event)).toBe(event);
  });
  it("suppresses preview, local, malformed and lookalike hosts", () => {
    for (const url of [
      "https://mattsoft.vercel.app/",
      "https://matt-portfolio-hybrid-prototype.psstmatt.chatgpt.site/",
      "http://localhost:5173/",
      "https://psstmatt.com.example.org/",
      "not a URL",
    ]) {
      expect(allowCanonicalTelemetry({ url })).toBeNull();
    }
  });
});
