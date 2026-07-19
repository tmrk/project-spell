const LETTERS = Object.freeze([...'SPELL']);

export default function Wordmark() {
  return (
    <div className="wordmark" role="img" aria-label="SPELL">
      {LETTERS.map((letter, index) => (
        <span className={`wordmark__letter letter--c${index % 5}`} key={`${letter}-${index}`} aria-hidden="true">
          {letter}
          <span className="wordmark__eyes">
            <i />
            <i />
          </span>
        </span>
      ))}
    </div>
  );
}
