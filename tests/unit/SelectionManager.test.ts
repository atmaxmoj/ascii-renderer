import { describe, it, expect } from 'vitest';
import { SelectionManager } from '../../src/events/SelectionManager.js';
import { CharGrid } from '../../src/display/CharGrid.js';

describe('SelectionManager', () => {
  describe('initial state', () => {
    it('starts with no selection', () => {
      const sm = new SelectionManager();
      expect(sm.hasSelection()).toBe(false);
      expect(sm.isSelecting()).toBe(false);
      expect(sm.getBounds()).toBeNull();
      expect(sm.granularity).toBe('char');
    });

    it('isSelected returns false when no selection', () => {
      const sm = new SelectionManager();
      expect(sm.isSelected(0, 0)).toBe(false);
      expect(sm.isSelected(5, 5)).toBe(false);
    });

    it('getSelectedText returns empty string when no selection', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(10, 5);
      expect(sm.getSelectedText(grid)).toBe('');
    });
  });

  describe('linear selection (char granularity)', () => {
    it('single cell selection via start+end', () => {
      const sm = new SelectionManager();
      sm.startSelection(3, 2);
      sm.endSelection();

      expect(sm.hasSelection()).toBe(true);
      expect(sm.isSelecting()).toBe(false);
      expect(sm.isSelected(3, 2)).toBe(true);
      expect(sm.isSelected(4, 2)).toBe(false);
    });

    it('selects a range on the same row (left to right)', () => {
      const sm = new SelectionManager();
      sm.startSelection(2, 1);
      sm.updateSelection(6, 1);
      sm.endSelection();

      expect(sm.isSelected(1, 1)).toBe(false);
      expect(sm.isSelected(2, 1)).toBe(true);
      expect(sm.isSelected(4, 1)).toBe(true);
      expect(sm.isSelected(6, 1)).toBe(true);
      expect(sm.isSelected(7, 1)).toBe(false);
    });

    it('selects a range on the same row (right to left)', () => {
      const sm = new SelectionManager();
      sm.startSelection(6, 1);
      sm.updateSelection(2, 1);
      sm.endSelection();

      expect(sm.isSelected(2, 1)).toBe(true);
      expect(sm.isSelected(4, 1)).toBe(true);
      expect(sm.isSelected(6, 1)).toBe(true);
      expect(sm.isSelected(1, 1)).toBe(false);
      expect(sm.isSelected(7, 1)).toBe(false);
    });

    it('selects across multiple rows (top-left to bottom-right)', () => {
      const sm = new SelectionManager();
      sm.startSelection(5, 1);
      sm.updateSelection(3, 3);
      sm.endSelection();

      // Row 1: col 5 onwards
      expect(sm.isSelected(4, 1)).toBe(false);
      expect(sm.isSelected(5, 1)).toBe(true);
      expect(sm.isSelected(9, 1)).toBe(true);

      // Row 2: fully selected
      expect(sm.isSelected(0, 2)).toBe(true);
      expect(sm.isSelected(9, 2)).toBe(true);

      // Row 3: up to col 3
      expect(sm.isSelected(0, 3)).toBe(true);
      expect(sm.isSelected(3, 3)).toBe(true);
      expect(sm.isSelected(4, 3)).toBe(false);

      // Outside rows
      expect(sm.isSelected(5, 0)).toBe(false);
      expect(sm.isSelected(3, 4)).toBe(false);
    });

    it('selects across multiple rows (bottom-right to top-left)', () => {
      const sm = new SelectionManager();
      sm.startSelection(3, 3);
      sm.updateSelection(5, 1);
      sm.endSelection();

      expect(sm.isSelected(5, 1)).toBe(true);
      expect(sm.isSelected(0, 2)).toBe(true);
      expect(sm.isSelected(3, 3)).toBe(true);
      expect(sm.isSelected(4, 3)).toBe(false);
    });

    it('getBounds returns normalized coordinates', () => {
      const sm = new SelectionManager();
      sm.startSelection(8, 4);
      sm.updateSelection(2, 1);
      sm.endSelection();

      expect(sm.getBounds()).toEqual({
        startCol: 2, startRow: 1,
        endCol: 8, endRow: 4,
      });
    });
  });

  describe('block selection', () => {
    it('selects a rectangular region', () => {
      const sm = new SelectionManager();
      sm.startSelection(2, 1, 'block');
      sm.updateSelection(5, 4);
      sm.endSelection();

      expect(sm.mode).toBe('block');
      expect(sm.isSelected(2, 1)).toBe(true);
      expect(sm.isSelected(5, 4)).toBe(true);
      expect(sm.isSelected(3, 2)).toBe(true);
      expect(sm.isSelected(1, 1)).toBe(false);
      expect(sm.isSelected(6, 1)).toBe(false);
      expect(sm.isSelected(3, 0)).toBe(false);
    });

    it('handles reverse-direction rectangle', () => {
      const sm = new SelectionManager();
      sm.startSelection(5, 4, 'block');
      sm.updateSelection(2, 1);
      sm.endSelection();

      expect(sm.isSelected(2, 1)).toBe(true);
      expect(sm.isSelected(5, 4)).toBe(true);
      expect(sm.isSelected(3, 3)).toBe(true);
      expect(sm.isSelected(1, 2)).toBe(false);
    });
  });

  describe('word selection (double-click)', () => {
    function makeGrid(): CharGrid {
      const grid = new CharGrid(20, 3);
      // Row 0: "Hello World  Foo"
      grid.writeText(0, 0, 'Hello World  Foo    ');
      // Row 1: "  Bar Baz  "
      grid.writeText(0, 1, '  Bar Baz           ');
      // Row 2: "End"
      grid.writeText(0, 2, 'End                 ');
      return grid;
    }

    it('selects the word under the cursor', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(7, 0, grid); // cursor on 'o' of "World"
      sm.endSelection();

      expect(sm.granularity).toBe('word');
      expect(sm.isSelected(6, 0)).toBe(true);  // 'W'
      expect(sm.isSelected(10, 0)).toBe(true); // 'd'
      expect(sm.isSelected(5, 0)).toBe(false); // space before World
      expect(sm.isSelected(11, 0)).toBe(false); // space after World
    });

    it('selects the first word', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(2, 0, grid); // cursor on 'l' of "Hello"
      sm.endSelection();

      expect(sm.isSelected(0, 0)).toBe(true);
      expect(sm.isSelected(4, 0)).toBe(true);
      expect(sm.isSelected(5, 0)).toBe(false);
    });

    it('selects single cell on whitespace', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(5, 0, grid); // space between Hello and World
      sm.endSelection();

      expect(sm.isSelected(5, 0)).toBe(true);
      expect(sm.isSelected(4, 0)).toBe(false);
      expect(sm.isSelected(6, 0)).toBe(false);
    });

    it('word drag forward extends to word boundaries', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(1, 0, grid); // double-click on "Hello"
      // Drag to "World"
      sm.updateSelection(8, 0, grid);
      sm.endSelection();

      // Should select from start of "Hello" to end of "World"
      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(0);  // start of Hello
      expect(bounds.endCol).toBe(10);   // end of World
      expect(bounds.startRow).toBe(0);
      expect(bounds.endRow).toBe(0);
    });

    it('word drag backward extends to word boundaries', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(8, 0, grid); // double-click on "World"
      // Drag backward to "Hello"
      sm.updateSelection(2, 0, grid);
      sm.endSelection();

      // Should select from start of "Hello" to end of "World"
      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(0);
      expect(bounds.endCol).toBe(10);
    });

    it('word drag across rows', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectWord(1, 0, grid); // double-click on "Hello"
      // Drag to row 1, "Baz" (starts at col 6)
      sm.updateSelection(7, 1, grid);
      sm.endSelection();

      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(0);  // start of Hello
      expect(bounds.startRow).toBe(0);
      expect(bounds.endCol).toBe(8);    // end of Baz (cols 6-8)
      expect(bounds.endRow).toBe(1);
    });
  });

  describe('line selection (triple-click)', () => {
    it('selects the entire line', () => {
      const sm = new SelectionManager();
      sm.selectLine(2, 60);
      sm.endSelection();

      expect(sm.granularity).toBe('line');
      expect(sm.isSelected(0, 2)).toBe(true);
      expect(sm.isSelected(59, 2)).toBe(true);
      expect(sm.isSelected(0, 1)).toBe(false);
      expect(sm.isSelected(0, 3)).toBe(false);
    });

    it('getBounds covers the full line', () => {
      const sm = new SelectionManager();
      sm.selectLine(3, 80);
      sm.endSelection();

      expect(sm.getBounds()).toEqual({
        startCol: 0, startRow: 3,
        endCol: 79, endRow: 3,
      });
    });

    it('line drag forward extends to full lines', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(20, 5);
      sm.selectLine(1, 20); // triple-click on row 1
      // Drag to row 3
      sm.updateSelection(5, 3, grid);
      sm.endSelection();

      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(0);
      expect(bounds.startRow).toBe(1);
      expect(bounds.endCol).toBe(19);
      expect(bounds.endRow).toBe(3);
    });

    it('line drag backward extends to full lines', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(20, 5);
      sm.selectLine(3, 20); // triple-click on row 3
      // Drag backward to row 1
      sm.updateSelection(5, 1, grid);
      sm.endSelection();

      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(0);
      expect(bounds.startRow).toBe(1);
      expect(bounds.endCol).toBe(19);
      expect(bounds.endRow).toBe(3);
    });
  });

  describe('extendTo (Shift+click)', () => {
    it('extends an existing selection forward', () => {
      const sm = new SelectionManager();
      sm.startSelection(3, 1);
      sm.updateSelection(5, 1);
      sm.endSelection();

      sm.extendTo(10, 2);

      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(3);
      expect(bounds.startRow).toBe(1);
      expect(bounds.endCol).toBe(10);
      expect(bounds.endRow).toBe(2);
    });

    it('extends an existing selection backward', () => {
      const sm = new SelectionManager();
      sm.startSelection(5, 3);
      sm.updateSelection(8, 3);
      sm.endSelection();

      sm.extendTo(1, 1);

      const bounds = sm.getBounds()!;
      expect(bounds.startCol).toBe(1);
      expect(bounds.startRow).toBe(1);
      expect(bounds.endCol).toBe(5);
      expect(bounds.endRow).toBe(3);
    });

    it('starts a new selection if none exists', () => {
      const sm = new SelectionManager();
      sm.extendTo(5, 3);

      expect(sm.hasSelection()).toBe(true);
      expect(sm.isSelected(5, 3)).toBe(true);
    });

    it('resets granularity to char', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(20, 3);
      grid.writeText(0, 0, 'Hello World         ');
      sm.selectWord(1, 0, grid);
      sm.endSelection();

      expect(sm.granularity).toBe('word');

      sm.extendTo(15, 0);
      expect(sm.granularity).toBe('char');
    });
  });

  describe('selectAll', () => {
    it('selects entire grid', () => {
      const sm = new SelectionManager();
      sm.selectAll(10, 5);

      expect(sm.hasSelection()).toBe(true);
      expect(sm.isSelecting()).toBe(false);
      expect(sm.isSelected(0, 0)).toBe(true);
      expect(sm.isSelected(9, 4)).toBe(true);
      expect(sm.isSelected(5, 2)).toBe(true);
    });

    it('getBounds covers entire grid', () => {
      const sm = new SelectionManager();
      sm.selectAll(20, 10);

      expect(sm.getBounds()).toEqual({
        startCol: 0, startRow: 0,
        endCol: 19, endRow: 9,
      });
    });
  });

  describe('clearSelection', () => {
    it('removes the selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(2, 1);
      sm.updateSelection(5, 3);
      sm.endSelection();

      sm.clearSelection();
      expect(sm.hasSelection()).toBe(false);
      expect(sm.isSelecting()).toBe(false);
      expect(sm.isSelected(3, 2)).toBe(false);
      expect(sm.getBounds()).toBeNull();
      expect(sm.granularity).toBe('char');
    });

    it('clears an active (in-progress) selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(2, 1);
      sm.updateSelection(5, 3);

      sm.clearSelection();
      expect(sm.isSelecting()).toBe(false);
      expect(sm.hasSelection()).toBe(false);
    });
  });

  describe('isSelecting', () => {
    it('is true during active drag', () => {
      const sm = new SelectionManager();
      sm.startSelection(1, 1);
      expect(sm.isSelecting()).toBe(true);
    });

    it('is false after endSelection', () => {
      const sm = new SelectionManager();
      sm.startSelection(1, 1);
      sm.endSelection();
      expect(sm.isSelecting()).toBe(false);
    });

    it('is false after selectAll', () => {
      const sm = new SelectionManager();
      sm.selectAll(10, 10);
      expect(sm.isSelecting()).toBe(false);
    });

    it('is true during word selection drag', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(20, 3);
      grid.writeText(0, 0, 'Hello World         ');
      sm.selectWord(1, 0, grid);
      expect(sm.isSelecting()).toBe(true);
    });

    it('is true during line selection drag', () => {
      const sm = new SelectionManager();
      sm.selectLine(0, 20);
      expect(sm.isSelecting()).toBe(true);
    });
  });

  describe('updateSelection without start', () => {
    it('does nothing when not actively selecting', () => {
      const sm = new SelectionManager();
      sm.updateSelection(5, 5);
      expect(sm.hasSelection()).toBe(false);
    });
  });

  describe('findWordBounds', () => {
    function makeGrid(): CharGrid {
      const grid = new CharGrid(20, 1);
      grid.writeText(0, 0, '  Hello World  Foo  ');
      return grid;
    }

    it('finds word at start of word', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      expect(sm.findWordBounds(2, 0, grid)).toEqual([2, 6]);
    });

    it('finds word at end of word', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      expect(sm.findWordBounds(6, 0, grid)).toEqual([2, 6]);
    });

    it('finds word at middle of word', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      expect(sm.findWordBounds(4, 0, grid)).toEqual([2, 6]);
    });

    it('returns single col for whitespace', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      expect(sm.findWordBounds(0, 0, grid)).toEqual([0, 0]);
      expect(sm.findWordBounds(1, 0, grid)).toEqual([1, 1]);
    });

    it('finds last word correctly', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      expect(sm.findWordBounds(15, 0, grid)).toEqual([15, 17]);
    });

    it('works on single-char word', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(5, 1);
      grid.writeText(0, 0, ' X Y ');
      expect(sm.findWordBounds(1, 0, grid)).toEqual([1, 1]);
      expect(sm.findWordBounds(3, 0, grid)).toEqual([3, 3]);
    });
  });

  describe('getSelectedText — linear', () => {
    function makeGrid(): CharGrid {
      const grid = new CharGrid(10, 4);
      grid.writeText(0, 0, 'Hello     ');
      grid.writeText(0, 1, 'World     ');
      grid.writeText(0, 2, 'Foo Bar   ');
      grid.writeText(0, 3, 'Baz       ');
      return grid;
    }

    it('extracts single row partial selection', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.startSelection(0, 0);
      sm.updateSelection(4, 0);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('Hello');
    });

    it('extracts multi-row selection', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.startSelection(3, 0);
      sm.updateSelection(4, 1);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('lo\nWorld');
    });

    it('extracts full grid via selectAll', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.selectAll(10, 4);

      expect(sm.getSelectedText(grid)).toBe('Hello\nWorld\nFoo Bar\nBaz');
    });

    it('handles reversed selection direction', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.startSelection(4, 1);
      sm.updateSelection(3, 0);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('lo\nWorld');
    });
  });

  describe('getSelectedText — block', () => {
    function makeGrid(): CharGrid {
      const grid = new CharGrid(10, 4);
      grid.writeText(0, 0, 'ABCDEFGHIJ');
      grid.writeText(0, 1, '0123456789');
      grid.writeText(0, 2, 'abcdefghij');
      grid.writeText(0, 3, 'KLMNOPQRST');
      return grid;
    }

    it('extracts a rectangular block', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.startSelection(2, 0, 'block');
      sm.updateSelection(5, 2);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('CDEF\n2345\ncdef');
    });

    it('single column block', () => {
      const sm = new SelectionManager();
      const grid = makeGrid();
      sm.startSelection(3, 0, 'block');
      sm.updateSelection(3, 3);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('D\n3\nd\nN');
    });
  });

  describe('getSelectedText — word selection', () => {
    it('extracts the selected word', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(20, 1);
      grid.writeText(0, 0, 'Hello World Foo     ');
      sm.selectWord(8, 0, grid); // "World"
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('World');
    });
  });

  describe('getSelectedText — edge cases', () => {
    it('clamps to grid bounds', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(5, 3);
      grid.writeText(0, 0, 'Hello');
      grid.writeText(0, 1, 'World');
      grid.writeText(0, 2, 'Bye  ');

      sm.startSelection(0, 0, 'block');
      sm.updateSelection(10, 5);
      sm.endSelection();

      expect(sm.getSelectedText(grid)).toBe('Hello\nWorld\nBye');
    });

    it('empty grid returns empty/whitespace', () => {
      const sm = new SelectionManager();
      const grid = new CharGrid(5, 3);
      sm.selectAll(5, 3);

      expect(sm.getSelectedText(grid)).toBe('\n\n');
    });
  });

  describe('selection replacement', () => {
    it('new startSelection replaces previous selection', () => {
      const sm = new SelectionManager();
      sm.startSelection(0, 0);
      sm.updateSelection(9, 9);
      sm.endSelection();

      sm.startSelection(1, 1);
      sm.updateSelection(2, 2);
      sm.endSelection();

      expect(sm.isSelected(5, 5)).toBe(false);
      expect(sm.isSelected(1, 1)).toBe(true);
      expect(sm.isSelected(2, 2)).toBe(true);
    });
  });
});
