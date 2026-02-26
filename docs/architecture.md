# ASCII Renderer -- Architecture Overview

## Purpose

ASCII Renderer is a pure-ASCII UI rendering engine. It accepts standard HTML/CSS as
input, computes layout using a hidden browser DOM, and produces ASCII art output on
an HTML Canvas element. The engine supports full interactivity: click, keyboard input,
scrolling, drag-and-drop, and IME composition -- all within the ASCII canvas surface.

**Input:** HTML string + optional CSS string
**Output:** ASCII art rendered to `<canvas>`, exportable as plain text

```
HTML/CSS  -->  [ ASCII Renderer ]  -->  Canvas (visual)
                                   -->  Plain text (export)
```

---

## High-Level Architecture

The system is composed of four cooperating subsystems:

```
+-------------------------------------------------------+
|                   AsciiRenderer (Public API)           |
+-------------------------------------------------------+
        |              |              |              |
        v              v              v              v
+-------------+ +-------------+ +-----------+ +----------+
| Hidden DOM  | | Render      | | Event     | | Overlay  |
| (Shadow DOM)| | Pipeline    | | System    | | Manager  |
+-------------+ +-------------+ +-----------+ +----------+
| - Layout    | | - DomWalker | | - HitTest | | - Popups |
|   engine    | | - CoordMap  | |   Buffer  | | - Dialogs|
| - Style     | | - Rasterize | | - Dispatch| | - Tooltip|
|   compute   | | - Display   | | - Focus   | | - Menus  |
+-------------+ +-------------+ +-----------+ +----------+
```

1. **Hidden DOM (Shadow DOM)** -- The browser itself acts as the layout engine. HTML
   is injected into a Shadow DOM attached to a hidden host element. The browser
   computes all layout (widths, heights, positions, line breaks, table sizing) via
   its native CSS engine. We read the results; we never reimplement CSS layout.

2. **Render Pipeline** -- Walks the computed DOM, maps pixel coordinates to a
   character grid, and rasterizes ASCII characters in stacking-context order.

3. **Event System** -- A hit-test buffer (same dimensions as the character grid) maps
   each cell back to its source DOM element. Canvas pointer events are translated to
   character coordinates, looked up in the hit-test buffer, and dispatched as
   synthetic events on the original DOM elements.

4. **Overlay Manager** -- Manages popup layers (select dropdowns, datepickers,
   tooltips, dialogs) that paint on top of all normal content and receive event
   priority.

---

## Full Render Pipeline

```
                         HTML/CSS (string)
                              |
                              v
                 +---------------------------+
                 |   Shadow DOM Injection    |
                 |   (innerHTML into host)   |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |   Browser Layout Engine   |
                 |   (native CSS compute)    |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |       DomWalker           |
                 |   getBoundingClientRect() |
                 |   getComputedStyle()      |
                 |   Builds LayoutNode tree  |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |    CoordinateMapper       |
                 |   pixel -> char grid      |
                 |   (cellWidth, cellHeight) |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |       Rasterizer          |
                 |   Draws ASCII chars into  |
                 |   CharGrid (2D buffer)    |
                 |   Stacking context order  |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |     OverlayManager        |
                 |   Paints popup layers     |
                 |   on top of CharGrid      |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |     CanvasDisplay         |
                 |   Renders CharGrid to     |
                 |   <canvas> element        |
                 +---------------------------+
                              |
                              v
                 +---------------------------+
                 |     TextExporter          |
                 |   Exports CharGrid to     |
                 |   plain text string       |
                 +---------------------------+
```

---

## Module Details

### Shadow DOM Host

```
Module:   ShadowDomHost
File:     src/dom/shadow-dom-host.ts
```

Responsibilities:
- Creates a hidden `<div>` with `position:absolute; left:-9999px` and attaches a
  Shadow DOM (`mode: 'open'`).
- Accepts an HTML string and injects it as `innerHTML` of the shadow root.
- Applies user-supplied CSS via a `<style>` element inside the shadow root.
- Provides the shadow root as the entry point for DomWalker.

Why Shadow DOM:
- **Style isolation.** User-supplied CSS cannot leak out to the host page, and host
  page styles cannot interfere with the rendered content.
- **Native layout.** The browser computes all CSS layout -- flexbox, grid, tables,
  floats, text wrapping, font metrics -- without us reimplementing any of it.
- **Standard APIs.** We read layout results with `getBoundingClientRect()` and
  `getComputedStyle()`, both well-supported and performant.

### DomWalker

```
Module:   DomWalker
File:     src/dom/dom-walker.ts
```

Responsibilities:
- Traverses the shadow DOM tree depth-first.
- For each element, reads `getBoundingClientRect()` to get pixel position/size.
- Reads `getComputedStyle()` to get visual properties (color, background, border,
  overflow, z-index, opacity, transform, display, visibility, etc.).
- Reads text content from text nodes, splitting by line when necessary.
- Produces a `LayoutNode` tree -- a lightweight intermediate representation that
  captures only what the rasterizer needs.

```typescript
interface LayoutNode {
  tag: string;
  rect: { x: number; y: number; width: number; height: number };
  style: ComputedStyleSubset;
  text?: string;
  children: LayoutNode[];
  element: Element;           // back-reference for hit-test
  stackingContext?: boolean;   // true if this node creates a stacking context
  stackingOrder?: number;      // z-index or auto
}
```

### CoordinateMapper

```
Module:   CoordinateMapper
File:     src/layout/coordinate-mapper.ts
```

Responsibilities:
- Converts pixel rectangles from the DOM into character-grid coordinates.
- Maintains `cellWidth` and `cellHeight` (measured from a reference monospace
  character rendered in the canvas font).
- Provides `pxToCol(px)`, `pxToRow(px)`, `pxRectToGridRect(rect)`.
- Handles sub-pixel rounding: a pixel value is mapped to the nearest character cell
  boundary, with a configurable snapping threshold.

```typescript
class CoordinateMapper {
  constructor(cellWidth: number, cellHeight: number);
  pxToCol(x: number): number;
  pxToRow(y: number): number;
  pxRectToGridRect(rect: DOMRect): GridRect;
  colToPx(col: number): number;
  rowToPx(row: number): number;
}

interface GridRect {
  col: number;
  row: number;
  width: number;   // in character cells
  height: number;  // in character cells
}
```

### Rasterizer

```
Module:   Rasterizer
File:     src/render/rasterizer.ts
```

Responsibilities:
- Accepts the `LayoutNode` tree and a `CharGrid` buffer.
- Sorts children within each stacking context per CSS stacking rules.
- For each node, delegates to element-specific renderers:
  - `BoxRenderer` -- borders using box-drawing characters.
  - `TextRenderer` -- text content with wrapping and truncation.
  - `TableRenderer` -- table grid lines.
  - `FormRenderer` -- input, select, button, textarea, etc.
  - `ListRenderer` -- bullet points and numbering.
- Writes characters, foreground colors, background colors, and element references
  into the `CharGrid`.
- Handles `overflow: hidden` by setting clip regions on the grid.

### CharGrid

```
Module:   CharGrid
File:     src/render/char-grid.ts
```

The core 2D buffer. Each cell stores:

```typescript
interface Cell {
  char: string;          // single character (or space)
  fg: string;            // foreground color (CSS color string)
  bg: string;            // background color (CSS color string)
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  element: Element | null;  // source DOM element (for hit-test)
}
```

Operations:
- `setCell(col, row, cell)` -- write a cell (respects clip region).
- `getCell(col, row)` -- read a cell.
- `fill(rect, cell)` -- fill a rectangular region.
- `writeText(col, row, text, style)` -- write a string of characters.
- `pushClip(rect)` / `popClip()` -- clip region stack for overflow:hidden.
- `clear()` -- reset all cells to empty.

### OverlayManager

```
Module:   OverlayManager
File:     src/overlay/overlay-manager.ts
```

Responsibilities:
- Manages a stack of overlay layers (each is its own mini CharGrid).
- Overlays are painted AFTER all normal content, so they always appear on top.
- Overlays ignore `overflow:hidden` clipping from the main content.
- Handles overlay-specific events: click-outside-to-close, keyboard navigation
  within dropdowns, escape-to-close.
- Provides `pushOverlay(overlay)`, `popOverlay()`, `paintOverlays(grid)`.

### CanvasDisplay

```
Module:   CanvasDisplay
File:     src/display/canvas-display.ts
```

Responsibilities:
- Owns the `<canvas>` element.
- On each render, iterates the `CharGrid` and draws each character using
  `ctx.fillText()` with appropriate colors and styles.
- Manages canvas sizing, DPI scaling (`devicePixelRatio`), and resize observation.
- Handles cursor rendering (block cursor, line cursor, hidden).
- Provides `render(grid)` and `measureCellSize()`.

Why Canvas (not a grid of `<span>` elements):
- **Performance.** A single Canvas draw pass is faster than updating thousands of DOM
  elements. A 120x40 grid is 4,800 cells; DOM updates at that scale cause layout
  thrashing.
- **Pixel-perfect control.** We control exact character placement, cursor rendering,
  and selection highlighting without fighting browser text layout.
- **Copy/paste.** Text export is handled separately via `TextExporter` and a hidden
  textarea, so Canvas does not sacrifice clipboard functionality.

### HitTestBuffer

```
Module:   HitTestBuffer
File:     src/events/hit-test-buffer.ts
```

A 2D array with the same dimensions as the CharGrid. Each cell holds a reference to
the DOM element that was painted there (the topmost one, respecting stacking order).

```typescript
class HitTestBuffer {
  constructor(cols: number, rows: number);
  set(col: number, row: number, element: Element): void;
  get(col: number, row: number): Element | null;
  clear(): void;
}
```

Why a separate hit-test buffer:
- The CharGrid stores the visual character. The hit-test buffer stores the semantic
  element. These can differ (e.g., a border character belongs to its parent element,
  not to the border-drawing routine).
- Overlays write to the hit-test buffer on top of normal content, so overlay elements
  receive events first.

### EventDispatcher

```
Module:   EventDispatcher
File:     src/events/event-dispatcher.ts
```

Responsibilities:
- Listens to native Canvas events: `mousedown`, `mouseup`, `mousemove`, `wheel`,
  `keydown`, `keyup`, `input`, `compositionstart/update/end`.
- Converts pixel coordinates to character grid coordinates via `CoordinateMapper`.
- Looks up the target element in `HitTestBuffer`.
- Creates synthetic events and dispatches them on the target element.
- Manages focus state (which element is focused, tab order).
- Manages cursor style (pointer, text, default, grab) by setting
  `canvas.style.cursor`.

### TextExporter

```
Module:   TextExporter
File:     src/export/text-exporter.ts
```

Responsibilities:
- Reads the `CharGrid` and produces a plain-text string.
- Each row becomes a line; trailing spaces are trimmed.
- Optionally includes ANSI color codes for terminal output.
- Provides `toText(grid)` and `toAnsi(grid)`.

---

## Module Dependency Graph

```
AsciiRenderer (public API)
  |
  +-- ShadowDomHost
  |     +-- (browser DOM APIs)
  |
  +-- DomWalker
  |     +-- ShadowDomHost (reads from shadow root)
  |     +-- CoordinateMapper
  |
  +-- Rasterizer
  |     +-- CharGrid
  |     +-- BoxRenderer
  |     +-- TextRenderer
  |     +-- TableRenderer
  |     +-- FormRenderer
  |     +-- ListRenderer
  |
  +-- OverlayManager
  |     +-- CharGrid (overlay grids)
  |     +-- Rasterizer (re-used for overlay content)
  |
  +-- CanvasDisplay
  |     +-- CharGrid (reads for rendering)
  |
  +-- HitTestBuffer
  |
  +-- EventDispatcher
  |     +-- CoordinateMapper
  |     +-- HitTestBuffer
  |     +-- OverlayManager (overlay event priority)
  |
  +-- TextExporter
        +-- CharGrid (reads for export)
```

---

## Public API

```typescript
class AsciiRenderer {
  /**
   * Create a new ASCII renderer.
   * @param container - DOM element to mount the canvas into.
   * @param options   - Configuration options.
   */
  constructor(container: HTMLElement, options?: RendererOptions);

  /**
   * Set the HTML/CSS content to render.
   * Triggers a full re-render.
   */
  setContent(html: string, css?: string): void;

  /**
   * Export the current render as a plain text string.
   */
  toText(): string;

  /**
   * Export the current render as an ANSI-colored string.
   */
  toAnsi(): string;

  /**
   * Register an event listener on rendered elements.
   * Uses CSS selector to identify the target element within the shadow DOM.
   * @param selector - CSS selector.
   * @param event    - Event name (click, input, change, etc.).
   * @param handler  - Callback function.
   */
  on(selector: string, event: string, handler: EventHandler): void;

  /**
   * Remove an event listener.
   */
  off(selector: string, event: string, handler: EventHandler): void;

  /**
   * Force a re-render without changing content.
   * Useful after external state changes.
   */
  render(): void;

  /**
   * Resize the character grid.
   * @param cols - Number of columns.
   * @param rows - Number of rows.
   */
  resize(cols: number, rows: number): void;

  /**
   * Get the current grid dimensions.
   */
  getSize(): { cols: number; rows: number };

  /**
   * Destroy the renderer and clean up all resources.
   */
  destroy(): void;
}

interface RendererOptions {
  cols?: number;              // default: 120
  rows?: number;              // default: 40
  fontFamily?: string;        // default: 'Courier New, monospace'
  fontSize?: number;          // default: 14
  theme?: Partial<Theme>;     // color overrides
  devicePixelRatio?: number;  // default: window.devicePixelRatio
}

interface Theme {
  foreground: string;         // default text color
  background: string;         // default background
  cursor: string;             // cursor color
  selection: string;          // selection highlight
  border: string;             // box-drawing character color
  scrollbar: string;          // scrollbar track/thumb color
}
```

---

## Data Flow: Full Render Cycle

```
1. User calls setContent(html, css)
        |
2. ShadowDomHost.inject(html, css)
   - innerHTML = html
   - <style> = css
   - Browser computes layout (synchronous forced reflow)
        |
3. DomWalker.walk(shadowRoot)
   - Depth-first traversal
   - getBoundingClientRect() for each element
   - getComputedStyle() for each element
   - Produces LayoutNode tree
        |
4. CoordinateMapper.mapTree(layoutTree)
   - Converts all pixel rects to GridRects
        |
5. CharGrid.clear()
   HitTestBuffer.clear()
        |
6. Rasterizer.rasterize(layoutTree, charGrid, hitTestBuffer)
   - Processes nodes in stacking context order
   - Writes characters and element refs to grid/buffer
   - Applies overflow:hidden clipping
        |
7. OverlayManager.paintOverlays(charGrid, hitTestBuffer)
   - Paints any active overlays on top
        |
8. CanvasDisplay.render(charGrid)
   - Draws all characters to <canvas>
        |
9. Done. Canvas shows ASCII art.
   HitTestBuffer is ready for events.
```

---

## Key Design Decisions

### Why Shadow DOM for Layout?

CSS layout is extraordinarily complex. Reimplementing even a subset (flexbox, grid,
tables, floats, inline layout, text wrapping with font metrics, `calc()`,
`min-content`/`max-content`, margin collapsing, etc.) would be a multi-year effort
with inevitable bugs.

By injecting HTML into a real (but hidden) DOM, we get the browser's battle-tested
layout engine for free. The Shadow DOM boundary provides style isolation so user CSS
does not affect the host page. The only cost is a hidden DOM subtree, which is cheap
compared to reimplementing layout.

### Why Canvas for Display?

A 120x40 character grid has 4,800 cells. Representing each cell as a `<span>` would
mean 4,800 DOM elements that need updating on every render. This causes:
- Layout thrashing (the browser recomputes layout for 4,800 elements).
- Paint overhead (4,800 elements in the render tree).
- Memory overhead (each element has a full DOM node footprint).

Canvas avoids all of this. We draw characters with `fillText()` in a single
composited pass. The entire render is one Canvas 2D context operation sequence, which
the browser can optimize and GPU-accelerate.

### Why a Hit-Test Buffer for Events?

Canvas does not natively support DOM events on individual drawn characters. We need a
way to map `(x, y)` pixel coordinates back to the source DOM element. Options:

1. **Geometric lookup.** Walk the layout tree and find which element's bounding box
   contains the point. Problem: overlapping elements, z-index, overflow clipping make
   this complex and slow.

2. **Hit-test buffer.** A 2D array (same size as CharGrid) where each cell stores
   the element reference written there during rasterization. Lookup is O(1): convert
   pixel to grid coords, read the buffer. This is the approach we use.

The hit-test buffer is updated during rasterization at zero extra cost (we already
know which element we are drawing), and lookup is a simple array index.

### Why Overlay Manager as a Separate System?

Popups (select dropdowns, datepickers, tooltips, dialog modals) have special
requirements:
- They paint on top of everything, regardless of the parent's `overflow:hidden`.
- They receive events before normal content.
- They have their own lifecycle (open, close, reposition).

Baking this into the normal stacking context system would require special exceptions
everywhere. A separate overlay system is cleaner: overlays paint after the main
content, write to the hit-test buffer on top, and get first priority in event
dispatch.
