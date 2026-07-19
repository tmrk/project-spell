function SpeakerIcon() {
  return (
    <svg className="mode-card__speaker" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4 9.5h3.4L12 5.6a.8.8 0 0 1 1.3.6v11.6a.8.8 0 0 1-1.3.6L7.4 14.5H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z" fill="currentColor" />
      <path d="M16.4 8.6a4.8 4.8 0 0 1 0 6.8M18.9 6a8.3 8.3 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Choosing how to play *is* starting the game (owner direction, 2026-07-19). Two cards, each a
 * miniature of the screen the child is about to see: coloured letters they can read, or blank
 * cards with a speaker. A pre-reader recognises the picture of what will happen; they cannot
 * decode an icon that stands for a setting, which is why the old toggle failed.
 */
export default function ModeCards({ labels, onPlay }) {
  return (
    <div className="mode-cards">
      <button
        type="button"
        className="mode-card mode-card--easy"
        aria-label={labels.easyAria}
        onClick={() => onPlay('easy')}
      >
        <span className="mode-card__preview" aria-hidden="true">
          {['a', 'b', 'c'].map((letter, index) => (
            <span className={`mode-card__tile mode-card__tile--c${index}`} key={letter}>
              {letter}
            </span>
          ))}
        </span>
        <strong className="mode-card__title">{labels.easy}</strong>
      </button>

      <button
        type="button"
        className="mode-card mode-card--normal"
        aria-label={labels.normalAria}
        onClick={() => onPlay('normal')}
      >
        <span className="mode-card__preview" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span className="mode-card__tile mode-card__tile--blank" key={index} />
          ))}
          <SpeakerIcon />
        </span>
        <strong className="mode-card__title">{labels.normal}</strong>
      </button>
    </div>
  );
}
