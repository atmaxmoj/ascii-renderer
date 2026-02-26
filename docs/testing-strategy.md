# ASCII Renderer -- Testing Strategy

This document describes the 4-layer testing approach for the ASCII Renderer project,
covering unit tests, snapshot tests, integration tests, and end-to-end tests.

---

## Table of Contents

1. [Testing Pyramid Overview](#testing-pyramid-overview)
2. [Layer 1: Unit Tests](#layer-1-unit-tests)
3. [Layer 2: Snapshot Tests](#layer-2-snapshot-tests)
4. [Layer 3: Integration Tests](#layer-3-integration-tests)
5. [Layer 4: E2E Tests](#layer-4-e2e-tests)
6. [Test Tools and Configuration](#test-tools-and-configuration)
7. [CI Pipeline](#ci-pipeline)

---

## Testing Pyramid Overview

```
                    /\
                   /  \
                  / E2E \          Layer 4: Playwright
                 / Tests \         Canvas interaction tests
                /──────────\       (click, type, scroll, drag)
               /  Integration\     Layer 3: Vitest
              /    Tests      \    Full pipeline verification
             /─────────────────\   (setContent -> toText)
            /  Snapshot Tests   \  Layer 2: Vitest browser mode
           /    (Visual Reg.)    \ HTML -> ASCII text comparison
          /───────────────────────\
         /      Unit Tests         \ Layer 1: Vitest
        /   (Pure Logic Functions)  \ CharGrid, CoordMapper, renderers
       /─────────────────────────────\
```

| Layer | Tool                  | Scope                          | Speed    | Count   |
|-------|-----------------------|--------------------------------|----------|---------|
| 1     | Vitest                | Pure functions, no DOM         | ~1ms/test| ~200+   |
| 2     | Vitest (browser mode) | HTML -> ASCII snapshot         | ~50ms/test| ~100+  |
| 3     | Vitest (browser mode) | Full pipeline end-to-end logic | ~100ms/test| ~50+  |
| 4     | Playwright            | Canvas visual + interaction    | ~500ms/test| ~30+  |

---

## Layer 1: Unit Tests

**Scope:** Pure logic functions with no DOM dependency. These tests run in Node.js
(no browser needed) and are extremely fast.

**What to test:**

| Module            | Test focus                                            |
|-------------------|-------------------------------------------------------|
| `CharGrid`        | Cell read/write, fill, writeText, clip stack, clear   |
| `CoordinateMapper`| px-to-col/row conversion, rounding, edge cases        |
| `BoxRenderer`     | Correct box-drawing characters for each border style  |
| `TextRenderer`    | Word wrapping, truncation, alignment, empty strings   |
| `TableRenderer`   | Grid character selection, colspan/rowspan merging     |
| `ListRenderer`    | Bullet/number generation, nesting levels              |
| `FormRenderer`    | Input field formatting, checkbox/radio chars           |
| `HitTestBuffer`   | Set/get element references, bounds checking           |
| `TextExporter`    | Grid-to-string conversion, trailing space trimming    |
| `ScrollState`     | Scroll clamping, thumb size/position calculation      |

### Example: CharGrid Unit Tests

```typescript
// tests/unit/char-grid.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CharGrid } from '../../src/render/char-grid';

describe('CharGrid', () => {
  let grid: CharGrid;

  beforeEach(() => {
    grid = new CharGrid(10, 5); // 10 cols, 5 rows
  });

  it('should initialize all cells to spaces', () => {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        expect(grid.getCell(col, row).char).toBe(' ');
      }
    }
  });

  it('should write and read a cell', () => {
    grid.setCell(3, 2, {
      char: 'A',
      fg: '#ffffff',
      bg: '#000000',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      element: null,
    });

    expect(grid.getCell(3, 2).char).toBe('A');
    expect(grid.getCell(3, 2).fg).toBe('#ffffff');
  });

  it('should write a text string', () => {
    grid.writeText(2, 1, 'Hello', {
      fg: '#ffffff',
      bg: '#000000',
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
    });

    expect(grid.getCell(2, 1).char).toBe('H');
    expect(grid.getCell(3, 1).char).toBe('e');
    expect(grid.getCell(4, 1).char).toBe('l');
    expect(grid.getCell(5, 1).char).toBe('l');
    expect(grid.getCell(6, 1).char).toBe('o');
  });

  it('should clip text that extends beyond grid bounds', () => {
    grid.writeText(8, 0, 'Hello', {
      fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
    });

    expect(grid.getCell(8, 0).char).toBe('H');
    expect(grid.getCell(9, 0).char).toBe('e');
    // Characters beyond col 9 are discarded
  });

  it('should respect clip regions', () => {
    grid.pushClip({ col: 2, row: 1, width: 5, height: 3 });

    // Inside clip: should write
    grid.setCell(3, 2, { char: 'X', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
      element: null });
    expect(grid.getCell(3, 2).char).toBe('X');

    // Outside clip: should be ignored
    grid.setCell(0, 0, { char: 'Y', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
      element: null });
    expect(grid.getCell(0, 0).char).toBe(' '); // Still space

    grid.popClip();

    // After pop, writing outside former clip should work
    grid.setCell(0, 0, { char: 'Z', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
      element: null });
    expect(grid.getCell(0, 0).char).toBe('Z');
  });

  it('should fill a rectangular region', () => {
    grid.fill({ col: 1, row: 1, width: 3, height: 2 }, {
      char: '#', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
      element: null,
    });

    expect(grid.getCell(1, 1).char).toBe('#');
    expect(grid.getCell(2, 1).char).toBe('#');
    expect(grid.getCell(3, 1).char).toBe('#');
    expect(grid.getCell(1, 2).char).toBe('#');
    expect(grid.getCell(2, 2).char).toBe('#');
    expect(grid.getCell(3, 2).char).toBe('#');
    // Outside fill region: still space
    expect(grid.getCell(0, 0).char).toBe(' ');
  });

  it('should clear the grid', () => {
    grid.setCell(5, 3, { char: 'X', fg: '#fff', bg: '#000',
      bold: false, italic: false, underline: false, strikethrough: false,
      element: null });
    grid.clear();
    expect(grid.getCell(5, 3).char).toBe(' ');
  });
});
```

### Example: CoordinateMapper Unit Tests

```typescript
// tests/unit/coordinate-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { CoordinateMapper } from '../../src/layout/coordinate-mapper';

describe('CoordinateMapper', () => {
  // Cell size: 8px wide, 16px tall (typical monospace)
  const mapper = new CoordinateMapper(8, 16);

  it('should convert pixel X to column', () => {
    expect(mapper.pxToCol(0)).toBe(0);
    expect(mapper.pxToCol(7)).toBe(0);   // still in col 0
    expect(mapper.pxToCol(8)).toBe(1);   // start of col 1
    expect(mapper.pxToCol(12)).toBe(1);  // middle of col 1 -> rounds to 1
    expect(mapper.pxToCol(24)).toBe(3);
  });

  it('should convert pixel Y to row', () => {
    expect(mapper.pxToRow(0)).toBe(0);
    expect(mapper.pxToRow(15)).toBe(0);
    expect(mapper.pxToRow(16)).toBe(1);
    expect(mapper.pxToRow(32)).toBe(2);
  });

  it('should convert pixel rect to grid rect', () => {
    const pxRect = { x: 16, y: 32, width: 80, height: 48 };
    const gridRect = mapper.pxRectToGridRect(pxRect);

    expect(gridRect.col).toBe(2);     // 16 / 8
    expect(gridRect.row).toBe(2);     // 32 / 16
    expect(gridRect.width).toBe(10);  // 80 / 8
    expect(gridRect.height).toBe(3);  // 48 / 16
  });

  it('should handle sub-pixel rounding', () => {
    // 13px -> col 1 (13/8 = 1.625 -> floor to 1)
    expect(mapper.pxToCol(13)).toBe(1);
    // Width: 13px from col 1 -> ~1.6 cols -> rounds to 2
    const rect = mapper.pxRectToGridRect({ x: 8, y: 0, width: 13, height: 16 });
    expect(rect.width).toBe(2); // ceil(13/8)
  });

  it('should convert grid coords back to pixels', () => {
    expect(mapper.colToPx(3)).toBe(24);  // 3 * 8
    expect(mapper.rowToPx(2)).toBe(32);  // 2 * 16
  });
});
```

### Example: BoxRenderer Unit Tests

```typescript
// tests/unit/box-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { BoxRenderer } from '../../src/render/box-renderer';

describe('BoxRenderer', () => {
  it('should return correct characters for solid border', () => {
    const chars = BoxRenderer.getBorderChars('solid');
    expect(chars.topLeft).toBe('\u250c');     // ┌
    expect(chars.topRight).toBe('\u2510');    // ┐
    expect(chars.bottomLeft).toBe('\u2514');  // └
    expect(chars.bottomRight).toBe('\u2518'); // ┘
    expect(chars.horizontal).toBe('\u2500');  // ─
    expect(chars.vertical).toBe('\u2502');    // │
  });

  it('should return correct characters for double border', () => {
    const chars = BoxRenderer.getBorderChars('double');
    expect(chars.topLeft).toBe('\u2554');     // ╔
    expect(chars.topRight).toBe('\u2557');    // ╗
    expect(chars.bottomLeft).toBe('\u255a');  // ╚
    expect(chars.bottomRight).toBe('\u255d'); // ╝
    expect(chars.horizontal).toBe('\u2550');  // ═
    expect(chars.vertical).toBe('\u2551');    // ║
  });

  it('should return correct characters for rounded border', () => {
    const chars = BoxRenderer.getBorderChars('solid', { rounded: true });
    expect(chars.topLeft).toBe('\u256d');     // ╭
    expect(chars.topRight).toBe('\u256e');    // ╮
    expect(chars.bottomLeft).toBe('\u2570');  // ╰
    expect(chars.bottomRight).toBe('\u256f'); // ╯
  });
});
```

### Example: Text Wrapping Unit Tests

```typescript
// tests/unit/text-renderer.test.ts
import { describe, it, expect } from 'vitest';
import { TextRenderer } from '../../src/render/text-renderer';

describe('TextRenderer.wrapText', () => {
  it('should wrap text at word boundaries', () => {
    const lines = TextRenderer.wrapText('The quick brown fox jumps', 10);
    expect(lines).toEqual([
      'The quick',
      'brown fox',
      'jumps',
    ]);
  });

  it('should break long words that exceed width', () => {
    const lines = TextRenderer.wrapText('Supercalifragilistic', 10);
    expect(lines).toEqual([
      'Supercalif',
      'ragilistic',
    ]);
  });

  it('should handle empty string', () => {
    const lines = TextRenderer.wrapText('', 10);
    expect(lines).toEqual(['']);
  });

  it('should preserve explicit newlines', () => {
    const lines = TextRenderer.wrapText('Line 1\nLine 2', 20);
    expect(lines).toEqual(['Line 1', 'Line 2']);
  });

  it('should right-align text', () => {
    const line = TextRenderer.alignText('Hello', 10, 'right');
    expect(line).toBe('     Hello');
  });

  it('should center text', () => {
    const line = TextRenderer.alignText('Hi', 10, 'center');
    expect(line).toBe('    Hi    ');
  });
});
```

---

## Layer 2: Snapshot Tests

**Scope:** Feed HTML input into the renderer and compare the ASCII text output
against stored snapshots. These tests require a browser environment (to compute
layout via Shadow DOM) but do not interact with the Canvas.

**Tool:** Vitest with browser mode enabled. The browser provides the DOM APIs needed
for `getBoundingClientRect()` and `getComputedStyle()`.

**What to test:**

| Category         | Test cases                                             |
|------------------|--------------------------------------------------------|
| Block layout     | Nested divs, margins, padding, borders                 |
| Text layout      | Paragraphs with wrapping, alignment, overflow          |
| Headings         | h1-h6 with correct emphasis treatment                  |
| Lists            | Nested ul/ol with correct bullets/numbers              |
| Tables           | Basic, with headers, colspan, rowspan, border-collapse |
| Forms            | Each input type, select, textarea, button              |
| Flexbox          | Row/column, justify-content, align-items               |
| Grid             | Template rows/cols, gap, spanning                      |
| Overflow         | hidden clips content, scroll shows scrollbar           |
| Stacking         | z-index ordering, overlapping elements                 |

### Example: Snapshot Tests

```typescript
// tests/snapshot/basic-layout.test.ts
import { describe, it, expect } from 'vitest';
import { AsciiRenderer } from '../../src/ascii-renderer';

describe('Snapshot: Basic Layout', () => {
  let container: HTMLElement;
  let renderer: AsciiRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new AsciiRenderer(container, { cols: 40, rows: 10 });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('should render a div with border', () => {
    renderer.setContent(`
      <div style="border: 1px solid black; width: 200px; padding: 8px;">
        Hello World
      </div>
    `);

    expect(renderer.toText()).toMatchInlineSnapshot(`
      "┌──────────────────────────┐
       │ Hello World              │
       └──────────────────────────┘"
    `);
  });

  it('should render nested divs', () => {
    renderer.setContent(`
      <div style="border: 1px solid black; width: 300px; padding: 8px;">
        Outer
        <div style="border: 1px solid black; margin-top: 8px; padding: 8px;">
          Inner
        </div>
      </div>
    `);

    expect(renderer.toText()).toMatchInlineSnapshot(`
      "┌────────────────────────────────────┐
       │ Outer                              │
       │ ┌──────────────────────────────┐   │
       │ │ Inner                        │   │
       │ └──────────────────────────────┘   │
       └────────────────────────────────────┘"
    `);
  });

  it('should render a table', () => {
    renderer.setContent(`
      <table style="border-collapse: collapse;">
        <tr>
          <th>Name</th>
          <th>Age</th>
        </tr>
        <tr>
          <td>Alice</td>
          <td>30</td>
        </tr>
        <tr>
          <td>Bob</td>
          <td>25</td>
        </tr>
      </table>
    `);

    expect(renderer.toText()).toMatchInlineSnapshot(`
      "┌───────┬─────┐
       │ Name  │ Age │
       ├───────┼─────┤
       │ Alice │ 30  │
       │ Bob   │ 25  │
       └───────┴─────┘"
    `);
  });

  it('should render a form with inputs', () => {
    renderer.setContent(`
      <form style="width: 300px;">
        <label>Name:</label>
        <input type="text" value="Alice" style="width: 150px;" />
        <br />
        <label>Active:</label>
        <input type="checkbox" checked />
      </form>
    `);

    expect(renderer.toText()).toMatchInlineSnapshot(`
      "Name: [Alice______________]
       Active: [✓]"
    `);
  });

  it('should render an unordered list', () => {
    renderer.setContent(`
      <ul>
        <li>First item</li>
        <li>Second item
          <ul>
            <li>Nested item</li>
          </ul>
        </li>
        <li>Third item</li>
      </ul>
    `);

    expect(renderer.toText()).toMatchInlineSnapshot(`
      "• First item
       • Second item
         • Nested item
       • Third item"
    `);
  });
});
```

### Updating Snapshots

When the rendering changes intentionally (e.g., after improving border rendering),
update snapshots with:

```bash
npx vitest --update
```

Review the diff carefully to ensure only expected changes are present.

---

## Layer 3: Integration Tests

**Scope:** Full pipeline tests that exercise `setContent()` through `toText()`, and
also test event-driven behavior. These tests verify that all modules work together
correctly.

**Tool:** Vitest with browser mode (same as Layer 2, but testing behavior rather than
visual output).

**What to test:**

| Category           | Test cases                                           |
|--------------------|------------------------------------------------------|
| Render pipeline    | setContent -> walk -> rasterize -> toText             |
| Re-render          | Content change triggers re-render, output updates     |
| Event callbacks    | on('button', 'click', handler) fires handler          |
| Form interaction   | Checkbox toggle changes checked state                 |
| Select interaction | Dropdown open/close, option selection                 |
| Scroll state       | Scroll position updates, content clips correctly      |
| Focus management   | Tab order, focus/blur events                          |
| Resize             | resize() changes grid dimensions, re-renders          |
| Destroy            | destroy() cleans up DOM, removes listeners            |

### Example: Integration Tests

```typescript
// tests/integration/pipeline.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AsciiRenderer } from '../../src/ascii-renderer';

describe('Integration: Full Pipeline', () => {
  let container: HTMLElement;
  let renderer: AsciiRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new AsciiRenderer(container, { cols: 60, rows: 20 });
  });

  afterEach(() => {
    renderer.destroy();
    document.body.removeChild(container);
  });

  it('should render and export text', () => {
    renderer.setContent('<p>Hello, ASCII World!</p>');
    const text = renderer.toText();
    expect(text).toContain('Hello, ASCII World!');
  });

  it('should re-render when content changes', () => {
    renderer.setContent('<p>Version 1</p>');
    expect(renderer.toText()).toContain('Version 1');

    renderer.setContent('<p>Version 2</p>');
    expect(renderer.toText()).toContain('Version 2');
    expect(renderer.toText()).not.toContain('Version 1');
  });

  it('should fire click handler on button', () => {
    const handler = vi.fn();
    renderer.setContent('<button id="btn">Click</button>');
    renderer.on('#btn', 'click', handler);

    // Simulate a click at the button's position
    // (In integration tests, we may directly dispatch on the shadow DOM element)
    const btn = renderer.querySelector('#btn');
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should toggle checkbox on click', () => {
    renderer.setContent(`
      <label>
        <input type="checkbox" id="cb" />
        Accept terms
      </label>
    `);

    const cb = renderer.querySelector('#cb') as HTMLInputElement;
    expect(cb.checked).toBe(false);

    cb.click();
    renderer.render(); // force re-render

    expect(cb.checked).toBe(true);
    expect(renderer.toText()).toContain('\u2713'); // checkmark
  });

  it('should update input value', () => {
    renderer.setContent('<input type="text" id="name" value="" />');

    const input = renderer.querySelector('#name') as HTMLInputElement;
    input.value = 'Alice';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    renderer.render();

    expect(renderer.toText()).toContain('Alice');
  });

  it('should handle select dropdown', () => {
    renderer.setContent(`
      <select id="color">
        <option value="red">Red</option>
        <option value="green" selected>Green</option>
        <option value="blue">Blue</option>
      </select>
    `);

    // Initially shows "Green" as selected
    expect(renderer.toText()).toContain('Green');

    // Change selection
    const select = renderer.querySelector('#color') as HTMLSelectElement;
    select.value = 'blue';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    renderer.render();

    expect(renderer.toText()).toContain('Blue');
  });

  it('should resize the grid', () => {
    renderer.setContent('<p>Resize test</p>');

    renderer.resize(30, 10);
    const size = renderer.getSize();
    expect(size.cols).toBe(30);
    expect(size.rows).toBe(10);

    // Text should still render (potentially with different wrapping)
    expect(renderer.toText()).toContain('Resize test');
  });

  it('should handle overflow hidden clipping', () => {
    renderer.setContent(`
      <div style="width: 100px; height: 32px; overflow: hidden; border: 1px solid black;">
        <p>This is a very long paragraph that should be clipped at the container boundary.</p>
      </div>
    `);

    const text = renderer.toText();
    // The text should be present but clipped
    // Exact verification depends on grid dimensions and cell size
    expect(text).toContain('\u250c'); // top-left border exists
    expect(text).toContain('\u2518'); // bottom-right border exists
  });

  it('should clean up on destroy', () => {
    renderer.setContent('<p>Soon to be destroyed</p>');
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    renderer.destroy();

    // Canvas should be removed
    const canvasAfter = container.querySelector('canvas');
    expect(canvasAfter).toBeNull();
  });
});
```

---

## Layer 4: E2E Tests

**Scope:** Full browser tests that interact with the actual Canvas element using
mouse and keyboard events. These tests verify that the rendered Canvas looks correct
and that user interactions work end-to-end.

**Tool:** Playwright.

**What to test:**

| Category        | Test cases                                              |
|-----------------|---------------------------------------------------------|
| Canvas render   | Canvas displays characters (screenshot comparison)      |
| Click           | Clicking on a button triggers handler                   |
| Text input      | Clicking input field and typing updates the field       |
| IME             | Composition input produces correct characters           |
| Scroll          | Mouse wheel scrolls content within scrollable container |
| Drag            | Mouse drag moves a draggable element                    |
| Keyboard nav    | Tab moves focus, Enter activates buttons                |
| Select dropdown | Click opens dropdown, click option selects it           |
| Dialog modal    | Dialog shows with backdrop, Escape closes it            |
| Resize          | Window resize adjusts canvas and re-renders             |

### Example: E2E Tests

```typescript
// tests/e2e/canvas-interaction.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Canvas Interaction', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/test-harness.html');
    // Wait for the renderer to initialize
    await page.waitForSelector('canvas');
  });

  test('should render content on canvas', async ({ page }) => {
    // Set content via the test harness API
    await page.evaluate(() => {
      (window as any).renderer.setContent('<p>Hello E2E</p>');
    });

    // Verify text appears in the exported text
    const text = await page.evaluate(() => {
      return (window as any).renderer.toText();
    });
    expect(text).toContain('Hello E2E');

    // Visual screenshot comparison
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveScreenshot('hello-e2e.png');
  });

  test('should handle click on button', async ({ page }) => {
    await page.evaluate(() => {
      const r = (window as any).renderer;
      r.setContent('<button id="btn" style="padding: 8px 16px;">Click Me</button>');
      (window as any).clicked = false;
      r.on('#btn', 'click', () => { (window as any).clicked = true; });
    });

    // Find the approximate center of the button in the canvas
    // The test harness provides a helper for this
    const btnCenter = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#btn');
    });

    // Click at the button's position on the canvas
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: btnCenter.x, y: btnCenter.y } });

    // Verify the click handler was called
    const clicked = await page.evaluate(() => (window as any).clicked);
    expect(clicked).toBe(true);
  });

  test('should type into text input', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).renderer.setContent(`
        <input type="text" id="name" style="width: 200px;" />
      `);
    });

    // Click on the input to focus it
    const inputCenter = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#name');
    });
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: inputCenter.x, y: inputCenter.y } });

    // Type into the canvas (which routes to hidden textarea -> shadow DOM input)
    await page.keyboard.type('Hello World');

    // Verify the input value was updated
    const value = await page.evaluate(() => {
      const input = (window as any).renderer.querySelector('#name');
      return input?.value;
    });
    expect(value).toBe('Hello World');

    // Verify the rendered text shows the value
    const text = await page.evaluate(() => (window as any).renderer.toText());
    expect(text).toContain('Hello World');
  });

  test('should scroll with mouse wheel', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).renderer.setContent(`
        <div id="scroll-box" style="width: 300px; height: 100px; overflow: auto; border: 1px solid black;">
          <p>Line 1</p>
          <p>Line 2</p>
          <p>Line 3</p>
          <p>Line 4</p>
          <p>Line 5</p>
          <p>Line 6</p>
          <p>Line 7</p>
          <p>Line 8</p>
          <p>Line 9</p>
          <p>Line 10</p>
        </div>
      `);
    });

    const boxCenter = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#scroll-box');
    });

    // Scroll down
    const canvas = page.locator('canvas');
    await canvas.hover({ position: { x: boxCenter.x, y: boxCenter.y } });
    await page.mouse.wheel(0, 120); // scroll down

    // Wait for re-render
    await page.waitForTimeout(100);

    // Verify scroll position changed
    const scrollTop = await page.evaluate(() => {
      const el = (window as any).renderer.querySelector('#scroll-box');
      return el?.scrollTop;
    });
    expect(scrollTop).toBeGreaterThan(0);
  });

  test('should drag a draggable element', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).renderer.setContent(`
        <div id="draggable" draggable="true"
             style="position: absolute; left: 50px; top: 50px;
                    width: 100px; height: 50px; border: 1px solid black;
                    cursor: grab;">
          Drag me
        </div>
      `);
    });

    const start = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#draggable');
    });

    const canvas = page.locator('canvas');

    // Perform drag: mousedown -> mousemove -> mouseup
    await canvas.hover({ position: { x: start.x, y: start.y } });
    await page.mouse.down();
    await page.mouse.move(start.x + 80, start.y + 40, { steps: 5 });
    await page.mouse.up();

    // Wait for re-render
    await page.waitForTimeout(100);

    // Verify element moved (check new position via shadow DOM style)
    const newLeft = await page.evaluate(() => {
      const el = (window as any).renderer.querySelector('#draggable');
      return parseInt(el?.style.left || '0');
    });
    expect(newLeft).toBeGreaterThan(50); // moved right
  });

  test('should navigate with Tab key', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).renderer.setContent(`
        <input type="text" id="field1" />
        <input type="text" id="field2" />
        <button id="btn">OK</button>
      `);
    });

    // Click first field to focus
    const field1Center = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#field1');
    });
    const canvas = page.locator('canvas');
    await canvas.click({ position: { x: field1Center.x, y: field1Center.y } });

    // Tab to second field
    await page.keyboard.press('Tab');

    const focused = await page.evaluate(() => {
      return (window as any).renderer.getFocusedElementId();
    });
    expect(focused).toBe('field2');

    // Tab to button
    await page.keyboard.press('Tab');

    const focused2 = await page.evaluate(() => {
      return (window as any).renderer.getFocusedElementId();
    });
    expect(focused2).toBe('btn');
  });

  test('should open and close select dropdown', async ({ page }) => {
    await page.evaluate(() => {
      (window as any).renderer.setContent(`
        <select id="fruit">
          <option>Apple</option>
          <option>Banana</option>
          <option>Cherry</option>
        </select>
      `);
    });

    const selectCenter = await page.evaluate(() => {
      return (window as any).renderer.getElementCenter('#fruit');
    });

    const canvas = page.locator('canvas');

    // Click to open dropdown
    await canvas.click({ position: { x: selectCenter.x, y: selectCenter.y } });
    await page.waitForTimeout(100);

    // Verify dropdown is visible in rendered text
    let text = await page.evaluate(() => (window as any).renderer.toText());
    expect(text).toContain('Apple');
    expect(text).toContain('Banana');
    expect(text).toContain('Cherry');

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    text = await page.evaluate(() => (window as any).renderer.toText());
    // Dropdown should be closed, only selected value visible
    expect(text).toContain('Apple'); // still selected
  });
});
```

---

## Test Tools and Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Layer 1: Unit tests (Node environment, no browser)
    include: ['tests/unit/**/*.test.ts'],

    // Global test configuration
    globals: true,
    environment: 'node',

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

```typescript
// vitest.config.browser.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Layers 2 & 3: Snapshot and integration tests (browser environment)
    include: [
      'tests/snapshot/**/*.test.ts',
      'tests/integration/**/*.test.ts',
    ],

    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
    },
  },
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

### NPM Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run --config vitest.config.ts",
    "test:browser": "vitest run --config vitest.config.browser.ts",
    "test:e2e": "npx playwright test",
    "test:all": "npm run test:unit && npm run test:browser && npm run test:e2e",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "test:update-snapshots": "vitest run --config vitest.config.browser.ts --update"
  }
}
```

---

## CI Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --reporter=junit --outputFile=results/unit.xml
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  snapshot-tests:
    name: Snapshot & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install chromium --with-deps
      - run: npm run test:browser -- --reporter=junit --outputFile=results/browser.xml
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: snapshot-failures
          path: tests/snapshot/__snapshots__/

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install ${{ matrix.browser }} --with-deps
      - run: npx playwright test --project=${{ matrix.browser }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report-${{ matrix.browser }}
          path: playwright-report/
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-traces-${{ matrix.browser }}
          path: test-results/

  all-passed:
    name: All Tests Passed
    needs: [unit-tests, snapshot-tests, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - run: echo "All test suites passed."
```

### Pipeline Summary

```
  Push / PR
      |
      v
  +---+---+---+
  |   |   |   |
  v   v   v   v
Unit Snap  E2E E2E E2E
Tests Tests Chrome Firefox Safari
  |   |   |     |     |
  v   v   v     v     v
  +---+---+-----+-----+
            |
            v
     All Tests Passed
            |
            v
       Merge Ready
```

**Execution order:**
1. Unit tests and snapshot/integration tests run in parallel.
2. E2E tests run in parallel across 3 browsers.
3. The `all-passed` job gates the PR.

**Failure handling:**
- Unit tests: fast feedback, no artifacts needed.
- Snapshot tests: upload failing snapshots for visual comparison.
- E2E tests: upload Playwright report and traces for debugging.

### Local Development Workflow

```bash
# Run all unit tests in watch mode during development
npm run test:watch

# Run specific test file
npx vitest run tests/unit/char-grid.test.ts

# Run snapshot tests and update if rendering changed
npm run test:update-snapshots

# Run E2E tests with headed browser for debugging
npx playwright test --headed

# Run single E2E test
npx playwright test tests/e2e/canvas-interaction.spec.ts --headed

# Debug E2E test with Playwright inspector
npx playwright test --debug

# View Playwright test report
npx playwright show-report
```
