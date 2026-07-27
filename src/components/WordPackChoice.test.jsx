import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WordPackChoice from './WordPackChoice';

const copy = {
  groupWords: 'Words',
  packAll: 'All words',
  packAnimals: 'Animals',
  packFood: 'Food',
  packVehicles: 'Vehicles',
  packNature: 'Nature',
};

describe('word pack choice', () => {
  it('renders all first as a real five-way radio choice with sticker pictures', () => {
    const { container } = render(
      <WordPackChoice copy={copy} locale="en-GB" value="all" onChange={() => {}} />,
    );
    const radios = screen.getAllByRole('radio');

    expect(screen.getByRole('radiogroup', { name: 'Words' })).toBeInTheDocument();
    expect(radios).toHaveLength(5);
    expect(radios.map((radio) => radio.value)).toEqual([
      'all', 'animals', 'food', 'vehicles', 'nature',
    ]);
    expect(radios[0]).toBeChecked();
    expect(container.querySelectorAll('.word-pack-choice__option img')).toHaveLength(5);
  });

  it('reports a newly selected pack', () => {
    const onChange = vi.fn();
    render(<WordPackChoice copy={copy} locale="en-GB" value="all" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Animals' }));

    expect(onChange).toHaveBeenCalledWith('animals');
  });
});
