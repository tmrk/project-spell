import { useEffect, useState } from 'react';
import { StarIcon } from './Icons';

const safeCount = (value) =>
  Number.isFinite(value) && value > 0 ? Math.round(value) : 0;

export default function StarJarChip({ count, fromCount = count, ariaLabel }) {
  const target = safeCount(count);
  const start = Math.min(safeCount(fromCount), target);
  const [displayCount, setDisplayCount] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true ? target : start,
  );

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (reducedMotion || start === target) return undefined;

    const difference = target - start;
    const steps = Math.min(difference, 20);
    const timers = Array.from({ length: steps }, (_, index) =>
      window.setTimeout(
        () => setDisplayCount(Math.round(start + (difference * (index + 1)) / steps)),
        (600 * (index + 1)) / steps,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [start, target]);

  if (target === 0) return null;
  return (
    <div className="star-jar-chip" aria-label={ariaLabel}>
      <StarIcon filled />
      <span>{displayCount}</span>
    </div>
  );
}
