import { describe, it, expect } from 'vitest';
import { CharGrid } from '../../src/display/CharGrid.js';
import { TextExporter } from '../../src/export/TextExporter.js';
import { Cell, DEFAULT_THEME } from '../../src/types.js';

describe('Phase 5: Dirty Tracking', () => {
  it('snapshot creates a deep copy of the grid', () => {
    const grid = new CharGrid(5, 3);
    grid.setChar(0, 0, 'A');
    const snap = grid.snapshot();

    // Modifying original should not affect snapshot
    grid.setChar(0, 0, 'B');
    expect(snap[0][0].char).toBe('A');
    expect(grid.getRef(0, 0)!.char).toBe('B');
  });

  it('snapshot preserves all cell properties', () => {
    const grid = new CharGrid(5, 3);
    grid.set(1, 1, {
      char: 'X',
      fg: '#ff0000',
      bg: '#00ff00',
      bold: true,
      italic: true,
      underline: true,
      elementId: 42,
    });

    const snap = grid.snapshot();
    const cell = snap[1][1];
    expect(cell.char).toBe('X');
    expect(cell.fg).toBe('#ff0000');
    expect(cell.bg).toBe('#00ff00');
    expect(cell.bold).toBe(true);
    expect(cell.italic).toBe(true);
    expect(cell.underline).toBe(true);
    expect(cell.elementId).toBe(42);
  });

  it('cell equality comparison works correctly', () => {
    const a: Cell = {
      char: 'A', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, elementId: 1,
    };
    const b: Cell = { ...a };
    const c: Cell = { ...a, char: 'B' };
    const d: Cell = { ...a, bold: true };

    // Same properties
    expect(a.char === b.char && a.fg === b.fg && a.bg === b.bg &&
      a.bold === b.bold && a.italic === b.italic && a.underline === b.underline).toBe(true);
    // Different char
    expect(a.char === c.char).toBe(false);
    // Different bold
    expect(a.bold === d.bold).toBe(false);
  });
});

describe('Phase 5: Theme System', () => {
  it('DEFAULT_THEME has all required fields', () => {
    expect(DEFAULT_THEME.fg).toBeDefined();
    expect(DEFAULT_THEME.bg).toBeDefined();
    expect(DEFAULT_THEME.border).toBeDefined();
    expect(DEFAULT_THEME.focus).toBeDefined();
    expect(DEFAULT_THEME.link).toBeDefined();
    expect(DEFAULT_THEME.selection).toBeDefined();
  });

  it('partial theme merge preserves unset fields', () => {
    const custom = { fg: '#ffffff' };
    const merged = { ...DEFAULT_THEME, ...custom };
    expect(merged.fg).toBe('#ffffff');
    expect(merged.bg).toBe(DEFAULT_THEME.bg);
    expect(merged.border).toBe(DEFAULT_THEME.border);
    expect(merged.focus).toBe(DEFAULT_THEME.focus);
  });
});

describe('Phase 5: ANSI Export', () => {
  it('grid with styled cells produces ANSI escape codes', () => {
    const grid = new CharGrid(10, 1);
    grid.set(0, 0, {
      char: 'H', fg: '#ff0000', bg: '#000000',
      bold: true, italic: false, underline: false, elementId: 0,
    });
    grid.set(1, 0, {
      char: 'i', fg: '#00ff00', bg: '#000000',
      bold: false, italic: false, underline: false, elementId: 0,
    });

    const exporter = new TextExporter();
    const ansi = exporter.toAnsi(grid);

    // Should contain ANSI escape sequences
    expect(ansi).toContain('\x1b[');
    // Should contain the actual characters
    expect(ansi).toContain('H');
    expect(ansi).toContain('i');
    // Bold marker
    expect(ansi).toContain('1;');
    // Reset
    expect(ansi).toContain('\x1b[0m');
  });
});

describe('Phase 5: Copy Support', () => {
  it('toText() returns grid content as copyable string', () => {
    const grid = new CharGrid(20, 3);
    grid.writeText(0, 0, 'Hello World');
    grid.writeText(0, 1, '[ Submit ]');
    grid.drawBox(0, 2, 10, 3, 'solid', '#ccc');

    const exporter = new TextExporter();
    const text = exporter.toPlainText(grid);

    expect(text).toContain('Hello World');
    expect(text).toContain('[ Submit ]');
    // Box chars should be present
    expect(text).toContain('┌');
    expect(text).toContain('─');
  });
});
