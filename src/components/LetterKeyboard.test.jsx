import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LetterKeyboard from './LetterKeyboard';
import { buildKeyRows } from '../keyboard';

describe('LetterKeyboard rendering', () => {
  it('draws the full keyboard as staggered rows in the language layout', () => {
    const rows = buildKeyRows('full', 'kutya', 'hu-HU');
    const { container } = render(<LetterKeyboard rows={rows} label="Betűk" onPress={() => {}} />);

    const board = container.querySelector('.letter-keyboard');
    // Every key is sized from the widest staggered row (a-row: 12 keys + 0.5 offset).
    expect(board).toHaveStyle({ '--max-units': '12.5' });

    const rowEls = container.querySelectorAll('.letter-keyboard__row');
    expect(rowEls).toHaveLength(3);
    // The í row is flush left (no offset variable set); the q and a rows step in.
    expect(rowEls[0]).toHaveStyle({ '--row-offset': '0.25' });
    expect(rowEls[1]).toHaveStyle({ '--row-offset': '0.5' });
    expect(rowEls[2].style.getPropertyValue('--row-offset')).toBe('');

    expect(container.querySelectorAll('.letter-key')).toHaveLength(35);
  });

  it('sends the pressed letter through unchanged and highlights the hint key', () => {
    const onPress = vi.fn();
    render(
      <LetterKeyboard rows={buildKeyRows('full', 'cat', 'en-GB')} highlight="a" label="Keys" onPress={onPress} />,
    );

    expect(screen.getByRole('button', { name: 'a' })).toHaveClass('letter-key--hint');
    fireEvent.click(screen.getByRole('button', { name: 't' }));
    expect(onPress).toHaveBeenCalledWith('t');
  });

  it('renders nothing when there are no rows', () => {
    const { container } = render(<LetterKeyboard rows={[]} label="Keys" onPress={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
