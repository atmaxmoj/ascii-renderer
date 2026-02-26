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

function makeRasterizer() {
  return new Rasterizer(new OverlayManager());
}

// ——————————————————————————————————————————————
// Text Styling Tests
// ——————————————————————————————————————————————

describe('Text Styling', () => {
  it('bold text sets bold flag on grid cells', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const boldNode = mockNode(2, 'div', 0, 0, 20, 1, 'Bold', { fontWeight: '700' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, boldNode);

    rasterizer.rasterize(root, grid, hitTest);

    const cell = grid.get(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.char).toBe('B');
    expect(cell!.bold).toBe(true);
    expect(cell!.italic).toBe(false);
  });

  it('italic text sets italic flag on grid cells', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const italicNode = mockNode(2, 'div', 0, 0, 20, 1, 'Italic', { fontStyle: 'italic' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, italicNode);

    rasterizer.rasterize(root, grid, hitTest);

    const cell = grid.get(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.char).toBe('I');
    expect(cell!.italic).toBe(true);
    expect(cell!.bold).toBe(false);
  });

  it('underlined text sets underline flag on grid cells', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const underlineNode = mockNode(2, 'div', 0, 0, 20, 1, 'Underlined text', { textDecoration: 'underline' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, underlineNode);

    rasterizer.rasterize(root, grid, hitTest);

    const cell = grid.get(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.char).toBe('U');
    expect(cell!.underline).toBe(true);

    // Space between words should also be underlined
    const spaceCell = grid.get(10, 0);
    expect(spaceCell).not.toBeNull();
    expect(spaceCell!.char).toBe(' ');
    expect(spaceCell!.underline).toBe(true);
  });

  it('combined bold+italic sets both flags', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const node = mockNode(2, 'div', 0, 0, 20, 1, 'Both', { fontWeight: '700', fontStyle: 'italic' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, node);

    rasterizer.rasterize(root, grid, hitTest);

    const cell = grid.get(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.bold).toBe(true);
    expect(cell!.italic).toBe(true);
  });

  it('link text has underline flag (browser applies underline to <a>)', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    // Simulates <a> which the browser gives textDecoration: underline
    const linkNode = mockNode(2, 'a', 0, 0, 20, 1, 'Link text', { textDecoration: 'underline' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, linkNode);

    rasterizer.rasterize(root, grid, hitTest);

    const cell = grid.get(0, 0);
    expect(cell).not.toBeNull();
    expect(cell!.char).toBe('L');
    expect(cell!.underline).toBe(true);

    // Space between words should also be underlined
    const spaceCell = grid.get(4, 0);
    expect(spaceCell).not.toBeNull();
    expect(spaceCell!.char).toBe(' ');
    expect(spaceCell!.underline).toBe(true);
  });

  it('mixed inline: only bold child has bold flag', () => {
    const grid = new CharGrid(40, 5);
    const hitTest = new HitTestBuffer(40, 5);
    const rasterizer = makeRasterizer();

    // Parent div contains two text children side by side
    const normalText = mockNode(3, 'span', 0, 0, 7, 1, 'Normal ');
    normalText.isTextNode = true;
    const boldText = mockNode(4, 'span', 7, 0, 4, 1, 'Bold');
    boldText.isTextNode = true;
    boldText.style = mockStyle({ fontWeight: '700' });

    const parent = mockNode(2, 'div', 0, 0, 40, 1);
    linkParent(parent, normalText, boldText);

    const root = mockNode(1, 'div', 0, 0, 40, 5);
    linkParent(root, parent);

    rasterizer.rasterize(root, grid, hitTest);

    // 'N' from "Normal " at col 0 — not bold
    const normalCell = grid.get(0, 0);
    expect(normalCell).not.toBeNull();
    expect(normalCell!.char).toBe('N');
    expect(normalCell!.bold).toBe(false);

    // 'B' from "Bold" at col 7 — bold
    const boldCell = grid.get(7, 0);
    expect(boldCell).not.toBeNull();
    expect(boldCell!.char).toBe('B');
    expect(boldCell!.bold).toBe(true);
  });

  it('code text renders content without special styling flags', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const codeNode = mockNode(2, 'code', 0, 0, 20, 1, 'let x = 1');
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, codeNode);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('let x = 1');

    const cell = grid.get(0, 0);
    expect(cell!.bold).toBe(false);
    expect(cell!.italic).toBe(false);
    expect(cell!.underline).toBe(false);
  });
});

// ——————————————————————————————————————————————
// Text Alignment Tests
// ——————————————————————————————————————————————

describe('Text Alignment', () => {
  it('text-align: left places text at the start of the inner area', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    const node = mockNode(2, 'div', 0, 0, 20, 1, 'Left', { textAlign: 'left' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, node);

    rasterizer.rasterize(root, grid, hitTest);

    // 'L' should be at col 0
    expect(grid.get(0, 0)!.char).toBe('L');
    expect(grid.get(1, 0)!.char).toBe('e');
  });

  it('text-align: center places text in the middle of the inner area', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    // Width 20, text "Hi" (len=2), centered: startCol = floor((20-2)/2) = 9
    const node = mockNode(2, 'div', 0, 0, 20, 1, 'Hi', { textAlign: 'center' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, node);

    rasterizer.rasterize(root, grid, hitTest);

    const expectedStart = Math.floor((20 - 2) / 2); // 9
    expect(grid.get(expectedStart, 0)!.char).toBe('H');
    expect(grid.get(expectedStart + 1, 0)!.char).toBe('i');
    // Position before should be empty
    expect(grid.get(expectedStart - 1, 0)!.char).toBe(' ');
  });

  it('text-align: right places text at the end of the inner area', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    const rasterizer = makeRasterizer();

    // Width 20, text "End" (len=3), right: startCol = 20-3 = 17
    const node = mockNode(2, 'div', 0, 0, 20, 1, 'End', { textAlign: 'right' });
    const root = mockNode(1, 'div', 0, 0, 30, 5);
    linkParent(root, node);

    rasterizer.rasterize(root, grid, hitTest);

    const expectedStart = 20 - 3; // 17
    expect(grid.get(expectedStart, 0)!.char).toBe('E');
    expect(grid.get(expectedStart + 1, 0)!.char).toBe('n');
    expect(grid.get(expectedStart + 2, 0)!.char).toBe('d');
  });
});

// ——————————————————————————————————————————————
// Layout Tests
// ——————————————————————————————————————————————

describe('Layout', () => {
  it('bordered div with text: text starts inside the border', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = makeRasterizer();

    // Bordered div at col 0, row 0, width 20, height 3
    const bordered = mockNode(2, 'div', 0, 0, 20, 3, 'Inside', borderedStyle);
    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, bordered);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('┌');
    expect(text).toContain('Inside');
    expect(text).toContain('└');

    // Text should be at row 1 (inside border), col 1 (after left border)
    expect(grid.get(1, 1)!.char).toBe('I');
    // Col 0 row 1 should be the left border
    expect(grid.get(0, 1)!.char).toBe('│');
  });

  it('block siblings stack vertically', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = makeRasterizer();

    const div1 = mockNode(2, 'div', 0, 0, 20, 1, 'First');
    div1.pixelRect = { x: 0, y: 0, width: 200, height: 14 };
    const div2 = mockNode(3, 'div', 0, 1, 20, 1, 'Second');
    div2.pixelRect = { x: 0, y: 14, width: 200, height: 14 };

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, div1, div2);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('First');
    expect(text).toContain('Second');

    // First should be above Second
    const lines = text.split('\n');
    const firstLine = lines.findIndex(l => l.includes('First'));
    const secondLine = lines.findIndex(l => l.includes('Second'));
    expect(firstLine).toBeLessThan(secondLine);
  });

  it('flex parent places children side by side on the same row', () => {
    const grid = new CharGrid(40, 5);
    const hitTest = new HitTestBuffer(40, 5);
    const rasterizer = makeRasterizer();

    const colA = mockNode(3, 'div', 0, 0, 10, 3, 'A', borderedStyle);
    colA.pixelRect = { x: 0, y: 0, width: 100, height: 42 };
    const colB = mockNode(4, 'div', 10, 0, 10, 3, 'B', borderedStyle);
    colB.pixelRect = { x: 100, y: 0, width: 100, height: 42 };
    const colC = mockNode(5, 'div', 20, 0, 10, 3, 'C', borderedStyle);
    colC.pixelRect = { x: 200, y: 0, width: 100, height: 42 };

    const flexParent = mockNode(2, 'div', 0, 0, 30, 3, null, { display: 'flex' });
    linkParent(flexParent, colA, colB, colC);

    const root = mockNode(1, 'div', 0, 0, 40, 5);
    linkParent(root, flexParent);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('A');
    expect(text).toContain('B');
    expect(text).toContain('C');

    // All three should be on the same row (row 0 for their charRects)
    expect(colA.charRect.row).toBe(colB.charRect.row);
    expect(colB.charRect.row).toBe(colC.charRect.row);
  });

  it('nested bordered divs render text at the correct inner position', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);
    const rasterizer = makeRasterizer();

    // Outer bordered div: col 0, row 0, width 20, height 5
    const outer = mockNode(2, 'div', 0, 0, 20, 5, null, borderedStyle);
    // Inner bordered div: col 1, row 1, width 18, height 3 (inside outer border)
    const inner = mockNode(3, 'div', 1, 1, 18, 3, 'Nested', borderedStyle);
    linkParent(outer, inner);

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, outer);

    rasterizer.rasterize(root, grid, hitTest);

    const text = grid.toString();
    expect(text).toContain('Nested');

    // Outer border at col 0
    expect(grid.get(0, 0)!.char).toBe('┌');
    // Inner border at col 1, row 1
    expect(grid.get(1, 1)!.char).toBe('┌');
    // "Nested" text should be at col 2, row 2 (inside inner border)
    expect(grid.get(2, 2)!.char).toBe('N');
  });
});

// ——————————————————————————————————————————————
// Bordered Containment (ensureBorderedContainment)
// ——————————————————————————————————————————————

describe('Bordered containment — parent grows to hold children', () => {
  it('bordered parent expands when children overflow its charRect', () => {
    const grid = new CharGrid(30, 15);
    const hitTest = new HitTestBuffer(30, 15);

    // Parent bordered height 4, but children need rows 1..5 (height 5 inner + 2 border = 7)
    const parent = mockNode(1, 'div', 0, 0, 20, 4, null, borderedStyle);
    const child1 = mockNode(2, 'div', 1, 1, 18, 1, 'First');
    child1.pixelRect = { x: 10, y: 14, width: 180, height: 14 };
    const child2 = mockNode(3, 'div', 1, 2, 18, 1, 'Second');
    child2.pixelRect = { x: 10, y: 28, width: 180, height: 14 };
    const child3 = mockNode(4, 'div', 1, 3, 18, 1, 'Third');
    child3.pixelRect = { x: 10, y: 42, width: 180, height: 14 };
    const child4 = mockNode(5, 'div', 1, 4, 18, 1, 'Fourth');
    child4.pixelRect = { x: 10, y: 56, width: 180, height: 14 };
    const child5 = mockNode(6, 'div', 1, 5, 18, 1, 'Fifth');
    child5.pixelRect = { x: 10, y: 70, width: 180, height: 14 };
    linkParent(parent, child1, child2, child3, child4, child5);

    const root = mockNode(0, 'div', 0, 0, 30, 15);
    linkParent(root, parent);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    // All 5 children should be visible
    expect(output).toContain('First');
    expect(output).toContain('Fifth');

    // Parent border should wrap around everything
    expect(grid.get(0, 0)!.char).toBe('┌'); // top border
    // Bottom border must be BELOW the last child
    const lines = output.split('\n');
    const fifthRow = lines.findIndex(l => l.includes('Fifth'));
    const bottomBorderRow = lines.findIndex((l, i) => i > fifthRow && l.includes('└'));
    expect(bottomBorderRow).toBeGreaterThan(fifthRow);
  });

  it('sibling after expanded bordered parent shifts down', () => {
    const grid = new CharGrid(30, 15);
    const hitTest = new HitTestBuffer(30, 15);

    // Bordered parent too short (height 3), has 3 children that overflow
    const parent = mockNode(1, 'div', 0, 0, 20, 3, null, borderedStyle);
    const c1 = mockNode(2, 'div', 1, 1, 18, 1, 'Inside1');
    c1.pixelRect = { x: 10, y: 14, width: 180, height: 14 };
    const c2 = mockNode(3, 'div', 1, 2, 18, 1, 'Inside2');
    c2.pixelRect = { x: 10, y: 28, width: 180, height: 14 };
    const c3 = mockNode(4, 'div', 1, 3, 18, 1, 'Inside3');
    c3.pixelRect = { x: 10, y: 42, width: 180, height: 14 };
    linkParent(parent, c1, c2, c3);

    // Sibling after the bordered parent — originally at row 4
    const after = mockNode(5, 'div', 0, 4, 20, 1, 'After');
    after.pixelRect = { x: 0, y: 56, width: 200, height: 14 };

    const root = mockNode(0, 'div', 0, 0, 30, 15);
    linkParent(root, parent, after);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('Inside1');
    expect(output).toContain('Inside3');
    expect(output).toContain('After');

    // "After" must appear below the parent's bottom border
    const lines = output.split('\n');
    const bottomBorder = lines.findIndex((l, i) =>
      i > 0 && l.includes('└'),
    );
    const afterRow = lines.findIndex(l => l.includes('After'));
    expect(afterRow).toBeGreaterThan(bottomBorder);
  });

  it('nested bordered parents both grow (grandparent contains parent contains children)', () => {
    const grid = new CharGrid(30, 20);
    const hitTest = new HitTestBuffer(30, 20);

    // Grandparent: bordered, height 5 (too short)
    const gp = mockNode(1, 'div', 0, 0, 28, 5, null, borderedStyle);
    // Parent: bordered inside gp, height 3 (too short for its children)
    const p = mockNode(2, 'div', 1, 1, 26, 3, null, borderedStyle);
    // 4 children inside parent
    const c1 = mockNode(3, 'div', 2, 2, 24, 1, 'AAA');
    c1.pixelRect = { x: 20, y: 28, width: 240, height: 14 };
    const c2 = mockNode(4, 'div', 2, 3, 24, 1, 'BBB');
    c2.pixelRect = { x: 20, y: 42, width: 240, height: 14 };
    const c3 = mockNode(5, 'div', 2, 4, 24, 1, 'CCC');
    c3.pixelRect = { x: 20, y: 56, width: 240, height: 14 };
    const c4 = mockNode(6, 'div', 2, 5, 24, 1, 'DDD');
    c4.pixelRect = { x: 20, y: 70, width: 240, height: 14 };
    linkParent(p, c1, c2, c3, c4);
    linkParent(gp, p);

    const root = mockNode(0, 'div', 0, 0, 30, 20);
    linkParent(root, gp);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    // All 4 children visible
    expect(output).toContain('AAA');
    expect(output).toContain('DDD');

    // Grandparent's top border at (col 0, row 0)
    expect(grid.get(0, 0)!.char).toBe('┌');
    // Parent's top border at (col 1, row 1)
    expect(grid.get(1, 1)!.char).toBe('┌');

    // Find DDD row, parent └ row (at col 1), and grandparent └ row (at col 0)
    let dddRow = -1, pBottomRow = -1, gpBottomRow = -1;
    for (let r = 0; r < 20; r++) {
      if (dddRow < 0 && grid.get(2, r)?.char === 'D') dddRow = r;
      if (grid.get(1, r)?.char === '└') pBottomRow = r;
      if (grid.get(0, r)?.char === '└') gpBottomRow = r;
    }
    // Parent bottom border below DDD content
    expect(pBottomRow).toBeGreaterThan(dddRow);
    // Grandparent bottom border below parent bottom border
    expect(gpBottomRow).toBeGreaterThan(pBottomRow);
  });

  it('bordered parent already large enough — no expansion needed', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);

    // Parent height 8 — plenty of room for 2 children at rows 1 and 2
    const parent = mockNode(1, 'div', 0, 0, 20, 8, null, borderedStyle);
    const c1 = mockNode(2, 'div', 1, 1, 18, 1, 'A');
    c1.pixelRect = { x: 10, y: 14, width: 180, height: 14 };
    const c2 = mockNode(3, 'div', 1, 2, 18, 1, 'B');
    c2.pixelRect = { x: 10, y: 28, width: 180, height: 14 };
    linkParent(parent, c1, c2);
    const root = mockNode(0, 'div', 0, 0, 30, 10);
    linkParent(root, parent);

    makeRasterizer().rasterize(root, grid, hitTest);

    // Height should remain 8 (no expansion)
    expect(parent.charRect.height).toBe(8);
    expect(grid.toString()).toContain('A');
    expect(grid.toString()).toContain('B');
  });

  it('flex bordered parent does not shift horizontal children down', () => {
    const grid = new CharGrid(40, 8);
    const hitTest = new HitTestBuffer(40, 8);

    // Flex parent with 2 side-by-side bordered children
    const flex = mockNode(1, 'div', 0, 0, 30, 5, null, { ...borderedStyle, display: 'flex' });
    const left = mockNode(2, 'div', 1, 1, 13, 3, 'L', borderedStyle);
    left.pixelRect = { x: 10, y: 14, width: 130, height: 42 };
    const right = mockNode(3, 'div', 14, 1, 14, 3, 'R', borderedStyle);
    right.pixelRect = { x: 140, y: 14, width: 140, height: 42 };
    linkParent(flex, left, right);

    const root = mockNode(0, 'div', 0, 0, 40, 8);
    linkParent(root, flex);

    makeRasterizer().rasterize(root, grid, hitTest);

    // Both children should stay on the same row — not shifted
    expect(left.charRect.row).toBe(right.charRect.row);
    const output = grid.toString();
    expect(output).toContain('L');
    expect(output).toContain('R');
  });

  it('bordered parent with inner bordered child that expands — parent also grows', () => {
    const grid = new CharGrid(30, 15);
    const hitTest = new HitTestBuffer(30, 15);

    // Outer bordered height 5
    const outer = mockNode(1, 'div', 0, 0, 24, 5, null, borderedStyle);
    // Inner bordered child at row 1, height 2 — will expand to 3 (min height)
    const inner = mockNode(2, 'div', 1, 1, 22, 2, 'Text', borderedStyle);
    // Plain sibling below inner, at row 3
    const below = mockNode(3, 'div', 1, 3, 22, 1, 'Below');
    below.pixelRect = { x: 10, y: 42, width: 220, height: 14 };
    linkParent(outer, inner, below);

    const root = mockNode(0, 'div', 0, 0, 30, 15);
    linkParent(root, outer);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('Text');
    expect(output).toContain('Below');

    // Inner box expanded to 3, "Below" shifted down, outer must contain both
    const lines = output.split('\n');
    const belowRow = lines.findIndex(l => l.includes('Below'));
    const outerBottom = lines.findIndex((l, i) => i > belowRow && l.startsWith('└'));
    expect(outerBottom).toBeGreaterThan(belowRow);
  });
});

// ——————————————————————————————————————————————
// Exhaustive Style Combinations
// ——————————————————————————————————————————————

describe('Style Combinations — exhaustive pairs & triple', () => {
  it('bold + underline (no italic)', () => {
    const grid = new CharGrid(30, 3);
    const hitTest = new HitTestBuffer(30, 3);
    makeRasterizer().rasterize(
      (() => {
        const r = mockNode(0, 'div', 0, 0, 30, 3);
        const n = mockNode(1, 'div', 0, 0, 20, 1, 'BU text', { fontWeight: '700', textDecoration: 'underline' });
        linkParent(r, n);
        return r;
      })(), grid, hitTest);

    const c = grid.get(0, 0)!;
    expect(c.bold).toBe(true);
    expect(c.underline).toBe(true);
    expect(c.italic).toBe(false);
    // space at index 2 also has both flags
    const sp = grid.get(2, 0)!;
    expect(sp.char).toBe(' ');
    expect(sp.bold).toBe(true);
    expect(sp.underline).toBe(true);
  });

  it('italic + underline (no bold)', () => {
    const grid = new CharGrid(30, 3);
    const hitTest = new HitTestBuffer(30, 3);
    makeRasterizer().rasterize(
      (() => {
        const r = mockNode(0, 'div', 0, 0, 30, 3);
        const n = mockNode(1, 'div', 0, 0, 20, 1, 'IU text', { fontStyle: 'italic', textDecoration: 'underline' });
        linkParent(r, n);
        return r;
      })(), grid, hitTest);

    const c = grid.get(0, 0)!;
    expect(c.italic).toBe(true);
    expect(c.underline).toBe(true);
    expect(c.bold).toBe(false);
    const sp = grid.get(2, 0)!;
    expect(sp.char).toBe(' ');
    expect(sp.italic).toBe(true);
    expect(sp.underline).toBe(true);
  });

  it('bold + italic + underline (all three)', () => {
    const grid = new CharGrid(30, 3);
    const hitTest = new HitTestBuffer(30, 3);
    makeRasterizer().rasterize(
      (() => {
        const r = mockNode(0, 'div', 0, 0, 30, 3);
        const n = mockNode(1, 'div', 0, 0, 20, 1, 'ALL three', {
          fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
        });
        linkParent(r, n);
        return r;
      })(), grid, hitTest);

    const c = grid.get(0, 0)!;
    expect(c.bold).toBe(true);
    expect(c.italic).toBe(true);
    expect(c.underline).toBe(true);
    // space between ALL and three
    const sp = grid.get(3, 0)!;
    expect(sp.char).toBe(' ');
    expect(sp.bold).toBe(true);
    expect(sp.italic).toBe(true);
    expect(sp.underline).toBe(true);
  });
});

// ——————————————————————————————————————————————
// Alignment + Style combos
// ——————————————————————————————————————————————

describe('Alignment combined with styles', () => {
  it('centered bold+italic+underline text', () => {
    const grid = new CharGrid(30, 3);
    const hitTest = new HitTestBuffer(30, 3);
    // width 20, text "Hey" len=3, centered → startCol = floor((20-3)/2) = 8
    const node = mockNode(1, 'div', 0, 0, 20, 1, 'Hey', {
      textAlign: 'center', fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
    });
    const root = mockNode(0, 'div', 0, 0, 30, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    const start = Math.floor((20 - 3) / 2); // 8
    const c = grid.get(start, 0)!;
    expect(c.char).toBe('H');
    expect(c.bold).toBe(true);
    expect(c.italic).toBe(true);
    expect(c.underline).toBe(true);
    // padding before should be unstyled
    expect(grid.get(start - 1, 0)!.bold).toBe(false);
  });

  it('right-aligned italic+underline text', () => {
    const grid = new CharGrid(30, 3);
    const hitTest = new HitTestBuffer(30, 3);
    // width 20, "Tail" len=4, right → startCol = 16
    const node = mockNode(1, 'div', 0, 0, 20, 1, 'Tail', {
      textAlign: 'right', fontStyle: 'italic', textDecoration: 'underline',
    });
    const root = mockNode(0, 'div', 0, 0, 30, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    const start = 20 - 4; // 16
    expect(grid.get(start, 0)!.char).toBe('T');
    expect(grid.get(start, 0)!.italic).toBe(true);
    expect(grid.get(start, 0)!.underline).toBe(true);
    expect(grid.get(start - 1, 0)!.italic).toBe(false);
  });

  it('centered text inside bordered div — offset accounts for border', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    // bordered div width 20 → inner width 18, "OK" len=2, center → innerCol 1 + floor((18-2)/2) = 9
    const node = mockNode(1, 'div', 0, 0, 20, 3, 'OK', { ...borderedStyle, textAlign: 'center' });
    const root = mockNode(0, 'div', 0, 0, 30, 5);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    const start = 1 + Math.floor((18 - 2) / 2); // 9
    expect(grid.get(start, 1)!.char).toBe('O');
    expect(grid.get(start + 1, 1)!.char).toBe('K');
  });

  it('right-aligned text inside bordered div', () => {
    const grid = new CharGrid(30, 5);
    const hitTest = new HitTestBuffer(30, 5);
    // bordered div width 20 → inner width 18, "XYZ" len=3, right → innerCol 1 + (18-3) = 16
    const node = mockNode(1, 'div', 0, 0, 20, 3, 'XYZ', { ...borderedStyle, textAlign: 'right' });
    const root = mockNode(0, 'div', 0, 0, 30, 5);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    const start = 1 + (18 - 3); // 16
    expect(grid.get(start, 1)!.char).toBe('X');
    expect(grid.get(start + 2, 1)!.char).toBe('Z');
  });

  it('right-aligned in narrow bordered box (width=8 → inner 6)', () => {
    const grid = new CharGrid(20, 5);
    const hitTest = new HitTestBuffer(20, 5);
    // inner width 6, "Hi" len=2, right → innerCol 1 + (6-2) = 5
    const node = mockNode(1, 'div', 0, 0, 8, 3, 'Hi', { ...borderedStyle, textAlign: 'right' });
    const root = mockNode(0, 'div', 0, 0, 20, 5);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    expect(grid.get(5, 1)!.char).toBe('H');
    expect(grid.get(6, 1)!.char).toBe('i');
  });

  it('centered text fills exact width (width = text length) — no extra offset', () => {
    const grid = new CharGrid(20, 3);
    const hitTest = new HitTestBuffer(20, 3);
    // width 5, "ABCDE" len=5, center → floor((5-5)/2)=0
    const node = mockNode(1, 'div', 0, 0, 5, 1, 'ABCDE', { textAlign: 'center' });
    const root = mockNode(0, 'div', 0, 0, 20, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    expect(grid.get(0, 0)!.char).toBe('A');
    expect(grid.get(4, 0)!.char).toBe('E');
  });
});

// ——————————————————————————————————————————————
// Deep nesting — 3+ border levels, border↔flex interleaving
// ——————————————————————————————————————————————

describe('Deep nesting', () => {
  it('triple nested borders — text at deepest level', () => {
    // L0 bordered 30×9, L1 bordered 28×7 at (1,1), L2 bordered 26×5 at (2,2), text at (3,3)
    const grid = new CharGrid(40, 12);
    const hitTest = new HitTestBuffer(40, 12);

    const L0 = mockNode(1, 'div', 0, 0, 30, 9, null, borderedStyle);
    const L1 = mockNode(2, 'div', 1, 1, 28, 7, null, borderedStyle);
    const L2 = mockNode(3, 'div', 2, 2, 26, 5, null, borderedStyle);
    const txt = mockNode(4, 'div', 3, 3, 24, 1, 'Deep');
    txt.isTextNode = true;
    linkParent(L2, txt);
    linkParent(L1, L2);
    linkParent(L0, L1);
    const root = mockNode(0, 'div', 0, 0, 40, 12);
    linkParent(root, L0);

    makeRasterizer().rasterize(root, grid, hitTest);

    expect(grid.get(0, 0)!.char).toBe('┌'); // L0
    expect(grid.get(1, 1)!.char).toBe('┌'); // L1
    expect(grid.get(2, 2)!.char).toBe('┌'); // L2
    expect(grid.get(3, 3)!.char).toBe('D');
    expect(grid.toString()).toContain('Deep');
  });

  it('bordered → flex → bordered → centered bold+italic+underline text', () => {
    // outer border 40×7
    //   flex row (1,1) 38×5
    //     innerBox (1,1) 18×5 bordered → text centered with all 3 styles
    //     siblingBox (19,1) 20×5 bordered → plain text
    const grid = new CharGrid(44, 10);
    const hitTest = new HitTestBuffer(44, 10);

    const outer = mockNode(1, 'div', 0, 0, 40, 7, null, borderedStyle);
    const flex = mockNode(2, 'div', 1, 1, 38, 5, null, { display: 'flex' });

    const innerBox = mockNode(3, 'div', 1, 1, 18, 5, 'BIU', {
      ...borderedStyle, textAlign: 'center',
      fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
    });
    const siblingBox = mockNode(4, 'div', 19, 1, 20, 5, 'Plain', borderedStyle);

    linkParent(flex, innerBox, siblingBox);
    linkParent(outer, flex);
    const root = mockNode(0, 'div', 0, 0, 44, 10);
    linkParent(root, outer);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('BIU');
    expect(output).toContain('Plain');

    // innerBox: border at (1,1)...(18,5), inner cols 2..17 (width 16)
    // "BIU" len=3 centered → startCol = 2 + floor((16-3)/2) = 2 + 6 = 8
    // text at innerRow = 1+1 = 2 (first row inside top border)
    const biuStart = 2 + Math.floor((16 - 3) / 2);
    const c = grid.get(biuStart, 2)!;
    expect(c.char).toBe('B');
    expect(c.bold).toBe(true);
    expect(c.italic).toBe(true);
    expect(c.underline).toBe(true);

    // siblingBox: border at (19,1), inner cols 20..37, text "Plain" at col 20 row 2
    expect(grid.get(20, 2)!.char).toBe('P');
    expect(grid.get(20, 2)!.bold).toBe(false);
  });

  it('flex → bordered → flex → bordered → text (4 levels deep)', () => {
    const grid = new CharGrid(50, 12);
    const hitTest = new HitTestBuffer(50, 12);

    const flex1 = mockNode(1, 'div', 0, 0, 50, 10, null, { display: 'flex' });
    const border1 = mockNode(2, 'div', 0, 0, 30, 10, null, borderedStyle);
    const flex2 = mockNode(3, 'div', 1, 1, 28, 8, null, { display: 'flex' });
    const border2 = mockNode(4, 'div', 1, 1, 14, 8, null, borderedStyle);
    const deepText = mockNode(5, 'div', 2, 2, 12, 1, 'L4');
    deepText.isTextNode = true;
    const sideText = mockNode(6, 'div', 15, 1, 13, 8, null, borderedStyle);
    const sideContent = mockNode(7, 'div', 16, 2, 11, 1, 'Side');
    sideContent.isTextNode = true;

    linkParent(border2, deepText);
    linkParent(sideText, sideContent);
    linkParent(flex2, border2, sideText);
    linkParent(border1, flex2);
    linkParent(flex1, border1);
    const root = mockNode(0, 'div', 0, 0, 50, 12);
    linkParent(root, flex1);

    makeRasterizer().rasterize(root, grid, hitTest);

    expect(grid.toString()).toContain('L4');
    expect(grid.toString()).toContain('Side');
    expect(grid.get(2, 2)!.char).toBe('L');
    expect(grid.get(16, 2)!.char).toBe('S');
  });
});

// ——————————————————————————————————————————————
// Mixed siblings
// ——————————————————————————————————————————————

describe('Mixed siblings', () => {
  it('bordered sibling + plain sibling stacked vertically', () => {
    const grid = new CharGrid(30, 8);
    const hitTest = new HitTestBuffer(30, 8);

    const bordered = mockNode(2, 'div', 0, 0, 20, 3, 'Boxed', borderedStyle);
    const plain = mockNode(3, 'div', 0, 3, 20, 1, 'Bare');
    plain.pixelRect = { x: 0, y: 42, width: 200, height: 14 };

    const root = mockNode(1, 'div', 0, 0, 30, 8);
    linkParent(root, bordered, plain);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('Boxed');
    expect(output).toContain('Bare');
    expect(grid.get(0, 0)!.char).toBe('┌');
    // "Bare" should be below the bordered box
    const lines = output.split('\n');
    const boxedLine = lines.findIndex(l => l.includes('Boxed'));
    const bareLine = lines.findIndex(l => l.includes('Bare'));
    expect(bareLine).toBeGreaterThan(boxedLine);
  });

  it('three inline text nodes: normal + bold + italic (each style only on its span)', () => {
    const grid = new CharGrid(40, 3);
    const hitTest = new HitTestBuffer(40, 3);

    const t1 = mockNode(3, 'span', 0, 0, 4, 1, 'aaa ');
    t1.isTextNode = true;
    const t2 = mockNode(4, 'span', 4, 0, 4, 1, 'bbb ');
    t2.isTextNode = true;
    t2.style = mockStyle({ fontWeight: '700' });
    const t3 = mockNode(5, 'span', 8, 0, 4, 1, 'ccc ');
    t3.isTextNode = true;
    t3.style = mockStyle({ fontStyle: 'italic' });

    const parent = mockNode(2, 'div', 0, 0, 40, 1);
    linkParent(parent, t1, t2, t3);
    const root = mockNode(1, 'div', 0, 0, 40, 3);
    linkParent(root, parent);

    makeRasterizer().rasterize(root, grid, hitTest);

    // normal
    expect(grid.get(0, 0)!.bold).toBe(false);
    expect(grid.get(0, 0)!.italic).toBe(false);
    // bold
    expect(grid.get(4, 0)!.bold).toBe(true);
    expect(grid.get(4, 0)!.italic).toBe(false);
    // italic
    expect(grid.get(8, 0)!.bold).toBe(false);
    expect(grid.get(8, 0)!.italic).toBe(true);
  });

  it('centered sibling + right-aligned sibling stacked in bordered parent', () => {
    const grid = new CharGrid(30, 8);
    const hitTest = new HitTestBuffer(30, 8);

    const parent = mockNode(1, 'div', 0, 0, 24, 7, null, borderedStyle);
    // inner cols 1..22 (width 22)
    const centered = mockNode(2, 'div', 1, 1, 22, 1, 'Mid', { textAlign: 'center' });
    const righted = mockNode(3, 'div', 1, 2, 22, 1, 'End', { textAlign: 'right' });
    righted.pixelRect = { x: 10, y: 28, width: 220, height: 14 };
    linkParent(parent, centered, righted);
    const root = mockNode(0, 'div', 0, 0, 30, 8);
    linkParent(root, parent);

    makeRasterizer().rasterize(root, grid, hitTest);

    // centered: 1 + floor((22-3)/2) = 1+9 = 10
    expect(grid.get(10, 1)!.char).toBe('M');
    // right: 1 + (22-3) = 20
    expect(grid.get(20, 2)!.char).toBe('E');
  });

  it('empty bordered div between two text divs — does not swallow text', () => {
    const grid = new CharGrid(30, 10);
    const hitTest = new HitTestBuffer(30, 10);

    const top = mockNode(2, 'div', 0, 0, 20, 1, 'Above');
    top.pixelRect = { x: 0, y: 0, width: 200, height: 14 };
    const empty = mockNode(3, 'div', 0, 1, 20, 3, null, borderedStyle);
    empty.pixelRect = { x: 0, y: 14, width: 200, height: 42 };
    const bottom = mockNode(4, 'div', 0, 4, 20, 1, 'Below');
    bottom.pixelRect = { x: 0, y: 56, width: 200, height: 14 };

    const root = mockNode(1, 'div', 0, 0, 30, 10);
    linkParent(root, top, empty, bottom);

    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('Above');
    expect(output).toContain('Below');
    expect(output).toContain('┌'); // empty box still draws border
    const lines = output.split('\n');
    expect(lines.findIndex(l => l.includes('Above'))).toBeLessThan(
      lines.findIndex(l => l.includes('Below')),
    );
  });
});

// ——————————————————————————————————————————————
// Text wrapping inside constrained containers
// ——————————————————————————————————————————————

describe('Text wrapping in narrow containers', () => {
  it('long text wraps inside a narrow bordered box', () => {
    const grid = new CharGrid(20, 8);
    const hitTest = new HitTestBuffer(20, 8);
    // bordered width 12 → inner 10, text "hello world foo" should wrap
    const node = mockNode(1, 'div', 0, 0, 12, 5, 'hello world foo', borderedStyle);
    const root = mockNode(0, 'div', 0, 0, 20, 8);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    const output = grid.toString();
    expect(output).toContain('hello');
    expect(output).toContain('world foo');
  });

  it('bold wrapping text preserves bold flag on every line', () => {
    const grid = new CharGrid(20, 6);
    const hitTest = new HitTestBuffer(20, 6);
    // width 10, text "aaaa bbbb cccc" bold → wraps to 2 lines
    const node = mockNode(1, 'div', 0, 0, 10, 3, 'aaaa bbbb cccc', { fontWeight: '700' });
    const root = mockNode(0, 'div', 0, 0, 20, 6);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);

    // first line
    expect(grid.get(0, 0)!.char).toBe('a');
    expect(grid.get(0, 0)!.bold).toBe(true);
    // second line
    expect(grid.get(0, 1)!.bold).toBe(true);
  });
});

// ——————————————————————————————————————————————
// Flex containers with styled children
// ——————————————————————————————————————————————

describe('Flex containers with styled children', () => {
  it('flex children each have different styles — flags isolated per child', () => {
    const grid = new CharGrid(40, 5);
    const hitTest = new HitTestBuffer(40, 5);

    const flex = mockNode(1, 'div', 0, 0, 30, 3, null, { display: 'flex' });
    const c1 = mockNode(2, 'div', 0, 0, 10, 3, 'AAA', { ...borderedStyle, fontWeight: '700' });
    c1.pixelRect = { x: 0, y: 0, width: 100, height: 42 };
    const c2 = mockNode(3, 'div', 10, 0, 10, 3, 'BBB', { ...borderedStyle, fontStyle: 'italic' });
    c2.pixelRect = { x: 100, y: 0, width: 100, height: 42 };
    const c3 = mockNode(4, 'div', 20, 0, 10, 3, 'CCC', { ...borderedStyle, textDecoration: 'underline' });
    c3.pixelRect = { x: 200, y: 0, width: 100, height: 42 };
    linkParent(flex, c1, c2, c3);
    const root = mockNode(0, 'div', 0, 0, 40, 5);
    linkParent(root, flex);

    makeRasterizer().rasterize(root, grid, hitTest);

    // c1 inner at (1,1) — bold only
    expect(grid.get(1, 1)!.bold).toBe(true);
    expect(grid.get(1, 1)!.italic).toBe(false);
    expect(grid.get(1, 1)!.underline).toBe(false);
    // c2 inner at (11,1) — italic only
    expect(grid.get(11, 1)!.italic).toBe(true);
    expect(grid.get(11, 1)!.bold).toBe(false);
    expect(grid.get(11, 1)!.underline).toBe(false);
    // c3 inner at (21,1) — underline only
    expect(grid.get(21, 1)!.underline).toBe(true);
    expect(grid.get(21, 1)!.bold).toBe(false);
    expect(grid.get(21, 1)!.italic).toBe(false);
  });

  it('flex with each child centered — text in correct positions', () => {
    const grid = new CharGrid(40, 5);
    const hitTest = new HitTestBuffer(40, 5);

    const flex = mockNode(1, 'div', 0, 0, 30, 3, null, { display: 'flex' });
    const c1 = mockNode(2, 'div', 0, 0, 15, 3, 'L', { ...borderedStyle, textAlign: 'center' });
    c1.pixelRect = { x: 0, y: 0, width: 150, height: 42 };
    const c2 = mockNode(3, 'div', 15, 0, 15, 3, 'R', { ...borderedStyle, textAlign: 'center' });
    c2.pixelRect = { x: 150, y: 0, width: 150, height: 42 };
    linkParent(flex, c1, c2);
    const root = mockNode(0, 'div', 0, 0, 40, 5);
    linkParent(root, flex);

    makeRasterizer().rasterize(root, grid, hitTest);

    // c1: inner cols 1..13 (width 13), "L" center → 1+floor((13-1)/2) = 7
    expect(grid.get(7, 1)!.char).toBe('L');
    // c2: inner cols 16..28 (width 13), "R" center → 16+floor((13-1)/2) = 22
    expect(grid.get(22, 1)!.char).toBe('R');
  });
});

// ——————————————————————————————————————————————
// Mega Combo — the kitchen sink
// ——————————————————————————————————————————————
//
// Layout (60 cols × 25 rows):
//
// ┌──────────────────────────────────────────────────────────┐ outer border
// │    SHOWCASE (bold+underline, centered)                   │ row 1
// │ ┌──────────────────────────┐┌───────────────────────────┐│ row 2  flex
// │ │ ┌────────────────────┐   ││      Right Bold           ││ row 3
// │ │ │ B+I+U Centered     │   ││ italic underline text     ││ row 4
// │ │ └────────────────────┘   ││ ┌───────────────────────┐ ││ row 5
// │ │ normal left              ││ │ ┌───────────────────┐ │ ││ row 6
// │ │ bold left                ││ │ │   4-DEEP (center) │ │ ││ row 7
// │ │ underline left           ││ │ └───────────────────┘ │ ││ row 8
// │ └──────────────────────────┘│ └───────────────────────┘ ││ row 9
// │                              └───────────────────────────┘│ row 10
// │ ┌──────┐┌──────────────┐┌──────┐                         │ row 11 3-col flex
// │ │  AA  ││  BBBBBB      ││  CC  │                         │ row 12
// │ └──────┘└──────────────┘└──────┘                         │ row 13
// │   wrapped text that goes over multiple lines in narrow   │ row 14-15
// │ END (bold+italic+underline, right-aligned)               │ row 16
// └──────────────────────────────────────────────────────────┘ row 17

describe('Mega Combo — kitchen sink', () => {
  it('renders a massive hierarchy and every assertion holds', () => {
    const W = 60, H = 25;
    const grid = new CharGrid(W, H);
    const hitTest = new HitTestBuffer(W, H);

    // ——— Layer 0: outer bordered container ———
    const outer = mockNode(1, 'div', 0, 0, W, 18, null, borderedStyle);

    // ——— Row A: title — centered bold+underline ———
    const title = mockNode(10, 'div', 1, 1, W - 2, 1, 'SHOWCASE', {
      textAlign: 'center', fontWeight: '700', textDecoration: 'underline',
    });

    // ——— Row B: two-column flex (row 2–10) ———
    const flex1 = mockNode(20, 'div', 1, 2, W - 2, 9, null, { display: 'flex' });

    //  Left column (bordered, 28 wide)
    const leftCol = mockNode(30, 'div', 1, 2, 28, 8, null, borderedStyle);

    //    Nested bordered box inside left col with centered B+I+U text
    //    leftCol inner: cols 2..27 (width 26), rows 3..8
    const nestedBox = mockNode(31, 'div', 2, 3, 22, 3, 'B+I+U Centered', {
      ...borderedStyle, textAlign: 'center',
      fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
    });
    //    Plain text siblings below nested box
    const normalLine = mockNode(32, 'div', 2, 6, 26, 1, 'normal left');
    normalLine.pixelRect = { x: 20, y: 84, width: 260, height: 14 };
    const boldLine = mockNode(33, 'div', 2, 7, 26, 1, 'bold left', { fontWeight: '700' });
    boldLine.pixelRect = { x: 20, y: 98, width: 260, height: 14 };
    const underlineLine = mockNode(34, 'div', 2, 8, 26, 1, 'underline left', { textDecoration: 'underline' });
    underlineLine.pixelRect = { x: 20, y: 112, width: 260, height: 14 };

    linkParent(leftCol, nestedBox, normalLine, boldLine, underlineLine);

    //  Right column (bordered, 29 wide)
    const rightCol = mockNode(40, 'div', 29, 2, 29, 9, null, borderedStyle);

    //    Right-aligned bold at top
    const rightBold = mockNode(41, 'div', 30, 3, 27, 1, 'Right Bold', {
      textAlign: 'right', fontWeight: '700',
    });
    //    italic + underline line
    const italUnder = mockNode(42, 'div', 30, 4, 27, 1, 'italic underline text', {
      fontStyle: 'italic', textDecoration: 'underline',
    });
    italUnder.pixelRect = { x: 300, y: 56, width: 270, height: 14 };

    //    Doubly nested bordered inside right col (4 layers deep from outer)
    //    rightCol inner: cols 30..56 (width 27)
    const deep1 = mockNode(43, 'div', 30, 5, 25, 5, null, borderedStyle);
    const deep2 = mockNode(44, 'div', 31, 6, 23, 3, null, borderedStyle);
    const deepText = mockNode(45, 'div', 32, 7, 21, 1, '4-DEEP', {
      textAlign: 'center', fontWeight: '700',
    });
    linkParent(deep2, deepText);
    linkParent(deep1, deep2);

    linkParent(rightCol, rightBold, italUnder, deep1);

    linkParent(flex1, leftCol, rightCol);

    // ——— Row C: three-column flex (row 11–13) ———
    const flex2 = mockNode(50, 'div', 1, 11, W - 2, 3, null, { display: 'flex' });
    const colA = mockNode(51, 'div', 1, 11, 8, 3, 'AA', { ...borderedStyle, textAlign: 'center' });
    colA.pixelRect = { x: 10, y: 154, width: 80, height: 42 };
    const colB = mockNode(52, 'div', 9, 11, 16, 3, 'BBBBBB', { ...borderedStyle, textAlign: 'center' });
    colB.pixelRect = { x: 90, y: 154, width: 160, height: 42 };
    const colC = mockNode(53, 'div', 25, 11, 8, 3, 'CC', { ...borderedStyle, textAlign: 'center' });
    colC.pixelRect = { x: 250, y: 154, width: 80, height: 42 };
    linkParent(flex2, colA, colB, colC);

    // ——— Row D: long wrapping text (row 14–15), bold, narrow width ———
    const wrapping = mockNode(60, 'div', 1, 14, 30, 2, 'wrapped text that goes over multiple lines in narrow', {
      fontWeight: '700',
    });
    wrapping.pixelRect = { x: 10, y: 196, width: 300, height: 28 };

    // ——— Row E: footer — bold+italic+underline, right-aligned ———
    const endLine = mockNode(70, 'div', 1, 16, W - 2, 1, 'END', {
      textAlign: 'right',
      fontWeight: '700', fontStyle: 'italic', textDecoration: 'underline',
    });
    endLine.pixelRect = { x: 10, y: 224, width: 580, height: 14 };

    linkParent(outer, title, flex1, flex2, wrapping, endLine);

    const root = mockNode(0, 'div', 0, 0, W, H);
    linkParent(root, outer);

    // ——— Rasterize ———
    makeRasterizer().rasterize(root, grid, hitTest);
    const output = grid.toString();

    // ========== STRUCTURAL ==========

    // Outer border
    expect(grid.get(0, 0)!.char).toBe('┌');
    expect(grid.get(W - 1, 0)!.char).toBe('┐');

    // Left col border
    expect(grid.get(1, 2)!.char).toBe('┌');
    // Right col border
    expect(grid.get(29, 2)!.char).toBe('┌');

    // ========== TITLE: centered bold+underline ==========
    // inner width 58, "SHOWCASE" len=8, center → 1 + floor((58-8)/2) = 26
    const titleStart = 1 + Math.floor((58 - 8) / 2);
    expect(grid.get(titleStart, 1)!.char).toBe('S');
    expect(grid.get(titleStart, 1)!.bold).toBe(true);
    expect(grid.get(titleStart, 1)!.underline).toBe(true);
    expect(grid.get(titleStart, 1)!.italic).toBe(false);

    // ========== NESTED BOX: centered B+I+U ==========
    // nestedBox at (2,3) 22×3, inner cols 3..20 (width 20)
    // "B+I+U Centered" len=14, center → 3 + floor((20-14)/2) = 3+3 = 6
    const biuStart = 3 + Math.floor((20 - 14) / 2);
    const biuCell = grid.get(biuStart, 4)!;
    expect(biuCell.char).toBe('B');
    expect(biuCell.bold).toBe(true);
    expect(biuCell.italic).toBe(true);
    expect(biuCell.underline).toBe(true);
    // space inside "B+I+U Centered" (at index 5) also has all three
    const biuSpace = grid.get(biuStart + 5, 4)!;
    expect(biuSpace.char).toBe(' ');
    expect(biuSpace.bold).toBe(true);
    expect(biuSpace.italic).toBe(true);
    expect(biuSpace.underline).toBe(true);
    // cell before text start must NOT have styles
    expect(grid.get(biuStart - 1, 4)!.bold).toBe(false);

    // ========== LEFT COL SIBLINGS: each style isolated ==========
    // normalLine at (2,6)
    expect(grid.get(2, 6)!.char).toBe('n');
    expect(grid.get(2, 6)!.bold).toBe(false);
    expect(grid.get(2, 6)!.italic).toBe(false);
    expect(grid.get(2, 6)!.underline).toBe(false);
    // boldLine at (2,7)
    expect(grid.get(2, 7)!.char).toBe('b');
    expect(grid.get(2, 7)!.bold).toBe(true);
    expect(grid.get(2, 7)!.italic).toBe(false);
    // underlineLine at (2,8)
    expect(grid.get(2, 8)!.char).toBe('u');
    expect(grid.get(2, 8)!.underline).toBe(true);
    expect(grid.get(2, 8)!.bold).toBe(false);
    // space in "underline left" at index 9
    expect(grid.get(2 + 9, 8)!.char).toBe(' ');
    expect(grid.get(2 + 9, 8)!.underline).toBe(true);

    // ========== RIGHT COL: right-aligned bold ==========
    // rightCol inner cols 30..56 (width 27), "Right Bold" len=10, right → 30+(27-10)=47
    const rbStart = 30 + (27 - 10);
    expect(grid.get(rbStart, 3)!.char).toBe('R');
    expect(grid.get(rbStart, 3)!.bold).toBe(true);
    expect(grid.get(rbStart - 1, 3)!.bold).toBe(false);

    // ========== RIGHT COL: italic+underline ==========
    expect(grid.get(30, 4)!.char).toBe('i');
    expect(grid.get(30, 4)!.italic).toBe(true);
    expect(grid.get(30, 4)!.underline).toBe(true);
    expect(grid.get(30, 4)!.bold).toBe(false);
    // space in "italic underline text"
    expect(grid.get(30 + 6, 4)!.char).toBe(' ');
    expect(grid.get(30 + 6, 4)!.italic).toBe(true);
    expect(grid.get(30 + 6, 4)!.underline).toBe(true);

    // ========== 4 LAYERS DEEP: centered bold ==========
    // deep2 at (31,6) 23×3, inner cols 32..52 (width 21)
    // "4-DEEP" len=6, center → 32 + floor((21-6)/2) = 32+7 = 39
    const deepStart = 32 + Math.floor((21 - 6) / 2);
    expect(grid.get(deepStart, 7)!.char).toBe('4');
    expect(grid.get(deepStart, 7)!.bold).toBe(true);
    expect(grid.get(deepStart, 7)!.italic).toBe(false);

    // ========== 3-COL FLEX: each centered in its bordered cell ==========
    // colA at (1,11) 8×3, inner 2..6 (width 6), "AA" → 2+floor((6-2)/2)=4
    expect(grid.get(4, 12)!.char).toBe('A');
    // colB at (9,11) 16×3, inner 10..23 (width 14), "BBBBBB" → 10+floor((14-6)/2)=14
    expect(grid.get(14, 12)!.char).toBe('B');
    // colC at (25,11) 8×3, inner 26..31 (width 6), "CC" → 26+floor((6-2)/2)=28
    expect(grid.get(28, 12)!.char).toBe('C');

    // ========== WRAPPING TEXT: bold on every wrapped line ==========
    expect(grid.get(1, 14)!.bold).toBe(true);
    // second line should also be bold (if text wraps)
    if (grid.get(1, 15)!.char !== ' ') {
      expect(grid.get(1, 15)!.bold).toBe(true);
    }

    // ========== FOOTER: right-aligned bold+italic+underline ==========
    // inner width 58, "END" len=3, right → 1+(58-3)=56
    const endStart = 1 + (58 - 3);
    expect(grid.get(endStart, 16)!.char).toBe('E');
    expect(grid.get(endStart, 16)!.bold).toBe(true);
    expect(grid.get(endStart, 16)!.italic).toBe(true);
    expect(grid.get(endStart, 16)!.underline).toBe(true);
    // cell before END should NOT have styling
    expect(grid.get(endStart - 1, 16)!.bold).toBe(false);

    // ========== ALL TEXT PRESENT ==========
    for (const s of [
      'SHOWCASE', 'B+I+U Centered', 'normal left', 'bold left', 'underline left',
      'Right Bold', 'italic underline text', '4-DEEP',
      'AA', 'BBBBBB', 'CC', 'END',
    ]) {
      expect(output).toContain(s);
    }
  });
});

// ===========================================================================
// COLOR PASSTHROUGH
// ===========================================================================
describe('Color passthrough', () => {
  it('text fg color is stored in grid cells', () => {
    const grid = new CharGrid(20, 3);
    const hitTest = new HitTestBuffer(20, 3);
    const node = mockNode(1, 'div', 0, 0, 20, 3, 'Hello', mockStyle({ color: 'rgb(255, 0, 0)' }));
    const root = mockNode(0, 'div', 0, 0, 20, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);
    const cell = grid.get(0, 0)!;
    expect(cell.char).toBe('H');
    expect(cell.fg).toBe('rgb(255, 0, 0)');
  });

  it('background color is filled in grid cells', () => {
    const grid = new CharGrid(20, 3);
    const hitTest = new HitTestBuffer(20, 3);
    const node = mockNode(1, 'div', 0, 0, 10, 3, 'Hi', mockStyle({
      backgroundColor: 'rgb(0, 0, 255)',
    }));
    const root = mockNode(0, 'div', 0, 0, 20, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);
    // Background should be filled across the entire div area
    expect(grid.get(0, 0)!.bg).toBe('rgb(0, 0, 255)');
    expect(grid.get(5, 1)!.bg).toBe('rgb(0, 0, 255)');
    // Outside the div area — default bg
    expect(grid.get(15, 0)!.bg).not.toBe('rgb(0, 0, 255)');
  });

  it('border color comes from borderTopColor (or per-side color)', () => {
    const grid = new CharGrid(10, 5);
    const hitTest = new HitTestBuffer(10, 5);
    const node = mockNode(1, 'div', 0, 0, 10, 5, null, mockStyle({
      ...borderedStyle,
      borderTopColor: 'rgb(255, 0, 0)',
      borderBottomColor: 'rgb(0, 255, 0)',
      borderLeftColor: 'rgb(0, 0, 255)',
      borderRightColor: 'rgb(255, 255, 0)',
    }));
    const root = mockNode(0, 'div', 0, 0, 10, 5);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);
    // Top border
    expect(grid.get(3, 0)!.fg).toBe('rgb(255, 0, 0)');
    // Bottom border
    expect(grid.get(3, 4)!.fg).toBe('rgb(0, 255, 0)');
    // Left border
    expect(grid.get(0, 2)!.fg).toBe('rgb(0, 0, 255)');
    // Right border
    expect(grid.get(9, 2)!.fg).toBe('rgb(255, 255, 0)');
  });

  it('text color + bg color + border color all coexist', () => {
    const grid = new CharGrid(20, 5);
    const hitTest = new HitTestBuffer(20, 5);
    const parent = mockNode(1, 'div', 0, 0, 20, 5, null, mockStyle({
      ...borderedStyle,
      borderTopColor: 'rgb(100, 100, 100)',
      borderBottomColor: 'rgb(100, 100, 100)',
      borderLeftColor: 'rgb(100, 100, 100)',
      borderRightColor: 'rgb(100, 100, 100)',
      backgroundColor: 'rgb(30, 30, 30)',
    }));
    const child = mockNode(2, 'div', 1, 1, 18, 1, 'Colorful', mockStyle({
      color: 'rgb(0, 255, 128)',
    }));
    child.pixelRect = { x: 10, y: 14, width: 180, height: 14 };
    linkParent(parent, child);
    const root = mockNode(0, 'div', 0, 0, 20, 5);
    linkParent(root, parent);
    makeRasterizer().rasterize(root, grid, hitTest);
    // Border color
    expect(grid.get(5, 0)!.fg).toBe('rgb(100, 100, 100)');
    // Background
    expect(grid.get(1, 1)!.bg).toBe('rgb(30, 30, 30)');
    // Text color
    expect(grid.get(1, 1)!.fg).toBe('rgb(0, 255, 128)');
    expect(grid.get(1, 1)!.char).toBe('C');
  });

  it('transparent backgroundColor does not override default', () => {
    const grid = new CharGrid(10, 3);
    const hitTest = new HitTestBuffer(10, 3);
    const node = mockNode(1, 'div', 0, 0, 10, 3, 'X', mockStyle({
      backgroundColor: 'rgba(0, 0, 0, 0)',
    }));
    const root = mockNode(0, 'div', 0, 0, 10, 3);
    linkParent(root, node);
    makeRasterizer().rasterize(root, grid, hitTest);
    // Default bg (from createEmptyCell) should remain
    const defaultBg = grid.get(5, 2)!.bg;
    expect(defaultBg).not.toBe('rgba(0, 0, 0, 0)');
  });
});
