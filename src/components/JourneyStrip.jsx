import { StarIcon } from './Icons';
import { SUPER_ROUND_EVERY } from '../progress';

function GiftIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 21h34v22H7zM4 15h40v9H4z" />
      <path d="M21 15h6v28h-6z" />
      <path d="M23 15C16 14 12 11 13 7c1-4 8-3 11 8ZM25 15c7-1 11-4 10-8-1-4-8-3-11 8Z" />
    </svg>
  );
}

export default function JourneyStrip({ position = 0, wasSuper = false, message = '' }) {
  const socketCount = SUPER_ROUND_EVERY - 1;
  const safePosition = Math.min(Math.max(Math.floor(position) || 0, 0), socketCount);

  return (
    <div className="journey-strip">
      <div className="journey-strip__track" aria-hidden="true">
        {Array.from({ length: socketCount }, (_, index) => {
          const filled = wasSuper || index < safePosition;
          return (
            <span
              className={`journey-strip__socket${filled ? ' journey-strip__socket--filled' : ''}`}
              key={index}
            >
              {filled && <StarIcon filled />}
            </span>
          );
        })}
        <span className={`journey-strip__gift${wasSuper ? ' journey-strip__gift--opened' : ''}`}>
          <GiftIcon />
        </span>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
