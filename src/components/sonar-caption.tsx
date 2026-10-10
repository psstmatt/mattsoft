import "./sonar-caption.css";

export function SonarCaption({ label, domain }: { label: string; domain: string }) {
  return (
    <div className="secret-computer-label sonar-caption" data-sonar-type="echo">
      <h2 className="sonar-caption-title" aria-label={label}>
        <span className="sonar-caption-word" data-word={label} aria-hidden="true">
          {[...label].map((letter, index) => (
            <span className="sonar-caption-glyph" key={index}>
              {letter}
            </span>
          ))}
        </span>
      </h2>
      <p>{domain}</p>
    </div>
  );
}
