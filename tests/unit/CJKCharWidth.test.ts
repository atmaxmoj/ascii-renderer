import { describe, it, expect } from 'vitest';
import {
  isFullWidth,
  charDisplayWidth,
  stringDisplayWidth,
  visualColToCharIndex,
} from '../../src/utils/charWidth.js';
import { CharGrid } from '../../src/display/CharGrid.js';
import { TextRenderer } from '../../src/rasterizer/TextRenderer.js';
import { LayoutNode, ComputedStyleInfo } from '../../src/types.js';

describe('charWidth utilities', () => {
  describe('isFullWidth', () => {
    it('returns true for CJK Unified Ideographs', () => {
      expect(isFullWidth('中'.codePointAt(0)!)).toBe(true);
      expect(isFullWidth('文'.codePointAt(0)!)).toBe(true);
      expect(isFullWidth('字'.codePointAt(0)!)).toBe(true);
    });

    it('returns true for Hiragana/Katakana', () => {
      expect(isFullWidth('あ'.codePointAt(0)!)).toBe(true);
      expect(isFullWidth('ア'.codePointAt(0)!)).toBe(true);
    });

    it('returns true for Hangul Syllables', () => {
      expect(isFullWidth('한'.codePointAt(0)!)).toBe(true);
      expect(isFullWidth('글'.codePointAt(0)!)).toBe(true);
    });

    it('returns true for fullwidth forms', () => {
      expect(isFullWidth('Ａ'.codePointAt(0)!)).toBe(true); // U+FF21 fullwidth A
      expect(isFullWidth('１'.codePointAt(0)!)).toBe(true); // U+FF11 fullwidth 1
    });

    it('returns false for ASCII characters', () => {
      expect(isFullWidth('A'.codePointAt(0)!)).toBe(false);
      expect(isFullWidth('1'.codePointAt(0)!)).toBe(false);
      expect(isFullWidth(' '.codePointAt(0)!)).toBe(false);
    });

    it('returns false for Latin extended characters', () => {
      expect(isFullWidth('é'.codePointAt(0)!)).toBe(false);
      expect(isFullWidth('ñ'.codePointAt(0)!)).toBe(false);
    });
  });

  describe('charDisplayWidth', () => {
    it('returns 2 for CJK characters', () => {
      expect(charDisplayWidth('中')).toBe(2);
      expect(charDisplayWidth('あ')).toBe(2);
      expect(charDisplayWidth('한')).toBe(2);
    });

    it('returns 1 for ASCII characters', () => {
      expect(charDisplayWidth('A')).toBe(1);
      expect(charDisplayWidth(' ')).toBe(1);
      expect(charDisplayWidth('!')).toBe(1);
    });

    it('returns 0 for empty string', () => {
      expect(charDisplayWidth('')).toBe(0);
    });
  });

  describe('stringDisplayWidth', () => {
    it('counts ASCII-only strings normally', () => {
      expect(stringDisplayWidth('Hello')).toBe(5);
      expect(stringDisplayWidth('')).toBe(0);
    });

    it('counts CJK-only strings as double width', () => {
      expect(stringDisplayWidth('中文')).toBe(4);
      expect(stringDisplayWidth('あいう')).toBe(6);
    });

    it('correctly counts mixed ASCII and CJK', () => {
      expect(stringDisplayWidth('Hello中文')).toBe(9); // 5 + 4
      expect(stringDisplayWidth('a中b文c')).toBe(7); // 1+2+1+2+1
    });
  });

  describe('visualColToCharIndex', () => {
    it('maps visual column to char index for ASCII', () => {
      expect(visualColToCharIndex('Hello', 0)).toBe(0);
      expect(visualColToCharIndex('Hello', 3)).toBe(3);
      expect(visualColToCharIndex('Hello', 5)).toBe(5);
    });

    it('maps visual column to char index for CJK', () => {
      // '中文' — '中' at visual cols 0-1, '文' at visual cols 2-3
      expect(visualColToCharIndex('中文', 0)).toBe(0);
      expect(visualColToCharIndex('中文', 2)).toBe(1);
      expect(visualColToCharIndex('中文', 4)).toBe(2);
    });

    it('maps visual column for mixed content', () => {
      // 'a中b' — 'a' at col 0, '中' at cols 1-2, 'b' at col 3
      expect(visualColToCharIndex('a中b', 0)).toBe(0);
      expect(visualColToCharIndex('a中b', 1)).toBe(1);
      expect(visualColToCharIndex('a中b', 3)).toBe(2);
      expect(visualColToCharIndex('a中b', 4)).toBe(3);
    });
  });
});

describe('CharGrid CJK support', () => {
  it('set() creates continuation cell for wide character', () => {
    const grid = new CharGrid(10, 1);
    grid.set(0, 0, { char: '中' });

    const lead = grid.get(0, 0)!;
    expect(lead.char).toBe('中');
    expect(lead.wide).toBe(false);

    const cont = grid.get(1, 0)!;
    expect(cont.char).toBe('');
    expect(cont.wide).toBe(true);
  });

  it('writeText() positions CJK characters with correct visual columns', () => {
    const grid = new CharGrid(10, 1);
    grid.writeText(0, 0, '中文A');

    expect(grid.get(0, 0)!.char).toBe('中');
    expect(grid.get(1, 0)!.wide).toBe(true);
    expect(grid.get(2, 0)!.char).toBe('文');
    expect(grid.get(3, 0)!.wide).toBe(true);
    expect(grid.get(4, 0)!.char).toBe('A');
    expect(grid.get(4, 0)!.wide).toBe(false);
  });

  it('writeText() stops when wide char does not fit', () => {
    const grid = new CharGrid(5, 1);
    // '中文A' needs cols: 0-1, 2-3, 4 = 5 cols — fits exactly
    grid.writeText(0, 0, '中文A');
    expect(grid.get(4, 0)!.char).toBe('A');

    // '中文中' needs 6 cols — last char should not be written
    const grid2 = new CharGrid(5, 1);
    grid2.writeText(0, 0, '中文中');
    expect(grid2.get(0, 0)!.char).toBe('中');
    expect(grid2.get(2, 0)!.char).toBe('文');
    expect(grid2.get(4, 0)!.char).toBe(' '); // doesn't fit
  });

  it('toString() does not duplicate wide characters', () => {
    const grid = new CharGrid(10, 1);
    grid.writeText(0, 0, '中文A');
    const text = grid.toString();
    expect(text).toBe('中文A');
  });

  it('toString() handles mixed content correctly', () => {
    const grid = new CharGrid(12, 1);
    grid.writeText(0, 0, 'Hi中文World');
    expect(grid.toString()).toBe('Hi中文World');
  });

  it('set() overwrites continuation cell and clears lead', () => {
    const grid = new CharGrid(10, 1);
    grid.set(0, 0, { char: '中' });
    // Now overwrite the continuation cell at col 1
    grid.set(1, 0, { char: 'X' });
    // Lead cell should be cleared
    expect(grid.get(0, 0)!.char).toBe(' ');
    expect(grid.get(1, 0)!.char).toBe('X');
    expect(grid.get(1, 0)!.wide).toBe(false);
  });

  it('clear() resets wide flags', () => {
    const grid = new CharGrid(10, 1);
    grid.set(0, 0, { char: '中' });
    grid.clear();
    expect(grid.get(0, 0)!.wide).toBe(false);
    expect(grid.get(1, 0)!.wide).toBe(false);
  });

  it('snapshot preserves wide flag', () => {
    const grid = new CharGrid(10, 1);
    grid.set(0, 0, { char: '中' });
    const snap = grid.snapshot();
    expect(snap[0][0].wide).toBe(false); // lead
    expect(snap[0][1].wide).toBe(true);  // continuation
  });
});

describe('TextRenderer CJK wrapping', () => {
  const renderer = new TextRenderer();

  function makeTextNode(text: string, width: number, textAlign = 'left', whiteSpace = 'normal'): LayoutNode {
    return {
      id: 1,
      element: document.createElement('span'),
      tagName: 'span',
      pixelRect: { x: 0, y: 0, width: 100, height: 20 },
      charRect: { col: 0, row: 0, width, height: 3 },
      style: {
        display: 'inline',
        position: 'static',
        overflow: 'visible',
        overflowX: 'visible',
        overflowY: 'visible',
        zIndex: 'auto',
        opacity: '1',
        transform: 'none',
        visibility: 'visible',
        color: '#ffffff',
        backgroundColor: 'transparent',
        fontWeight: '400',
        fontStyle: 'normal',
        textDecoration: 'none',
        textAlign,
        borderTopStyle: 'none',
        borderRightStyle: 'none',
        borderBottomStyle: 'none',
        borderLeftStyle: 'none',
        borderTopWidth: '0',
        borderRightWidth: '0',
        borderBottomWidth: '0',
        borderLeftWidth: '0',
        borderTopColor: '',
        borderRightColor: '',
        borderBottomColor: '',
        borderLeftColor: '',
        cursor: 'auto',
        whiteSpace,
        textOverflow: 'clip',
      } as ComputedStyleInfo,
      textContent: text,
      children: [],
      parent: null,
      isTextNode: true,
      isEscaped: false,
      stackingOrder: 0,
    };
  }

  it('wraps CJK text at correct visual width', () => {
    // '中文字体' = 8 visual cols; maxWidth = 6 -> should wrap
    const grid = new CharGrid(20, 5);
    const node = makeTextNode('中文字体', 6);
    renderer.render(node, grid);

    // First line: '中文字' = 6 cols
    expect(grid.get(0, 0)!.char).toBe('中');
    expect(grid.get(2, 0)!.char).toBe('文');
    expect(grid.get(4, 0)!.char).toBe('字');
    // Second line: '体' = 2 cols
    expect(grid.get(0, 1)!.char).toBe('体');
  });

  it('centers CJK text using visual width', () => {
    const grid = new CharGrid(20, 3);
    // '中文' = 4 visual cols, container width = 10
    const node = makeTextNode('中文', 10, 'center');
    renderer.render(node, grid);

    // Centered: offset = floor((10 - 4) / 2) = 3
    expect(grid.get(3, 0)!.char).toBe('中');
    expect(grid.get(5, 0)!.char).toBe('文');
  });

  it('right-aligns CJK text using visual width', () => {
    const grid = new CharGrid(20, 3);
    // '中文' = 4 visual cols, container width = 10
    const node = makeTextNode('中文', 10, 'right');
    renderer.render(node, grid);

    // Right-aligned: offset = 10 - 4 = 6
    expect(grid.get(6, 0)!.char).toBe('中');
    expect(grid.get(8, 0)!.char).toBe('文');
  });

  it('handles mixed CJK and ASCII wrapping', () => {
    const grid = new CharGrid(20, 5);
    // 'Hi中文' = 2+4=6 visual cols; maxWidth=5 -> wraps
    const node = makeTextNode('Hi中文', 5);
    renderer.render(node, grid);

    // Word wrap splits at space boundaries, but 'Hi中文' is one "word"
    // It should hard-wrap: 'Hi中' (5 cols) on line 1, '文' on line 2
    expect(grid.get(0, 0)!.char).toBe('H');
    expect(grid.get(1, 0)!.char).toBe('i');
    expect(grid.get(2, 0)!.char).toBe('中');
    expect(grid.get(0, 1)!.char).toBe('文');
  });
});
