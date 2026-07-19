import croc from '../assets/croc.svg';

/**
 * The child's own way to choose how hard the game is (roadmap G8.2). Deliberately one small
 * flat control on the existing welcome row rather than two big cards: the Play button stays
 * the only dominant action on the screen.
 *
 * The badge carries the meaning for pre-readers — visible letter tiles for easy, a thinking
 * bubble for normal — so the label is there for grown-ups and screen readers, not as the cue.
 */
export default function ModeToggle({ mode, labels, onChange }) {
  const isEasy = mode !== 'normal';

  return (
    <button
      type="button"
      className={`mode-toggle mode-toggle--${isEasy ? 'easy' : 'normal'}`}
      aria-label={isEasy ? labels.switchToNormal : labels.switchToEasy}
      onClick={() => onChange(isEasy ? 'normal' : 'easy')}
    >
      <img className="mode-toggle__croc" src={croc} alt="" />
      {/*
        The badge is a miniature of the play screen itself: three coloured letters for easy,
        three blank cards for normal. A four-year-old who has played once already knows what
        those two pictures mean, which no icon of a thinking crocodile would tell them.
      */}
      <span className="mode-toggle__tiles" aria-hidden="true">
        {['a', 'b', 'c'].map((letter, index) => (
          <span className={`mode-toggle__tile mode-toggle__tile--c${index}`} key={letter}>
            {isEasy ? letter : ''}
          </span>
        ))}
      </span>
    </button>
  );
}
