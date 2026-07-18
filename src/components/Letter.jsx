import { useEffect, useState } from 'react';
import { Eye } from 'cartoon-eyes';
import getEyeStyle from './EyeStyle';

const BLINK_START_MIN = 300;
const BLINK_START_RANGE = 2200;
const BLINK_FREQUENCY_MIN = 2600;
const BLINK_FREQUENCY_RANGE = 2600;

function PositionedEye({ className, style, isActive, isBlinking, blinkFrequency }) {
  return (
    <span className={`eye-position ${className}`} style={style}>
      <Eye
        className="letter-eye"
        size="0.14em"
        scleraHeight={88}
        irisSize={62}
        pupilSize={54}
        lidSize={12}
        blinking={isBlinking}
        blinkSpeed={90}
        blinkFrequency={blinkFrequency}
        lensMovement={isActive ? 1700 : false}
      />
    </span>
  );
}

export default function Letter({ letter, state, onSpeak }) {
  const [isWobbling, setIsWobbling] = useState(false);
  const [blinkTiming] = useState(() => ({
    startDelay: BLINK_START_MIN + Math.floor(Math.random() * BLINK_START_RANGE),
    frequency: BLINK_FREQUENCY_MIN + Math.floor(Math.random() * BLINK_FREQUENCY_RANGE),
  }));
  const [isBlinking, setIsBlinking] = useState(false);
  const eyeStyle = getEyeStyle(letter);
  const stateLabel = state === 'done' ? 'completed' : state === 'active' ? 'current letter' : 'next';

  useEffect(() => {
    const blinkTimer = window.setTimeout(() => setIsBlinking(true), blinkTiming.startDelay);
    return () => window.clearTimeout(blinkTimer);
  }, [blinkTiming]);

  const handleClick = () => {
    onSpeak(letter);
    setIsWobbling(true);
  };

  return (
    <button
      type="button"
      className={`letter letter--${state}${isWobbling ? ' letter--wobbling' : ''}`}
      onClick={handleClick}
      onAnimationEnd={() => setIsWobbling(false)}
      aria-label={`${letter}, ${stateLabel}`}
    >
      <span className="letter__visual" aria-hidden="true">
        <span className="eyes">
          <PositionedEye
            className="eye--left"
            style={eyeStyle.left}
            isActive={state === 'active'}
            isBlinking={isBlinking}
            blinkFrequency={blinkTiming.frequency}
          />
          <PositionedEye
            className="eye--right"
            style={eyeStyle.right}
            isActive={state === 'active'}
            isBlinking={isBlinking}
            blinkFrequency={blinkTiming.frequency}
          />
        </span>
        {letter}
      </span>
    </button>
  );
}
