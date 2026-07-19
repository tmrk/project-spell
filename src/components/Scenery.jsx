// Paper-cut background decor (decision D-006). The varied tracks and negative delays
// make the sky feel loosely scattered while keeping positions stable across renders.
const CLOUD_PATH =
  'M30 85 C 8 85 2 68 12 56 C 6 40 22 26 38 32 C 44 12 74 8 86 24 C 98 10 126 14 130 32 C 150 26 168 40 162 58 C 176 64 174 84 154 85 Z';
const TUFT_PATH = 'M10 40 Q14 18 22 40 Q28 12 36 40 Q44 20 50 40 Z';

const CLOUDS = Object.freeze([
  { delay: '-7s', duration: '34s', id: 'one', opacity: 0.72, size: '230px', staticX: '4vw', top: '5%' },
  { delay: '-26s', duration: '41s', id: 'two', opacity: 0.52, size: '160px', staticX: '62vw', top: '17%' },
  { delay: '-15s', duration: '47s', id: 'three', opacity: 0.38, size: '120px', staticX: '38vw', top: '31%' },
  { delay: '-38s', duration: '52s', id: 'four', opacity: 0.34, size: '145px', staticX: '76vw', top: '48%' },
  { delay: '-3s', duration: '44s', id: 'five', opacity: 0.42, size: '185px', staticX: '12vw', top: '62%' },
  { delay: '-31s', duration: '50s', id: 'six', opacity: 0.3, size: '130px', staticX: '54vw', top: '76%' },
  { delay: '-20s', duration: '39s', id: 'seven', opacity: 0.46, size: '205px', staticX: '82vw', top: '86%' },
]);

function Cloud({ cloud }) {
  return (
    <svg
      className={`scenery__cloud scenery__cloud--${cloud.id}`}
      viewBox="0 0 200 100"
      focusable="false"
      style={{
        '--cloud-delay': cloud.delay,
        '--cloud-duration': cloud.duration,
        '--cloud-opacity': cloud.opacity,
        '--cloud-size': cloud.size,
        '--cloud-static-x': cloud.staticX,
        '--cloud-top': cloud.top,
      }}
    >
      <path d={CLOUD_PATH} />
    </svg>
  );
}

export default function Scenery({ phase = 'welcome' }) {
  const variant = phase === 'playing' ? 'play' : phase;
  return (
    <div className={`scenery scenery--${variant}`} aria-hidden="true">
      {CLOUDS.map((cloud) => <Cloud cloud={cloud} key={cloud.id} />)}
      {variant === 'welcome' && (
        <svg className="scenery__tuft" viewBox="0 0 100 40" focusable="false">
          <path d={TUFT_PATH} />
        </svg>
      )}
    </div>
  );
}
