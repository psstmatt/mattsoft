import { rainbowVariables } from "@/lib/rainbow-aurora";

/** Decorative only: the surrounding anchor retains its native link semantics. */
export function RowEffects() {
  return (
    <span className="row-effects" aria-hidden="true" style={rainbowVariables}>
      <span className="effect-rainbow">
        <span className="rainbow-prism" />
        <span className="rainbow-grain" />
      </span>
    </span>
  );
}
