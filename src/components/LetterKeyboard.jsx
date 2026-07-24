/**
 * Optional on-screen letter keyboard (roadmap G8.3). Parent-enabled; the system keyboard
 * stays the default and keeps working alongside this one — pressing a key here goes through
 * exactly the same attempt path as a physical keypress, so nothing about the game rules,
 * hint ladder or statistics changes.
 *
 * The keys arrive already grouped into rows (`keyboard.js`). The full keyboard mirrors the real
 * physical layout of the child's language — staggered rows and all — so the shape on screen is
 * the shape they will meet under their fingers. `--max-units` is the widest staggered row in key
 * pitches; the stylesheet sizes every key from it so the whole board fits without scrolling, and
 * each row's `--row-offset` reproduces the real keyboard's overlap.
 *
 * `highlight` is the miss-two hint: the expected key is pointed out rather than the answer being
 * given away, which sits between "try again" and the full reveal on miss three.
 */
export default function LetterKeyboard({ rows, highlight = null, label, onPress }) {
  if (!rows?.length) return null;

  const maxUnits = rows.reduce(
    (widest, row) => Math.max(widest, row.keys.length + (row.offset ?? 0)),
    0,
  );

  return (
    <div
      className="letter-keyboard"
      role="group"
      aria-label={label}
      style={{ '--max-units': maxUnits }}
    >
      {rows.map((row, rowIndex) => (
        <div
          className="letter-keyboard__row"
          key={rowIndex}
          style={row.offset ? { '--row-offset': row.offset } : undefined}
        >
          {row.keys.map((key) => (
            <button
              type="button"
              key={key}
              className={`letter-key${highlight === key ? ' letter-key--hint' : ''}`}
              // Keep focus on the hidden input so a physical keyboard still works between taps.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPress(key)}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
