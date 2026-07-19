// Paper-cut background decor (decision D-006). Purely presentational and static:
// no drift animation, never interactive, always behind the screen content.
const CLOUD_PATH =
  'M30 85 C 8 85 2 68 12 56 C 6 40 22 26 38 32 C 44 12 74 8 86 24 C 98 10 126 14 130 32 C 150 26 168 40 162 58 C 176 64 174 84 154 85 Z';
const TUFT_PATH = 'M10 40 Q14 18 22 40 Q28 12 36 40 Q44 20 50 40 Z';

function Cloud({ className }) {
  return (
    <svg className={className} viewBox="0 0 200 100" focusable="false">
      <path d={CLOUD_PATH} />
    </svg>
  );
}

export default function Scenery({ phase = 'welcome' }) {
  const variant = phase === 'playing' ? 'play' : phase;
  return (
    <div className={`scenery scenery--${variant}`} aria-hidden="true">
      <Cloud className="scenery__cloud scenery__cloud--one" />
      <Cloud className="scenery__cloud scenery__cloud--two" />
      {variant === 'welcome' && (
        <svg className="scenery__tuft" viewBox="0 0 100 40" focusable="false">
          <path d={TUFT_PATH} />
        </svg>
      )}
    </div>
  );
}
