import { useEffect, useRef } from 'react';
import NameTag from './NameTag';

/**
 * A text field whose text *is* the game's letters. A real `<input>` sits invisibly on top so
 * the device keyboard, IME, selection and assistive tech all behave normally, while the value
 * is drawn underneath as coloured tiles with faces and a hand-drawn caret.
 *
 * The point is that a child types their name and watches it become part of the game
 * immediately — not that they fill in a form and see a copy of it somewhere else.
 */
export default function NameField({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
  showEyes = true,
  maxLength,
  autoFocus = false,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="name-field" onClick={() => inputRef.current?.focus()}>
      <span className="name-field__display" aria-hidden="true">
        {value ? (
          <NameTag name={value} showEyes={showEyes} size="field" />
        ) : (
          <span className="name-field__placeholder">{placeholder}</span>
        )}
        <span className="name-field__caret" />
      </span>
      <input
        ref={inputRef}
        className="name-field__input"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        aria-label={label}
        maxLength={maxLength}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck="false"
      />
    </div>
  );
}
