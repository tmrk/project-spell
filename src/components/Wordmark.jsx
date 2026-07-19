import { useEffect, useState } from 'react';
import { Eye } from 'cartoon-eyes';
import getEyeStyle from './EyeStyle';

const BLINK_START_MIN = 300;
const BLINK_START_RANGE = 2000;
const BLINK_FREQUENCY_MIN = 2800;
const BLINK_FREQUENCY_RANGE = 2400;

// Letters sit on one baseline and lean alternately, like cut-outs pinned up by hand.
// Small lifts only — a strong arc fights the baseline and reads as wonky rather than playful.
const TILE_PLACEMENTS = Object.freeze([
  { lift: '0', tilt: '-4deg' },
  { lift: '-0.02em', tilt: '2.5deg' },
  { lift: '-0.03em', tilt: '-1.5deg' },
  { lift: '-0.02em', tilt: '3deg' },
  { lift: '0', tilt: '-2.5deg' },
]);

function TileEyes({ letter }) {
  const [blinkTiming] = useState(() => ({
    startDelay: BLINK_START_MIN + Math.floor(Math.random() * BLINK_START_RANGE),
    frequency: BLINK_FREQUENCY_MIN + Math.floor(Math.random() * BLINK_FREQUENCY_RANGE),
  }));
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsBlinking(true), blinkTiming.startDelay);
    return () => window.clearTimeout(timer);
  }, [blinkTiming.startDelay]);

  return (
    <span className="eyes">
      {getEyeStyle(letter).map((style, index) => (
        <span className="eye-position" style={style} key={index}>
          <Eye
            className="letter-eye"
            size="0.14em"
            scleraHeight={88}
            irisSize={62}
            pupilSize={54}
            lidSize={12}
            blinking={isBlinking}
            blinkSpeed={90}
            blinkFrequency={blinkTiming.frequency}
            lensPosition={[0, 0]}
          />
        </span>
      ))}
    </span>
  );
}

// The title is the game's own object: chunky wheel-coloured letters with faces, exactly
// the language of the play screen (decision D-006).
export default function Wordmark({ name = 'Project Spell', showEyes = true }) {
  const [eyebrow, ...remainingWords] = name.trim().split(/\s+/u);
  const title = remainingWords.join(' ');
  const tiles = [...title];

  return (
    <h1 className="wordmark" aria-label={name}>
      <span className="wordmark__eyebrow" aria-hidden="true">{eyebrow}</span>
      <span className="wordmark__title" aria-hidden="true">
        {tiles.map((letter, index) => {
          if (!letter.trim()) return <span className="wordmark__gap" key={index} />;
          const placement = TILE_PLACEMENTS[index % TILE_PLACEMENTS.length];
          return (
            <span
              className={`wordmark__tile wordmark__tile--c${index % 5}`}
              key={index}
              style={{ '--tile-lift': placement.lift, '--tile-tilt': placement.tilt }}
            >
              {/* Mirrors Letter's visual wrapper so the shared eye offsets land identically. */}
              <span className="wordmark__glyph">
                {showEyes && <TileEyes letter={letter} />}
                {letter}
              </span>
            </span>
          );
        })}
      </span>
    </h1>
  );
}
