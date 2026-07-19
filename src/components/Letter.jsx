import { useEffect, useState } from 'react';
import { Eye } from 'cartoon-eyes';
import getEyeStyle from './EyeStyle';

const BLINK_START_MIN = 300;
const BLINK_START_RANGE = 2200;
const BLINK_FREQUENCY_MIN = 2600;
const BLINK_FREQUENCY_RANGE = 2600;
const GAZE_FREQUENCY = 1700;
const CENTRED_GAZE = Object.freeze([0, 0]);
const DEFAULT_LABELS = Object.freeze({
  completed: 'completed',
  current: 'current letter',
  next: 'next',
  template: '{letter}, {state}',
  hiddenTemplate: 'hidden letter, {state}',
});

const randomGazePosition = () => Math.floor(Math.random() * 181) - 90;

function PositionedEye({ style, gaze, isBlinking, blinkFrequency }) {
  return (
    <span className="eye-position" style={style}>
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
        lensPosition={gaze}
        lensSpeed={500}
      />
    </span>
  );
}

export default function Letter({
  letter,
  state,
  onSpeak,
  colorIndex = 0,
  showEyes = true,
  hidden = false,
  hint = 'none',
  labels = DEFAULT_LABELS,
}) {
  const [isWobbling, setIsWobbling] = useState(false);
  const [blinkTiming] = useState(() => ({
    startDelay: BLINK_START_MIN + Math.floor(Math.random() * BLINK_START_RANGE),
    frequency: BLINK_FREQUENCY_MIN + Math.floor(Math.random() * BLINK_FREQUENCY_RANGE),
  }));
  const [isBlinking, setIsBlinking] = useState(false);
  const [gaze, setGaze] = useState(CENTRED_GAZE);
  const glyphHidden = hidden && state !== 'done' && hint !== 'full';
  const eyeStyles = getEyeStyle(letter, { neutral: glyphHidden });
  const stateLabel = state === 'done' ? labels.completed : state === 'active' ? labels.current : labels.next;
  const label = glyphHidden
    ? labels.hiddenTemplate.replace('{state}', stateLabel)
    : labels.template.replace('{letter}', letter).replace('{state}', stateLabel);

  useEffect(() => {
    if (!showEyes) return undefined;
    const blinkTimer = window.setTimeout(() => setIsBlinking(true), blinkTiming.startDelay);
    return () => window.clearTimeout(blinkTimer);
  }, [blinkTiming, showEyes]);

  useEffect(() => {
    if (!showEyes || state !== 'active') return undefined;

    const gazeTimer = window.setInterval(() => {
      setGaze([randomGazePosition(), randomGazePosition()]);
    }, GAZE_FREQUENCY);
    return () => window.clearInterval(gazeTimer);
  }, [showEyes, state]);

  const handleClick = () => {
    onSpeak(letter);
    setIsWobbling(true);
  };

  return (
    <button
      type="button"
      className={`letter letter--${state} letter--c${colorIndex % 5}${glyphHidden ? ' letter--hidden' : ''}${
        glyphHidden && hint === 'ghost' ? ' letter--hint-ghost' : ''
      }${hidden ? ' letter--was-hidden' : ''}${isWobbling ? ' letter--wobbling' : ''}`}
      onClick={handleClick}
      onAnimationEnd={() => setIsWobbling(false)}
      aria-label={label}
    >
      <span className="letter__visual" aria-hidden="true">
        {showEyes && (
          <span className="eyes">
            {eyeStyles.map((style, index) => (
              <PositionedEye
                key={index}
                style={style}
                gaze={state === 'active' ? gaze : CENTRED_GAZE}
                isBlinking={isBlinking}
                blinkFrequency={blinkTiming.frequency}
              />
            ))}
          </span>
        )}
        {letter}
      </span>
    </button>
  );
}
