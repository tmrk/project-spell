import { StarIcon } from './Icons';

const asWholeCount = (value) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false">
      <path d="M12 0 15 9l9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" />
    </svg>
  );
}

export default function StarTrail({ total, filled, croc, ariaLabel }) {
  const socketCount = asWholeCount(total);
  const filledCount = Math.min(asWholeCount(filled), socketCount);

  if (socketCount > 10) {
    const percentage = socketCount ? (filledCount / socketCount) * 100 : 0;
    return (
      <div className="round-progress" aria-label={ariaLabel}>
        <div className="round-progress__track">
          <div className="round-progress__value" style={{ width: `${percentage}%` }}>
            <img src={croc} alt="" />
          </div>
        </div>
      </div>
    );
  }

  const crocPosition = socketCount ? ((filledCount + 0.5) / socketCount) * 100 : 50;
  return (
    <div className="star-trail" aria-label={ariaLabel}>
      <div className="star-trail__track" aria-hidden="true">
        {Array.from({ length: socketCount }, (_, index) => {
          const isFilled = index < filledCount;
          const isNewest = isFilled && index === filledCount - 1;
          return (
            <span
              className={`star-trail__socket${isFilled ? ' star-trail__socket--filled' : ''}${isNewest ? ' star-trail__socket--newest' : ''}`}
              key={index}
            >
              {isFilled && <StarIcon filled />}
            </span>
          );
        })}
        <img
          className="star-trail__croc"
          src={croc}
          alt=""
          style={{ left: `${crocPosition}%` }}
        />
        <Sparkle className="star-trail__sparkle star-trail__sparkle--one" />
        <Sparkle className="star-trail__sparkle star-trail__sparkle--two" />
        <Sparkle className="star-trail__sparkle star-trail__sparkle--three" />
      </div>
    </div>
  );
}
