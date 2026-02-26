import { describe, it, expect } from 'vitest';
import { CharGrid } from '../../src/display/CharGrid.js';
import { Rasterizer } from '../../src/rasterizer/Rasterizer.js';
import { OverlayManager } from '../../src/rasterizer/OverlayManager.js';
import { HitTestBuffer } from '../../src/events/HitTestBuffer.js';
import { LayoutNode, ComputedStyleInfo } from '../../src/types.js';

function mockStyle(overrides: Partial<ComputedStyleInfo> = {}): ComputedStyleInfo {
  return {
    display: 'block', position: 'static', overflow: 'visible',
    overflowX: 'visible', overflowY: 'visible', zIndex: 'auto',
    opacity: '1', transform: 'none', visibility: 'visible',
    color: '#c0c0c0', backgroundColor: 'rgba(0, 0, 0, 0)',
    fontWeight: '400', fontStyle: 'normal', textDecoration: 'none',
    textAlign: 'left', borderTopStyle: 'none', borderRightStyle: 'none',
    borderBottomStyle: 'none', borderLeftStyle: 'none',
    borderTopWidth: '0px', borderRightWidth: '0px',
    borderBottomWidth: '0px', borderLeftWidth: '0px',
    borderTopColor: '#666', borderRightColor: '#666',
    borderBottomColor: '#666', borderLeftColor: '#666',
    cursor: 'default', whiteSpace: 'normal', textOverflow: 'clip',
    ...overrides,
  };
}

function mockNode(
  id: number,
  tag: string,
  col: number, row: number, width: number, height: number,
  text: string | null = null,
  styleOverrides: Partial<ComputedStyleInfo> = {},
): LayoutNode {
  return {
    id,
    element: { tagName: tag.toUpperCase(), getAttribute: () => null, hasAttribute: () => false } as unknown as Element,
    tagName: tag,
    pixelRect: { x: 0, y: 0, width: 0, height: 0 },
    charRect: { col, row, width, height },
    style: mockStyle(styleOverrides),
    textContent: text,
    children: [],
    parent: null,
    isTextNode: false,
    isEscaped: false,
    stackingOrder: 0,
  };
}

const borderedStyle: Partial<ComputedStyleInfo> = {
  borderTopStyle: 'solid', borderRightStyle: 'solid',
  borderBottomStyle: 'solid', borderLeftStyle: 'solid',
  borderTopWidth: '1px', borderRightWidth: '1px',
  borderBottomWidth: '1px', borderLeftWidth: '1px',
};

function linkParent(parent: LayoutNode, ...children: LayoutNode[]) {
  parent.children = children;
  for (const c of children) c.parent = parent;
}

describe('Table Rendering', () => {
  it('table cells with text and borders get minimum height 3', () => {
    const grid = new CharGrid(40, 20);
    const hitTest = new HitTestBuffer(40, 20);
    const rasterizer = new Rasterizer(new OverlayManager());

    const cell1 = mockNode(3, 'td', 0, 1, 15, 2, 'Name', borderedStyle);
    const cell2 = mockNode(4, 'td', 15, 1, 15, 2, 'Value', borderedStyle);
    const row = mockNode(2, 'tr', 0, 1, 30, 2);
    linkParent(row, cell1, cell2);

    const table = mockNode(1, 'table', 0, 0, 30, 4);
    linkParent(table, row);

    rasterizer.rasterize(table, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Name');
    expect(text).toContain('Value');
  });

  it('multi-row table renders all rows with text', () => {
    const grid = new CharGrid(40, 20);
    const hitTest = new HitTestBuffer(40, 20);
    const rasterizer = new Rasterizer(new OverlayManager());

    const th1 = mockNode(4, 'th', 0, 1, 12, 2, 'Name', borderedStyle);
    const th2 = mockNode(5, 'th', 12, 1, 12, 2, 'Role', borderedStyle);
    const headerRow = mockNode(3, 'tr', 0, 1, 24, 2);
    linkParent(headerRow, th1, th2);

    const td1 = mockNode(7, 'td', 0, 3, 12, 2, 'Alice', borderedStyle);
    const td2 = mockNode(8, 'td', 12, 3, 12, 2, 'Engineer', borderedStyle);
    const dataRow = mockNode(6, 'tr', 0, 3, 24, 2);
    linkParent(dataRow, td1, td2);

    const table = mockNode(2, 'table', 0, 0, 24, 6);
    linkParent(table, headerRow, dataRow);

    const root = mockNode(1, 'div', 0, 0, 40, 20);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Name');
    expect(text).toContain('Role');
    expect(text).toContain('Alice');
    expect(text).toContain('Engineer');
  });

  it('table draws unified borders with junction characters', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // 2x2 table: each cell is 10 cols wide, 3 rows tall
    const td00 = mockNode(5, 'td', 0, 0, 10, 3, 'A', borderedStyle);
    const td01 = mockNode(6, 'td', 10, 0, 10, 3, 'B', borderedStyle);
    const row0 = mockNode(3, 'tr', 0, 0, 20, 3);
    linkParent(row0, td00, td01);

    const td10 = mockNode(7, 'td', 0, 3, 10, 3, 'C', borderedStyle);
    const td11 = mockNode(8, 'td', 10, 3, 10, 3, 'D', borderedStyle);
    const row1 = mockNode(4, 'tr', 0, 3, 20, 3);
    linkParent(row1, td10, td11);

    const table = mockNode(2, 'table', 0, 0, 20, 6);
    linkParent(table, row0, row1);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    // Should have corner characters
    expect(text).toContain('┌');
    expect(text).toContain('┐');
    expect(text).toContain('└');
    expect(text).toContain('┘');
    // Should have junction characters
    expect(text).toContain('┬'); // top T-junction between columns
    expect(text).toContain('┴'); // bottom T-junction
    expect(text).toContain('├'); // left T-junction between rows
    expect(text).toContain('┤'); // right T-junction
    expect(text).toContain('┼'); // cross junction in the middle
    // Should contain cell text
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toContain('C');
    expect(text).toContain('D');
  });

  it('table cells do not render their own borders (no double borders)', () => {
    const grid = new CharGrid(25, 5);
    const hitTest = new HitTestBuffer(25, 5);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Single row, 2 cells
    const td1 = mockNode(4, 'td', 0, 0, 10, 3, 'X', borderedStyle);
    const td2 = mockNode(5, 'td', 10, 0, 10, 3, 'Y', borderedStyle);
    const row = mockNode(3, 'tr', 0, 0, 20, 3);
    linkParent(row, td1, td2);

    const table = mockNode(2, 'table', 0, 0, 20, 3);
    linkParent(table, row);

    const root = mockNode(1, 'div', 0, 0, 25, 5);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    const lines = text.split('\n');

    // First line should be: ┌────────┬────────┐ (unified border)
    // NOT: ┌────────┐┌────────┐ (double border)
    expect(lines[0]).toContain('┬');
    expect(lines[0]).not.toContain('┐┌'); // no adjacent corners
  });

  it('table with tbody works', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    const td1 = mockNode(6, 'td', 0, 0, 12, 3, 'Hello', borderedStyle);
    const row = mockNode(5, 'tr', 0, 0, 12, 3);
    linkParent(row, td1);

    const tbody = mockNode(3, 'tbody', 0, 0, 12, 3);
    linkParent(tbody, row);

    const table = mockNode(2, 'table', 0, 0, 12, 3);
    linkParent(table, tbody);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Hello');
    expect(text).toContain('┌');
    expect(text).toContain('┘');
  });

  it('table without cell borders skips unified border rendering', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Cells without borders
    const td1 = mockNode(4, 'td', 0, 0, 10, 3, 'Plain');
    const row = mockNode(3, 'tr', 0, 0, 10, 3);
    linkParent(row, td1);

    const table = mockNode(2, 'table', 0, 0, 10, 3);
    linkParent(table, row);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Plain');
    // Should NOT have any border characters
    expect(text).not.toContain('┌');
    expect(text).not.toContain('─');
    expect(text).not.toContain('│');
  });
});

describe('Bordered Div Min Height', () => {
  it('expands bordered div with text from height 1 to height 3', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Bordered div with height=1 (too short for border+text+border)
    const bordered = mockNode(2, 'div', 0, 0, 20, 1, 'Hello', borderedStyle);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    // Should have top border, text, and bottom border
    expect(text).toContain('┌');
    expect(text).toContain('Hello');
    expect(text).toContain('└');
  });

  it('expands bordered div with text from height 2 to height 3', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    const bordered = mockNode(2, 'div', 0, 0, 20, 2, 'World', borderedStyle);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('┌');
    expect(text).toContain('World');
    expect(text).toContain('└');
  });

  it('does not expand bordered div that is already height >= 3', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    const bordered = mockNode(2, 'div', 0, 0, 20, 4, 'OK', borderedStyle);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered);

    rasterizer.rasterize(root, grid, hitTest);

    // charRect.height should remain 4
    expect(bordered.charRect.height).toBe(4);
  });

  it('shifts subsequent siblings down when expanding bordered div', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // First child: bordered div with height 1 (will expand to 3, delta=2)
    const bordered = mockNode(2, 'div', 0, 0, 20, 1, 'Box', borderedStyle);
    // Second child: plain text below, originally at row 1
    const below = mockNode(3, 'div', 0, 1, 20, 1, 'Below');
    below.isTextNode = false;

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered, below);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    // Both texts should be visible (below was shifted down)
    expect(text).toContain('Box');
    expect(text).toContain('Below');
    // The "Below" text should be after the bordered div
    const boxLine = text.split('\n').findIndex(l => l.includes('Box'));
    const belowLine = text.split('\n').findIndex(l => l.includes('Below'));
    expect(belowLine).toBeGreaterThan(boxLine);
  });

  it('does not expand elements without borders', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    const noBorder = mockNode(2, 'div', 0, 0, 20, 1, 'No border');

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, noBorder);

    rasterizer.rasterize(root, grid, hitTest);

    expect(noBorder.charRect.height).toBe(1);
  });

  it('dashed bordered div also gets expanded', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    const dashedStyle: Partial<ComputedStyleInfo> = {
      borderTopStyle: 'dashed', borderRightStyle: 'dashed',
      borderBottomStyle: 'dashed', borderLeftStyle: 'dashed',
      borderTopWidth: '1px', borderRightWidth: '1px',
      borderBottomWidth: '1px', borderLeftWidth: '1px',
    };

    const bordered = mockNode(2, 'div', 0, 0, 20, 1, 'Dashed', dashedStyle);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Dashed');
    // Dashed border characters
    expect(text).toContain('·');
  });
});

describe('Vertical Compaction', () => {
  it('removes 1-row gap between block siblings caused by rounding', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Two block divs with a 1-row gap (row 0 height 1, then row 2 height 1 = gap at row 1)
    // Pixel rects show them adjacent (no real gap)
    const div1 = mockNode(2, 'div', 0, 0, 20, 1, 'First');
    div1.pixelRect = { x: 0, y: 0, width: 200, height: 14 };
    const div2 = mockNode(3, 'div', 0, 2, 20, 1, 'Second');
    div2.pixelRect = { x: 0, y: 18, width: 200, height: 14 };

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, div1, div2);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    const lines = text.split('\n').filter(l => l.trim());
    const firstLine = lines.findIndex(l => l.includes('First'));
    const secondLine = lines.findIndex(l => l.includes('Second'));
    // Should be on consecutive lines (no gap)
    expect(secondLine - firstLine).toBe(1);
  });

  it('does not compact flex children (horizontal layout)', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Bordered flex children should stay at their original positions
    const col1 = mockNode(2, 'div', 0, 0, 10, 3, 'A', borderedStyle);
    col1.pixelRect = { x: 0, y: 0, width: 100, height: 42 };
    const col2 = mockNode(3, 'div', 10, 0, 10, 3, 'B', borderedStyle);
    col2.pixelRect = { x: 100, y: 0, width: 100, height: 42 };

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    root.style = mockStyle({ display: 'flex' });
    linkParent(root, col1, col2);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('A');
    expect(text).toContain('B');
    // Both should be on the same row (not shifted)
    expect(col1.charRect.row).toBe(col2.charRect.row);
  });

  it('table cells with single-line text have exact height 3 (no extra blank row)', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = new Rasterizer(new OverlayManager());

    // Cell with height 4 from browser (should be clamped to 3)
    const td1 = mockNode(4, 'td', 0, 0, 10, 4, 'Name', borderedStyle);
    const td2 = mockNode(5, 'td', 10, 0, 10, 4, 'Role', borderedStyle);
    const row = mockNode(3, 'tr', 0, 0, 20, 4);
    linkParent(row, td1, td2);

    const table = mockNode(2, 'table', 0, 0, 20, 4);
    linkParent(table, row);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, table);

    rasterizer.rasterize(root, grid, hitTest);

    // Cells should have height 3, not 4
    expect(td1.charRect.height).toBe(3);
    expect(td2.charRect.height).toBe(3);
  });
});
