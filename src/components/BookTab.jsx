import { useEffect, useState } from 'react';
import { Eye } from 'cartoon-eyes';
import { StarIcon } from './Icons';
import { StickerPicture } from './StickerBook';
import { hashCode } from '../stickers/map';

const BLINK_START_MIN = 400;
const BLINK_START_RANGE = 1400;
const BLINK_FREQUENCY_MIN = 2800;
const BLINK_FREQUENCY_RANGE = 2200;

function BookEyes() {
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
    <span className="book-tab__eyes" aria-hidden="true">
      {[0, 1].map((eye) => (
        <Eye
          key={eye}
          className="book-tab__eye"
          size="24px"
          scleraWidth={80}
          scleraHeight={96}
          irisSize={58}
          pupilSize={58}
          lidSize={10}
          lidColor="var(--ps-coral)"
          blinking={isBlinking}
          blinkSpeed={90}
          blinkFrequency={blinkTiming.frequency}
          lensPosition={[-12, 18]}
        />
      ))}
    </span>
  );
}

export default function BookTab({ ariaLabel, bounce = false, onClick, recentSticker = null }) {
  const stickerId = recentSticker?.id ?? recentSticker?.codepoint ?? 'star';
  const rotation = (hashCode(stickerId) % 9) - 4;

  return (
    <button
      type="button"
      className={`book-tab${bounce ? ' book-tab--new' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="book-tab__spine" aria-hidden="true" />
      <BookEyes />
      <span className="book-tab__picture" aria-hidden="true">
        {recentSticker?.codepoint ? (
          <StickerPicture
            codepoint={recentSticker.codepoint}
            className="die-cut"
            style={{ '--sticker-rotation': `${rotation}deg` }}
          />
        ) : (
          <StarIcon filled />
        )}
      </span>
    </button>
  );
}
