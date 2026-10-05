/** Decorative only: the surrounding anchor retains its native link semantics. */
export function RowEffects() {
  return (
    <span className="row-effects" aria-hidden="true">
      <span className="effect-spotlight" />
      <span className="effect-dots" />
    </span>
  );
}
