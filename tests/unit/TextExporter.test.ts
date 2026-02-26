import { describe, it, expect } from 'vitest';
import { CharGrid } from '../../src/display/CharGrid.js';
import { TextExporter } from '../../src/export/TextExporter.js';

describe('TextExporter', () => {
  const exporter = new TextExporter();

  describe('toPlainText', () => {
    it('exports a simple text grid', () => {
      const grid = new CharGrid(20, 3);
      grid.writeText(0, 0, 'Hello World');
      grid.writeText(0, 1, 'Line Two');

      const text = exporter.toPlainText(grid);
      expect(text).toBe('Hello World\nLine Two');
    });

    it('exports a grid with box drawing', () => {
      const grid = new CharGrid(10, 3);
      grid.drawBox(0, 0, 10, 3);
      grid.writeText(1, 1, 'Content');

      const text = exporter.toPlainText(grid);
      const lines = text.split('\n');
      expect(lines[0]).toBe('┌────────┐');
      expect(lines[1]).toBe('│Content │');
      expect(lines[2]).toBe('└────────┘');
    });

    it('handles empty grid', () => {
      const grid = new CharGrid(5, 5);
      expect(exporter.toPlainText(grid)).toBe('');
    });
  });

  describe('toAnsi', () => {
    it('includes ANSI escape codes for colors', () => {
      const grid = new CharGrid(5, 1);
      grid.set(0, 0, { char: 'A', fg: '#ff0000' });

      const ansi = exporter.toAnsi(grid);
      expect(ansi).toContain('\x1b[');
      expect(ansi).toContain('A');
    });

    it('includes bold formatting', () => {
      const grid = new CharGrid(5, 1);
      grid.set(0, 0, { char: 'B', bold: true });

      const ansi = exporter.toAnsi(grid);
      // Bold is ANSI code 1
      expect(ansi).toContain('1');
    });
  });
});
