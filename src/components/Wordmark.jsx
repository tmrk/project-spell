export default function Wordmark({ name = 'Project Spell' }) {
  const [firstWord, ...remainingWords] = name.trim().split(/\s+/u);
  const finalWords = remainingWords.join(' ');

  return (
    <h1 className="wordmark" aria-label={name}>
      <span className="wordmark__project" aria-hidden="true">{firstWord}</span>{' '}
      <span className="wordmark__spell" aria-hidden="true">{finalWords}</span>
    </h1>
  );
}
