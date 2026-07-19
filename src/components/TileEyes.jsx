import { useEffect, useState } from 'react';
import { Eye } from 'cartoon-eyes';
import getEyeStyle from './EyeStyle';

const BLINK_START_MIN = 300;
const BLINK_START_RANGE = 2000;
const BLINK_FREQUENCY_MIN = 2800;
const BLINK_FREQUENCY_RANGE = 2400;

/**
 * The calm, forward-looking face worn by decorative letter tiles — the wordmark and profile
 * name tags. `Letter` keeps its own eyes because the active play letter also tracks a gaze;
 * these ones only blink.
 *
 * Callers must place this inside a wrapper that mirrors `.letter__visual`, since the shared
 * `getEyeStyle` offsets are resolved against that box.
 *
 * `neutral` takes the raised centred pair `Letter` uses for a hidden glyph, so a blank tile can
 * wear a face without the eye positions tracing the letter underneath.
 */
export default function TileEyes({ letter = '', neutral = false }) {
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
      {getEyeStyle(letter, { neutral }).map((style, index) => (
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
