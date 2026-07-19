/**
 * Optional on-screen letter keyboard (roadmap G8.3). Parent-enabled; the system keyboard
 * stays the default and keeps working alongside this one — pressing a key here goes through
 * exactly the same attempt path as a physical keypress, so nothing about the game rules,
 * hint ladder or statistics changes.
 *
 * `highlight` is the miss-two hint: the expected key is pointed out rather than the answer
 * being given away, which sits between "try again" and the full reveal on miss three.
 */
export default function LetterKeyboard({ keys, highlight = null, label, onPress }) {
  if (!keys.length) return null;

  return (
    <div className="letter-keyboard" role="group" aria-label={label}>
      {keys.map((key) => (
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
  );
}
