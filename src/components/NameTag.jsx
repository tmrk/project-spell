import TileEyes from './TileEyes';

// Gentler than the wordmark's lean: a name is read often and at small sizes, so the tilt is
// halved. Same alternating rhythm, same one baseline.
const TILE_PLACEMENTS = Object.freeze([
  { lift: '0', tilt: '-2deg' },
  { lift: '-0.015em', tilt: '1.5deg' },
  { lift: '-0.02em', tilt: '-1deg' },
  { lift: '-0.015em', tilt: '2deg' },
  { lift: '0', tilt: '-1.5deg' },
]);

/**
 * A child's name in the game's own letter language: wheel colours, solid offset shadows and
 * cartoon faces, exactly like the words they spell (owner direction, 2026-07-19).
 *
 * `size` is a presentation hint only — `chip` for the welcome-screen picker, `hud` for the
 * quiet marker at the top of the play screen.
 */
export default function NameTag({ name, showEyes = true, size = 'chip' }) {
  const tiles = [...String(name ?? '')];
  if (!tiles.length) return null;

  return (
    <span className={`name-tag name-tag--${size}`} aria-hidden="true">
      {tiles.map((letter, index) => {
        if (!letter.trim()) return <span className="name-tag__gap" key={index} />;
        const placement = TILE_PLACEMENTS[index % TILE_PLACEMENTS.length];
        return (
          <span
            className={`name-tag__tile name-tag__tile--c${index % 5}`}
            key={index}
            style={{ '--tile-lift': placement.lift, '--tile-tilt': placement.tilt }}
          >
            {/* Mirrors Letter's visual wrapper so the shared eye offsets land identically. */}
            <span className="name-tag__glyph">
              {showEyes && <TileEyes letter={letter} />}
              {letter}
            </span>
          </span>
        );
      })}
    </span>
  );
}
