import { useState } from 'react';
import { Eye } from 'cartoon-eyes';
import getEyeStyle from './EyeStyle';

function PositionedEye({ className, style, isActive }) {
  return (
    <span className={`eye-position ${className}`} style={style}>
      <Eye
        className="letter-eye"
        size="0.14em"
        scleraHeight={88}
        irisSize={62}
        pupilSize={54}
        lidSize={12}
        blinking={isActive ? 2600 : false}
        lensMovement={isActive ? 1700 : false}
      />
    </span>
  );
}

export default function Letter({ letter, state, onSpeak }) {
  const [isWobbling, setIsWobbling] = useState(false);
  const eyeStyle = getEyeStyle(letter);
  const stateLabel = state === 'done' ? 'completed' : state === 'active' ? 'current letter' : 'next';

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
          <PositionedEye className="eye--left" style={eyeStyle.left} isActive={state === 'active'} />
          <PositionedEye className="eye--right" style={eyeStyle.right} isActive={state === 'active'} />
        </span>
        {letter}
      </span>
    </button>
  );
}
