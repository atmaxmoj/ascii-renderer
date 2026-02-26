import { describe, it, expect } from 'vitest';
import { CharGrid } from '../../src/display/CharGrid.js';
import { ElementRenderers } from '../../src/rasterizer/ElementRenderers.js';
import { Rasterizer } from '../../src/rasterizer/Rasterizer.js';
import { OverlayManager } from '../../src/rasterizer/OverlayManager.js';
import { HitTestBuffer } from '../../src/events/HitTestBuffer.js';
import { LayoutNode, ComputedStyleInfo } from '../../src/types.js';

/** Create a minimal mock LayoutNode for testing */
function mockNode(overrides: Partial<LayoutNode> & { tagName: string }): LayoutNode {
  const mockElement = {
    tagName: overrides.tagName.toUpperCase(),
    getAttribute: (name: string) => (overrides as any)._attrs?.[name] ?? null,
    hasAttribute: (name: string) => (overrides as any)._attrs?.[name] !== undefined,
    value: (overrides as any)._value ?? '',
    checked: (overrides as any)._checked ?? false,
    options: (overrides as any)._options ?? [],
    selectedIndex: (overrides as any)._selectedIndex ?? 0,
  } as unknown as Element;

  const defaultStyle: ComputedStyleInfo = {
    display: 'block', position: 'static', overflow: 'visible',
    overflowX: 'visible', overflowY: 'visible', zIndex: 'auto',
    opacity: '1', transform: 'none', visibility: 'visible',
    color: '#c0c0c0', backgroundColor: 'rgba(0, 0, 0, 0)',
    fontWeight: '400', fontStyle: 'normal', textDecoration: 'none',
    textAlign: 'left', borderTopStyle: 'none', borderRightStyle: 'none',
    borderBottomStyle: 'none', borderLeftStyle: 'none',
    borderTopWidth: '0px', borderRightWidth: '0px',
    borderBottomWidth: '0px', borderLeftWidth: '0px',
    borderTopColor: '', borderRightColor: '', borderBottomColor: '',
    borderLeftColor: '', cursor: 'default', whiteSpace: 'normal',
    textOverflow: 'clip',
  };

  return {
    id: overrides.id ?? 1,
    element: mockElement,
    tagName: overrides.tagName,
    pixelRect: { x: 0, y: 0, width: 0, height: 0 },
    charRect: overrides.charRect ?? { col: 0, row: 0, width: 10, height: 1 },
    style: { ...defaultStyle, ...overrides.style },
    textContent: overrides.textContent ?? null,
    children: [],
    parent: null,
    isTextNode: false,
    isEscaped: false,
    stackingOrder: 0,
  };
}

describe('ElementRenderers', () => {
  const renderer = new ElementRenderers();

  describe('button', () => {
    it('renders full button text "[ Label ]"', () => {
      const grid = new CharGrid(40, 3);
      const node = mockNode({
        tagName: 'button',
        charRect: { col: 0, row: 0, width: 7, height: 1 },
        textContent: 'Submit',
      });
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[ Submit ]');
    });

    it('renders button even when charRect is narrower than ASCII text', () => {
      const grid = new CharGrid(40, 3);
      const node = mockNode({
        tagName: 'button',
        charRect: { col: 0, row: 0, width: 4, height: 1 },
        textContent: 'Cancel',
      });
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[ Cancel ]');
    });
  });

  describe('input[checkbox]', () => {
    it('renders checked checkbox as [✓]', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'checkbox' },
        _checked: true,
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[✓]');
    });

    it('renders unchecked checkbox as [ ]', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'checkbox' },
        _checked: false,
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[ ]');
    });
  });

  describe('input[radio]', () => {
    it('renders selected radio as (●)', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'radio' },
        _checked: true,
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('(●)');
    });

    it('renders unselected radio as ( )', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'radio' },
        _checked: false,
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('( )');
    });
  });

  describe('input[text]', () => {
    it('renders text input with value', () => {
      const grid = new CharGrid(40, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'text' },
        _value: 'hello',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('[hello');
      expect(text).toContain(']');
    });

    it('pads empty input with underscores', () => {
      const grid = new CharGrid(40, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'text' },
        _value: '',
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[__________]');
    });
  });

  describe('input[password]', () => {
    it('masks password with dots', () => {
      const grid = new CharGrid(40, 1);
      const node = mockNode({
        tagName: 'input',
        _attrs: { type: 'password' },
        _value: 'secret',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('••••••');
      expect(text).not.toContain('secret');
    });
  });

  describe('hr', () => {
    it('renders horizontal rule', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'hr',
        charRect: { col: 0, row: 0, width: 10, height: 1 },
      });
      renderer.render(node, grid);
      expect(grid.toString()).toBe('──────────');
    });
  });

  describe('input[range]', () => {
    it('renders range slider with track and thumb', () => {
      const grid = new CharGrid(30, 1);
      const node = mockNode({
        tagName: 'input',
        charRect: { col: 0, row: 0, width: 20, height: 1 },
        _attrs: { type: 'range', min: '0', max: '100' },
        _value: '50',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      // Should contain track markers and thumb
      expect(text).toContain('◄');
      expect(text).toContain('►');
      expect(text).toContain('█');
      expect(text).toContain('═');
    });

    it('renders thumb at start for min value', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        charRect: { col: 0, row: 0, width: 14, height: 1 },
        _attrs: { type: 'range', min: '0', max: '100' },
        _value: '0',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      // Thumb should be at the start of the track (right after ◄)
      const leftArrow = text.indexOf('◄');
      const thumb = text.indexOf('█');
      expect(thumb).toBe(leftArrow + 1);
    });

    it('renders thumb at end for max value', () => {
      const grid = new CharGrid(20, 1);
      const node = mockNode({
        tagName: 'input',
        charRect: { col: 0, row: 0, width: 14, height: 1 },
        _attrs: { type: 'range', min: '0', max: '100' },
        _value: '100',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      // Thumb should be at the end of the track (right before ►)
      const rightArrow = text.indexOf('►');
      const thumb = text.indexOf('█');
      expect(thumb).toBe(rightArrow - 1);
    });
  });

  describe('select', () => {
    it('renders select with selected option text', () => {
      const grid = new CharGrid(30, 1);
      const node = mockNode({
        tagName: 'select',
        charRect: { col: 0, row: 0, width: 20, height: 1 },
        _options: [
          { text: 'United States' },
          { text: 'Canada' },
          { text: 'UK' },
        ],
        _selectedIndex: 0,
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('[United States');
      expect(text).toContain('▼]');
    });

    it('renders select with second option selected', () => {
      const grid = new CharGrid(30, 1);
      const node = mockNode({
        tagName: 'select',
        charRect: { col: 0, row: 0, width: 20, height: 1 },
        _options: [
          { text: 'A' },
          { text: 'B' },
          { text: 'C' },
        ],
        _selectedIndex: 1,
      } as any);
      renderer.render(node, grid);
      expect(grid.toString()).toContain('[B ▼]');
    });
  });

  describe('textarea', () => {
    it('renders textarea with box and content', () => {
      const grid = new CharGrid(30, 6);
      const node = mockNode({
        tagName: 'textarea',
        charRect: { col: 0, row: 0, width: 25, height: 5 },
        _value: 'Hello\nWorld',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      // Should have box border with resize handle at bottom-right
      expect(text).toContain('┌');
      expect(text).toContain('└');
      expect(text).toContain('◢');
      // Should have text content inside
      expect(text).toContain('Hello');
      expect(text).toContain('World');
    });

    it('renders empty textarea with box', () => {
      const grid = new CharGrid(30, 6);
      const node = mockNode({
        tagName: 'textarea',
        charRect: { col: 0, row: 0, width: 25, height: 5 },
        _value: '',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('┌');
      expect(text).toContain('└');
      expect(text).toContain('◢');
    });

    it('renders multiline content correctly', () => {
      const grid = new CharGrid(30, 6);
      const node = mockNode({
        tagName: 'textarea',
        charRect: { col: 0, row: 0, width: 25, height: 5 },
        _value: 'Line 1\nLine 2\nLine 3',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('Line 1');
      expect(text).toContain('Line 2');
      expect(text).toContain('Line 3');
    });
  });

  describe('input[number]', () => {
    it('renders number input with up/down arrows suffix', () => {
      const grid = new CharGrid(30, 1);
      const node = mockNode({
        tagName: 'input',
        charRect: { col: 0, row: 0, width: 15, height: 1 },
        _attrs: { type: 'number' },
        _value: '42',
      } as any);
      renderer.render(node, grid);
      const text = grid.toString();
      expect(text).toContain('42');
      expect(text).toContain('▲▼');
      expect(text).toContain(']');
    });
  });

  describe('checkbox followed by text label should not overlap', () => {
    it('text node renders after checkbox, not at same position', () => {
      const grid = new CharGrid(30, 1);
      const hitTest = new HitTestBuffer(30, 1);
      const rasterizer = new Rasterizer(new OverlayManager());

      // Simulate: <div><input type="checkbox" checked> Dark mode</div>
      const checkbox = mockNode({
        id: 2,
        tagName: 'input',
        _attrs: { type: 'checkbox' },
        _checked: true,
        charRect: { col: 0, row: 0, width: 3, height: 1 },
      } as any);

      // Text node "Dark mode" positioned after checkbox (col 3)
      const textNode: LayoutNode = {
        id: 3,
        element: checkbox.element,
        tagName: '#text',
        pixelRect: { x: 0, y: 0, width: 0, height: 0 },
        charRect: { col: 3, row: 0, width: 10, height: 1 },
        style: checkbox.style,
        textContent: 'Dark mode',
        children: [],
        parent: null,
        isTextNode: true,
        isEscaped: false,
        stackingOrder: 0,
      };

      const parent = mockNode({
        id: 1,
        tagName: 'div',
        charRect: { col: 0, row: 0, width: 30, height: 1 },
      });
      parent.children = [checkbox, textNode];
      checkbox.parent = parent;
      textNode.parent = parent;

      rasterizer.rasterize(parent, grid, hitTest);

      const text = grid.toString();
      // Checkbox + space + text should render cleanly
      expect(text).toContain('[✓]');
      expect(text).toContain('Dark mode');
      // Verify no overlap: first 3 chars should be checkbox, then text
      expect(text.startsWith('[✓]')).toBe(true);
    });
  });

  describe('list items (li)', () => {
    it('renders bullet marker for ul > li', () => {
      const grid = new CharGrid(30, 3);
      const renderer = new ElementRenderers();

      // ul: padding area left of li
      const ul = mockNode({
        id: 1,
        tagName: 'ul',
        charRect: { col: 0, row: 0, width: 30, height: 3 },
      });
      const li = mockNode({
        id: 2,
        tagName: 'li',
        charRect: { col: 4, row: 0, width: 20, height: 1 },
        textContent: 'First item',
      });
      li.parent = ul;
      ul.children = [li];

      renderer.render(li, grid);
      const text = grid.toString();
      expect(text).toContain('•');
    });

    it('renders numbered marker for ol > li', () => {
      const grid = new CharGrid(30, 3);
      const renderer = new ElementRenderers();

      const ol = mockNode({
        id: 1,
        tagName: 'ol',
        charRect: { col: 0, row: 0, width: 30, height: 3 },
      });
      const li1 = mockNode({
        id: 2,
        tagName: 'li',
        charRect: { col: 4, row: 0, width: 20, height: 1 },
        textContent: 'Step one',
      });
      const li2 = mockNode({
        id: 3,
        tagName: 'li',
        charRect: { col: 4, row: 1, width: 20, height: 1 },
        textContent: 'Step two',
      });
      li1.parent = ol;
      li2.parent = ol;
      ol.children = [li1, li2];

      renderer.render(li1, grid);
      renderer.render(li2, grid);
      const text = grid.toString();
      expect(text).toContain('1.');
      expect(text).toContain('2.');
    });

    it('returns 0 so children still render', () => {
      const renderer = new ElementRenderers();
      const grid = new CharGrid(30, 1);
      const ul = mockNode({ id: 1, tagName: 'ul' });
      const li = mockNode({ id: 2, tagName: 'li', charRect: { col: 4, row: 0, width: 20, height: 1 } });
      li.parent = ul;
      ul.children = [li];
      const result = renderer.render(li, grid);
      expect(result).toBe(0);
    });
  });

  describe('two buttons side by side should not overlap', () => {
    it('rasterizer adjusts sibling positions to prevent overlap', () => {
      const grid = new CharGrid(40, 3);
      const hitTest = new HitTestBuffer(40, 3);
      const rasterizer = new Rasterizer(new OverlayManager());

      // Simulate: parent div containing two buttons with narrow browser widths
      const btn1 = mockNode({
        id: 2,
        tagName: 'button',
        charRect: { col: 0, row: 0, width: 7, height: 1 },
        textContent: 'Submit',
      });
      const btn2 = mockNode({
        id: 3,
        tagName: 'button',
        charRect: { col: 7, row: 0, width: 7, height: 1 },
        textContent: 'Cancel',
      });
      const parent = mockNode({
        id: 1,
        tagName: 'div',
        charRect: { col: 0, row: 0, width: 40, height: 3 },
      });
      parent.children = [btn1, btn2];
      btn1.parent = parent;
      btn2.parent = parent;

      rasterizer.rasterize(parent, grid, hitTest);

      const text = grid.toString();
      expect(text).toContain('[ Submit ]');
      expect(text).toContain('[ Cancel ]');
    });
  });
});
