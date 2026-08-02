import CelebrationConfetti from './CelebrationConfetti';
import { MEDAL_LABEL_KEYS } from '../medals';

const STAR_PATH = 'M48 25l6.5 13.2 14.6 2.1-10.6 10.3 2.5 14.5L48 58.2 35 65l2.5-14.5-10.6-10.3 14.6-2.1z';

function MedalPictogram({ id }) {
  if (id === 'first-round') {
    return (
      <g>
        <path
          className="medal__pictogram medal__pictogram--croc"
          d="M22 52c0-9 8-16 19-16h5c3-7 10-11 18-8l-4 8h7l10 8-9 7 8 6-12 8H41c-11 0-19-5-19-13z"
        />
        <circle className="medal__cutout" cx="61" cy="40" r="2.8" />
        <path className="medal__cutout" d="M64 52l5 3-6 3-5-3z" />
      </g>
    );
  }

  if (id.startsWith('words-')) {
    const count = id.slice('words-'.length);
    return (
      <text
        className={`medal__pictogram medal__number${count.length === 3 ? ' medal__number--wide' : ''}`}
        x="48"
        y="49"
        fontSize={count.length === 3 ? 22 : 29}
        dominantBaseline="middle"
        textAnchor="middle"
      >
        {count}
      </text>
    );
  }

  if (id === 'perfect-round') {
    return (
      <g className="medal__pictogram">
        <path d={STAR_PATH} transform="translate(34 39) scale(.48) translate(-48 -48)" />
        <path d={STAR_PATH} transform="translate(62 39) scale(.48) translate(-48 -48)" />
        <path d={STAR_PATH} transform="translate(48 60) scale(.48) translate(-48 -48)" />
      </g>
    );
  }

  return <path className="medal__pictogram" d={STAR_PATH} />;
}

function MedalArtwork({ id }) {
  return (
    <svg className="medal__art" viewBox="0 0 96 112" aria-hidden="true">
      <g className="medal__lift">
        <path d="M18 61h29l-8 45-12-11-15 6z" />
        <path d="M49 61h29l6 40-15-6-12 11z" />
        <circle cx="48" cy="48" r="37" />
      </g>
      <g className="medal__ribbon">
        <path d="M18 61h29l-8 45-12-11-15 6z" />
        <path d="M49 61h29l6 40-15-6-12 11z" />
      </g>
      <circle className="medal__disc" cx="48" cy="48" r="37" />
      <circle className="medal__rim" cx="48" cy="48" r="29" />
      <MedalPictogram id={id} />
    </svg>
  );
}

export default function Medal({
  celebrating = false,
  earned = false,
  id,
  label,
  onCelebrationEnd,
  showConfetti = false,
}) {
  if (!MEDAL_LABEL_KEYS[id]) return null;

  const accessibility = earned
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': 'true' };

  return (
    <div
      className={`medal medal--${id} ${earned ? 'medal--earned' : 'medal--silhouette'}${celebrating ? ' medal--party' : ''}`}
      data-medal-id={id}
      {...accessibility}
    >
      <MedalArtwork id={id} />
      {celebrating && showConfetti && (
        <CelebrationConfetti className="medal__confetti" onAnimationEnd={onCelebrationEnd} />
      )}
    </div>
  );
}
