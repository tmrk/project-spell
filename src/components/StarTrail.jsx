import { StarIcon } from './Icons';

const asWholeCount = (value) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

const asProgress = (value, fallback) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, 0), 1);
};

function Sparkle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" focusable="false">
      <path d="M12 0 15 9l9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" />
    </svg>
  );
}

export default function StarTrail({ total, filled, progress, step = 0, croc, ariaLabel }) {
  const socketCount = asWholeCount(total);
  const filledCount = Math.min(asWholeCount(filled), socketCount);
  const progressValue = asProgress(
    progress,
    socketCount ? filledCount / socketCount : 0,
  );
  const progressPercentage = progressValue * 100;

  if (socketCount > 10) {
    return (
      <div
        className="round-progress"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(progressPercentage)}
      >
        <div className="round-progress__track">
          <div className="round-progress__value" style={{ width: `${progressPercentage}%` }}>
            <img src={croc} alt="" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="star-trail"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progressPercentage)}
    >
      <div className="star-trail__track" aria-hidden="true">
        <div className="star-trail__route">
          <span className="star-trail__line">
            <span
              className="star-trail__line-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </span>
          {Array.from({ length: socketCount }, (_, index) => {
            const isFilled = index < filledCount;
            const isNewest = isFilled && index === filledCount - 1;
            const isNext = !isFilled && index === filledCount;
            return (
              <span
                className={`star-trail__socket${isFilled ? ' star-trail__socket--filled' : ''}${isNewest ? ' star-trail__socket--newest' : ''}${isNext ? ' star-trail__socket--next' : ''}`}
                key={index}
                style={{ left: `${((index + 1) / socketCount) * 100}%` }}
              >
                <StarIcon filled={isFilled} />
              </span>
            );
          })}
          <span
            className="star-trail__croc"
            style={{ left: `${progressPercentage}%` }}
          >
            <img
              className={`star-trail__croc-image${step > 0 ? ' star-trail__croc-image--stepping' : ''}`}
              key={step}
              src={croc}
              alt=""
            />
          </span>
        </div>
        <Sparkle className="star-trail__sparkle star-trail__sparkle--one" />
        <Sparkle className="star-trail__sparkle star-trail__sparkle--two" />
        <Sparkle className="star-trail__sparkle star-trail__sparkle--three" />
      </div>
    </div>
  );
}
