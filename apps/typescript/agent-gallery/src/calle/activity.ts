import type { CalleActivity } from "./client";

/**
 * Provider activity entries may carry live transcript lines in `message` (see
 * docs/agent-gallery/calle-api-observations.md) — the senior's own speech,
 * potentially including phone numbers or other identifiers they say aloud.
 * That text must never be persisted or rendered. `kind` is reported by the
 * provider and not documented as a closed set, so an unrecognized kind gets
 * the same generic, level-based label as everything else rather than a guess
 * at what it might safely reveal.
 */
const KNOWN_KIND_LABELS: Partial<Record<string, string>> = {
  call: "Provider call status update.",
};

/** A label safe to persist and render — never the provider's own `message` text. */
export function describeActivity(entry: Pick<CalleActivity, "kind" | "level">): string {
  const known = KNOWN_KIND_LABELS[entry.kind];
  if (known) return known;
  if (entry.level === "error") return "Provider reported an error.";
  if (entry.level === "warning") return "Provider reported a warning.";
  return "Provider sent an update.";
}
