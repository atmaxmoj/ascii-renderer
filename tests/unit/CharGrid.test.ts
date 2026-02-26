import { describe, it, expect } from 'vitest';
import { CharGrid } from '../../src/display/CharGrid.js';

describe('CharGrid', () => {
  describe('constructor', () => {
    it('creates a grid with the specified dimensions', () => {
      const grid = new CharGrid(10, 5);
      expect(grid.cols).toBe(10);
      expect(grid.rows).toBe(5);
    });

    it('initializes all cells with spaces', () => {
      const grid = new CharGrid(3, 3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const cell = grid.get(c, r);
          expect(cell).not.toBeNull();
          expect(cell!.char).toBe(' ');
        }
      }
    });
  });

  describe('inBounds', () => {
    const grid = new CharGrid(10, 5);

    it('returns true for valid coordinates', () => {
      expect(grid.inBounds(0, 0)).toBe(true);
      expect(grid.inBounds(9, 4)).toBe(true);
      expect(grid.inBounds(5, 2)).toBe(true);
    });

    it('returns false for out-of-bounds coordinates', () => {
      expect(grid.inBounds(-1, 0)).toBe(false);
      expect(grid.inBounds(0, -1)).toBe(false);
      expect(grid.inBounds(10, 0)).toBe(false);
      expect(grid.inBounds(0, 5)).toBe(false);
    });
  });

  describe('get/set', () => {
    it('sets and gets a cell value', () => {
      const grid = new CharGrid(10, 5);
      grid.set(3, 2, { char: 'X', fg: '#ff0000', bold: true });
      const cell = grid.get(3, 2);
      expect(cell!.char).toBe('X');
      expect(cell!.fg).toBe('#ff0000');
      expect(cell!.bold).toBe(true);
    });

    it('returns null for out-of-bounds get', () => {
      const grid = new CharGrid(10, 5);
      expect(grid.get(-1, 0)).toBeNull();
      expect(grid.get(10, 0)).toBeNull();
    });

    it('ignores out-of-bounds set', () => {
      const grid = new CharGrid(10, 5);
      // Should not throw
      grid.set(-1, 0, { char: 'X' });
      grid.set(10, 0, { char: 'X' });
    });

    it('get returns a copy, not a reference', () => {
      const grid = new CharGrid(10, 5);
      grid.set(0, 0, { char: 'A' });
      const cell = grid.get(0, 0)!;
      cell.char = 'B';
      expect(grid.get(0, 0)!.char).toBe('A');
    });
  });

  describe('setChar', () => {
    it('sets just the character', () => {
      const grid = new CharGrid(10, 5);
      grid.set(0, 0, { fg: '#ff0000' });
      grid.setChar(0, 0, 'Z');
      const cell = grid.get(0, 0)!;
      expect(cell.char).toBe('Z');
      expect(cell.fg).toBe('#ff0000');
    });

    it('optionally sets elementId', () => {
      const grid = new CharGrid(10, 5);
      grid.setChar(0, 0, 'Z', 42);
      expect(grid.get(0, 0)!.elementId).toBe(42);
    });
  });

  describe('fill', () => {
    it('fills a rectangular region', () => {
      const grid = new CharGrid(10, 5);
      grid.fill(2, 1, 3, 2, { char: '#', fg: '#00ff00' });

      expect(grid.get(2, 1)!.char).toBe('#');
      expect(grid.get(4, 2)!.char).toBe('#');
      expect(grid.get(1, 1)!.char).toBe(' '); // Outside fill
      expect(grid.get(5, 1)!.char).toBe(' '); // Outside fill
    });
  });

  describe('fillBg', () => {
    it('fills only the background color', () => {
      const grid = new CharGrid(10, 5);
      grid.setChar(3, 2, 'X');
      grid.fillBg(2, 1, 4, 3, '#333333');

      expect(grid.get(3, 2)!.char).toBe('X');
      expect(grid.get(3, 2)!.bg).toBe('#333333');
      expect(grid.get(2, 1)!.bg).toBe('#333333');
    });
  });

  describe('writeText', () => {
    it('writes a string horizontally', () => {
      const grid = new CharGrid(20, 5);
      grid.writeText(2, 1, 'Hello');

      expect(grid.get(2, 1)!.char).toBe('H');
      expect(grid.get(3, 1)!.char).toBe('e');
      expect(grid.get(4, 1)!.char).toBe('l');
      expect(grid.get(5, 1)!.char).toBe('l');
      expect(grid.get(6, 1)!.char).toBe('o');
    });

    it('clips text that goes out of bounds', () => {
      const grid = new CharGrid(5, 1);
      grid.writeText(3, 0, 'Hello');

      expect(grid.get(3, 0)!.char).toBe('H');
      expect(grid.get(4, 0)!.char).toBe('e');
    });

    it('applies fg and bg colors', () => {
      const grid = new CharGrid(20, 5);
      grid.writeText(0, 0, 'AB', '#ff0000', '#0000ff');
      expect(grid.get(0, 0)!.fg).toBe('#ff0000');
      expect(grid.get(0, 0)!.bg).toBe('#0000ff');
    });
  });

  describe('drawBox', () => {
    it('draws a solid box', () => {
      const grid = new CharGrid(10, 5);
      grid.drawBox(1, 1, 5, 3);

      expect(grid.get(1, 1)!.char).toBe('┌');
      expect(grid.get(5, 1)!.char).toBe('┐');
      expect(grid.get(1, 3)!.char).toBe('└');
      expect(grid.get(5, 3)!.char).toBe('┘');
      expect(grid.get(3, 1)!.char).toBe('─');
      expect(grid.get(1, 2)!.char).toBe('│');
    });

    it('draws a double box', () => {
      const grid = new CharGrid(10, 5);
      grid.drawBox(0, 0, 6, 4, 'double');

      expect(grid.get(0, 0)!.char).toBe('╔');
      expect(grid.get(5, 0)!.char).toBe('╗');
      expect(grid.get(0, 3)!.char).toBe('╚');
      expect(grid.get(5, 3)!.char).toBe('╝');
      expect(grid.get(3, 0)!.char).toBe('═');
      expect(grid.get(0, 2)!.char).toBe('║');
    });

    it('does nothing for boxes smaller than 2x2', () => {
      const grid = new CharGrid(10, 5);
      grid.drawBox(0, 0, 1, 1);
      // No crash, nothing drawn
      expect(grid.get(0, 0)!.char).toBe(' ');
    });
  });

  describe('toString', () => {
    it('outputs plain text representation', () => {
      const grid = new CharGrid(10, 3);
      grid.writeText(0, 0, 'Hello');
      grid.writeText(0, 1, 'World');

      const text = grid.toString();
      const lines = text.split('\n');
      expect(lines[0]).toBe('Hello');
      expect(lines[1]).toBe('World');
    });

    it('trims trailing spaces on each line', () => {
      const grid = new CharGrid(20, 1);
      grid.writeText(0, 0, 'Hi');
      expect(grid.toString()).toBe('Hi');
    });

    it('trims trailing empty lines', () => {
      const grid = new CharGrid(10, 5);
      grid.writeText(0, 0, 'Top');
      const lines = grid.toString().split('\n');
      expect(lines.length).toBe(1);
    });

    it('handles a completely empty grid', () => {
      const grid = new CharGrid(5, 5);
      expect(grid.toString()).toBe('');
    });
  });

  describe('clear', () => {
    it('resets all cells to defaults', () => {
      const grid = new CharGrid(5, 5);
      grid.fill(0, 0, 5, 5, { char: 'X', fg: '#ff0000', bold: true });
      grid.clear();

      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const cell = grid.get(c, r)!;
          expect(cell.char).toBe(' ');
          expect(cell.bold).toBe(false);
        }
      }
    });
  });

  describe('snapshot', () => {
    it('returns a deep copy', () => {
      const grid = new CharGrid(3, 3);
      grid.setChar(0, 0, 'A');
      const snap = grid.snapshot();
      snap[0][0].char = 'B';
      expect(grid.get(0, 0)!.char).toBe('A');
    });
  });
});
