const PIECES = Object.freeze(
  [
    [-86, 84, 'var(--ps-grass)'],
    [-62, 104, 'var(--ps-gold)'],
    [-38, 90, 'var(--ps-coral)'],
    [-14, 114, '#ffffff'],
    [10, 98, 'var(--ps-grass)'],
    [34, 110, 'var(--ps-gold)'],
    [58, 92, 'var(--ps-coral)'],
    [82, 112, '#ffffff'],
    [118, 88, 'var(--ps-grass)'],
    [150, 102, 'var(--ps-gold)'],
    [210, 96, 'var(--ps-coral)'],
    [242, 108, '#ffffff'],
  ].map(([angle, distance, colour], index) =>
    Object.freeze({ angle, distance, colour, delay: (index % 3) * 24 }),
  ),
);

export default function CelebrationConfetti({ className = '', onAnimationEnd }) {
  return (
    <div
      className={`confetti${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      onAnimationEnd={onAnimationEnd}
    >
      {PIECES.map((piece, index) => (
        <span
          key={`${piece.angle}-${index}`}
          style={{
            '--confetti-angle': `${piece.angle}deg`,
            '--confetti-distance': `${piece.distance}px`,
            '--confetti-colour': piece.colour,
            '--confetti-delay': `${piece.delay}ms`,
            '--confetti-spin': `${240 + index * 37}deg`,
          }}
        />
      ))}
    </div>
  );
}

export { PIECES as CONFETTI_PIECES };
