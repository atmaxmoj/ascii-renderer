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

function linkParent(parent: LayoutNode, ...children: LayoutNode[]) {
  parent.children = children;
  for (const c of children) c.parent = parent;
}

describe('Escape Overlay', () => {
  describe('Rasterizer skips escaped nodes', () => {
    it('does not paint an escaped node onto the grid', () => {
      const grid = new CharGrid(20, 5);
      const hitTestBuffer = new HitTestBuffer(20, 5);
      const rasterizer = new Rasterizer(new OverlayManager());

      const root = mockNode(1, 'div', 0, 0, 20, 5);
      const normalChild = mockNode(2, 'div', 0, 0, 10, 1, 'Normal');
      const escapedChild = mockNode(3, 'div', 0, 1, 10, 1, 'Escaped');
      escapedChild.isEscaped = true;

      linkParent(root, normalChild, escapedChild);

      rasterizer.rasterize(root, grid, hitTestBuffer);

      // Normal child text should appear
      const text = grid.toString();
      expect(text).toContain('Normal');
      // Escaped child text should NOT appear
      expect(text).not.toContain('Escaped');
    });

    it('does not fill hit-test buffer for escaped nodes', () => {
      const grid = new CharGrid(20, 5);
      const hitTestBuffer = new HitTestBuffer(20, 5);
      const rasterizer = new Rasterizer(new OverlayManager());

      const root = mockNode(1, 'div', 0, 0, 20, 5);
      const escapedChild = mockNode(3, 'div', 0, 0, 10, 1, 'Escaped');
      escapedChild.isEscaped = true;

      linkParent(root, escapedChild);

      rasterizer.rasterize(root, grid, hitTestBuffer);

      // Hit-test at the escaped node's area should not map to its id
      const hitId = hitTestBuffer.lookup(2, 0);
      expect(hitId).not.toBe(3);
    });

    it('does not paint children of an escaped node', () => {
      const grid = new CharGrid(20, 5);
      const hitTestBuffer = new HitTestBuffer(20, 5);
      const rasterizer = new Rasterizer(new OverlayManager());

      const root = mockNode(1, 'div', 0, 0, 20, 5);
      const escapedParent = mockNode(2, 'div', 0, 0, 15, 3);
      escapedParent.isEscaped = true;
      // Even though children exist in the node structure, they should be skipped
      const innerChild = mockNode(3, 'div', 1, 1, 10, 1, 'InnerChild');
      linkParent(escapedParent, innerChild);
      linkParent(root, escapedParent);

      rasterizer.rasterize(root, grid, hitTestBuffer);

      const text = grid.toString();
      expect(text).not.toContain('InnerChild');
    });

    it('sibling after escaped node renders normally', () => {
      const grid = new CharGrid(20, 5);
      const hitTestBuffer = new HitTestBuffer(20, 5);
      const rasterizer = new Rasterizer(new OverlayManager());

      const root = mockNode(1, 'div', 0, 0, 20, 5);
      const escapedChild = mockNode(2, 'div', 0, 0, 10, 1, 'Escaped');
      escapedChild.isEscaped = true;
      const normalSibling = mockNode(3, 'div', 0, 1, 10, 1, 'Visible');

      linkParent(root, escapedChild, normalSibling);

      rasterizer.rasterize(root, grid, hitTestBuffer);

      const text = grid.toString();
      expect(text).not.toContain('Escaped');
      expect(text).toContain('Visible');
    });
  });

  describe('LayoutNode isEscaped flag', () => {
    it('defaults to false for regular nodes', () => {
      const node = mockNode(1, 'div', 0, 0, 10, 1);
      expect(node.isEscaped).toBe(false);
    });

    it('can be set to true for escaped nodes', () => {
      const node = mockNode(1, 'div', 0, 0, 10, 1);
      node.isEscaped = true;
      expect(node.isEscaped).toBe(true);
    });
  });
});
