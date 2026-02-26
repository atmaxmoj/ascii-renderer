# ASCII Renderer -- Stacking Contexts and Overlay System

This document details how the ASCII Renderer handles CSS stacking contexts, painting
order, overlay popups, overflow clipping, and boundary detection.

---

## Table of Contents

1. [CSS Stacking Contexts](#css-stacking-contexts)
2. [Building the Stacking Tree](#building-the-stacking-tree)
3. [Painting Order (Painter's Algorithm)](#painting-order)
4. [Overlay System](#overlay-system)
5. [Overflow Handling](#overflow-handling)
6. [Boundary Detection](#boundary-detection)

---

## CSS Stacking Contexts

A **stacking context** is a three-dimensional conceptualization of HTML elements along
the Z-axis. Elements within the same stacking context are painted in a defined order.
A new stacking context is created by any element with one of the following properties:

### Stacking Context Triggers

| CSS Property / Condition                         | Creates Stacking Context? |
|--------------------------------------------------|---------------------------|
| Root element (`<html>`)                          | Always                    |
| `position: absolute\|relative` + `z-index` != auto | Yes                    |
| `position: fixed`                                | Yes                       |
| `position: sticky`                               | Yes                       |
| `opacity` < 1                                    | Yes                       |
| `transform` != none                              | Yes                       |
| `filter` != none                                 | Yes                       |
| `backdrop-filter` != none                        | Yes                       |
| `perspective` != none                            | Yes                       |
| `clip-path` != none                              | Yes                       |
| `mask` / `mask-image` != none                    | Yes                       |
| `mix-blend-mode` != normal                       | Yes                       |
| `isolation: isolate`                             | Yes                       |
| `will-change` (specifying compositing property)  | Yes                       |
| `contain: layout\|paint\|strict\|content`        | Yes                       |
| Flex/Grid child with `z-index` != auto           | Yes                       |

The DomWalker detects these conditions by reading `getComputedStyle()` for each
element and sets `stackingContext: true` on the corresponding `LayoutNode`.

---

## Building the Stacking Tree

The Rasterizer builds a stacking tree from the flat LayoutNode tree during the
rasterization phase.

### Algorithm

```
function buildStackingTree(node: LayoutNode): StackingLayer {
  let layer = new StackingLayer(node);

  for (let child of node.children) {
    if (child.stackingContext) {
      // Child forms its own stacking context
      let childLayer = buildStackingTree(child);
      layer.addStackingChild(childLayer);
    } else {
      // Child participates in parent's stacking context
      layer.addFlowChild(child);
      // But recurse to find stacking contexts deeper in the tree
      for (let grandchild of child.children) {
        collectStackingContexts(grandchild, layer);
      }
    }
  }

  return layer;
}
```

### StackingLayer Structure

```typescript
interface StackingLayer {
  node: LayoutNode;
  zIndex: number;              // resolved z-index (0 for auto)
  flowChildren: LayoutNode[];  // non-stacking-context children
  stackingChildren: StackingLayer[];  // child stacking contexts
}
```

---

## Painting Order

The Rasterizer follows the CSS painting order specification. Within each stacking
context, elements are painted in this order:

### CSS 2.1 Painting Order (Simplified)

```
 1. Background and borders of the stacking context root
 2. Child stacking contexts with negative z-index (sorted ascending)
 3. In-flow, non-positioned block-level descendants (in tree order)
 4. Non-positioned floats
 5. In-flow, non-positioned inline-level descendants (text, inline boxes)
 6. Positioned descendants with z-index: auto or 0 (in tree order)
 7. Child stacking contexts with positive z-index (sorted ascending)
```

### Implementation in the Rasterizer

```typescript
function paintStackingContext(layer: StackingLayer, grid: CharGrid, hitTest: HitTestBuffer) {
  // 1. Paint this element's background and borders
  paintBackgroundAndBorders(layer.node, grid, hitTest);

  // 2. Negative z-index children
  let negativeChildren = layer.stackingChildren
    .filter(c => c.zIndex < 0)
    .sort((a, b) => a.zIndex - b.zIndex);
  for (let child of negativeChildren) {
    paintStackingContext(child, grid, hitTest);
  }

  // 3-5. Flow children (block, float, inline -- in tree order)
  for (let child of layer.flowChildren) {
    paintFlowContent(child, grid, hitTest);
  }

  // 6. z-index: auto or 0 children (tree order among themselves)
  let zeroChildren = layer.stackingChildren
    .filter(c => c.zIndex === 0);
  for (let child of zeroChildren) {
    paintStackingContext(child, grid, hitTest);
  }

  // 7. Positive z-index children
  let positiveChildren = layer.stackingChildren
    .filter(c => c.zIndex > 0)
    .sort((a, b) => a.zIndex - b.zIndex);
  for (let child of positiveChildren) {
    paintStackingContext(child, grid, hitTest);
  }
}
```

### Painter's Algorithm

The ASCII Renderer uses the **painter's algorithm**: elements painted later overwrite
elements painted earlier. There is no depth buffer; the last character written to a
cell wins.

This means:
- An element with `z-index: 10` overwrites an element with `z-index: 1`.
- Within the same z-index, later elements in tree order overwrite earlier ones.
- The hit-test buffer is also overwritten, so the topmost element receives events.

```
Example: Two overlapping boxes

Box A (z-index: 1):          Box B (z-index: 2):
┌─────────┐                       ┌─────────┐
│ A A A A │                       │ B B B B │
│ A A A A │                       │ B B B B │
└─────────┘                       └─────────┘

Result (B paints over A):
┌─────────┐
│ A A ┌─────────┐
│ A A │ B B B B │
└─────│ B B B B │
      └─────────┘

CharGrid contents:
Row 0:  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
Row 1:  │   A   A   ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
Row 2:  │   A   A   │   B   B   B   B   │
Row 3:  └ ─ ─ ─ ─   │   B   B   B   B   │
                     └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

HitTest buffer: cells under B point to B's element, cells under A point to A's.
```

---

## Overlay System

The Overlay Manager handles popup UI elements that exist outside the normal document
flow and stacking context hierarchy.

### What Is an Overlay?

An overlay is any UI element that:
1. Paints on top of ALL normal content (regardless of z-index).
2. Ignores `overflow: hidden` clipping from ancestor elements.
3. Has its own event handling priority.
4. Has a lifecycle (open, reposition, close).

### Overlay Types

| Overlay Type     | Trigger                        | Content                    |
|------------------|--------------------------------|----------------------------|
| Select dropdown  | Click on `<select>` element    | List of `<option>` elements|
| Datepicker       | Click on `<input type="date">` | Calendar grid              |
| Tooltip          | Hover over element with `title`| Text popup                 |
| Dialog (modal)   | `<dialog>` with `showModal()`  | Dialog content + backdrop  |
| Context menu     | Right-click (if implemented)   | Menu items                 |
| Autocomplete     | Typing in input with datalist  | Suggestion list            |

### Overlay Stack

The OverlayManager maintains an ordered stack of active overlays:

```typescript
class OverlayManager {
  private overlayStack: Overlay[] = [];

  pushOverlay(overlay: Overlay): void {
    this.overlayStack.push(overlay);
  }

  popOverlay(): Overlay | undefined {
    return this.overlayStack.pop();
  }

  getTopOverlay(): Overlay | null {
    return this.overlayStack[this.overlayStack.length - 1] ?? null;
  }

  hasActiveOverlay(): boolean {
    return this.overlayStack.length > 0;
  }

  paintOverlays(grid: CharGrid, hitTest: HitTestBuffer): void {
    for (let overlay of this.overlayStack) {
      overlay.paint(grid, hitTest);
    }
  }
}
```

### Overlay Interface

```typescript
interface Overlay {
  /** Unique identifier for this overlay instance. */
  id: string;

  /** The element that triggered this overlay. */
  anchor: Element;

  /** Position of the overlay in grid coordinates. */
  position: { col: number; row: number };

  /** Size of the overlay content. */
  size: { width: number; height: number };

  /** Paint the overlay content onto the grid. */
  paint(grid: CharGrid, hitTest: HitTestBuffer): void;

  /** Handle an event that occurred inside the overlay. */
  handleEvent(event: SyntheticEvent): boolean;

  /** Whether clicking outside should close this overlay. */
  closeOnClickOutside: boolean;

  /** Whether this overlay has a backdrop (modal). */
  hasBackdrop: boolean;

  /** Close and clean up the overlay. */
  close(): void;
}
```

### Overlay Painting

Overlays are painted AFTER the entire normal render pipeline completes:

```
Normal pipeline:
  1. Clear grid
  2. Rasterize all normal content (with stacking contexts)
  3. *** All normal content is now in the grid ***

Overlay painting:
  4. For each overlay in stack (bottom to top):
     a. If hasBackdrop: fill entire grid with backdrop character
     b. Paint overlay content at overlay.position
     c. Write overlay element refs to hit-test buffer
```

Because overlays paint last, they always appear on top of everything. Because they
write to the hit-test buffer last, overlay elements receive events first.

### Overlay Event Priority

When the EventDispatcher processes a pointer event:

```
1. Check: does OverlayManager have active overlays?
   |
   +-- NO:  proceed with normal hit-test lookup
   |
   +-- YES: is the click inside the top overlay's bounds?
             |
             +-- YES: dispatch event to overlay.handleEvent()
             |        (event does NOT propagate to normal content)
             |
             +-- NO:  does the overlay have closeOnClickOutside?
                       |
                       +-- YES: close the overlay, consume the event
                       |        (do NOT forward to normal content)
                       |
                       +-- NO:  close the overlay, then re-check
                                (the click may target a lower overlay
                                 or normal content)
```

This means:
- **Overlays always get first shot at events.**
- **Clicking outside a dropdown closes it** without activating whatever is behind.
- **Modal dialogs with backdrops block all interaction** with normal content.

### Overlay Lifecycle Example: Select Dropdown

```
1. User clicks on <select> element
2. EventDispatcher dispatches "click" on <select>
3. FormRenderer.handleSelectClick():
   a. Build dropdown content (list of options)
   b. Calculate position (below the select, or above if no space)
   c. Create SelectDropdownOverlay
   d. OverlayManager.pushOverlay(dropdown)
   e. Trigger re-render

4. Re-render paints normally, then OverlayManager.paintOverlays()
   draws the dropdown on top

5. User clicks an option inside the dropdown
   a. EventDispatcher checks overlay -> inside overlay bounds
   b. SelectDropdownOverlay.handleEvent() processes the click
   c. Updates <select> value in shadow DOM
   d. Dispatches "change" event
   e. OverlayManager.popOverlay()
   f. Trigger re-render

6. Or: user clicks outside the dropdown
   a. EventDispatcher checks overlay -> outside overlay bounds
   b. closeOnClickOutside = true -> close overlay
   c. OverlayManager.popOverlay()
   d. Trigger re-render (dropdown disappears)
```

---

## Overflow Handling

CSS `overflow` property controls how content that exceeds its container's bounds is
handled.

### Overflow Modes

| `overflow` value | ASCII Renderer behavior                        |
|------------------|------------------------------------------------|
| `visible`        | Content is not clipped (default)               |
| `hidden`         | Content is clipped at container bounds          |
| `scroll`         | Content is clipped + scrollbar always shown     |
| `auto`           | Content is clipped + scrollbar shown if needed  |

### Clipping Implementation

When the Rasterizer encounters an element with `overflow: hidden` (or `scroll` or
`auto`), it pushes a clip region onto the CharGrid's clip stack:

```typescript
// During rasterization of an overflow:hidden element:
let clipRect = coordinateMapper.pxRectToGridRect(element.rect);
charGrid.pushClip(clipRect);

// Rasterize children (they can only write within clipRect)
for (let child of element.children) {
  rasterize(child, charGrid, hitTest);
}

charGrid.popClip();
```

The CharGrid's `setCell()` method checks the current clip region:

```typescript
setCell(col: number, row: number, cell: Cell): void {
  if (this.clipStack.length > 0) {
    let clip = this.clipStack[this.clipStack.length - 1];
    if (col < clip.col || col >= clip.col + clip.width ||
        row < clip.row || row >= clip.row + clip.height) {
      return; // Outside clip region, discard
    }
  }
  this.cells[row][col] = cell;
}
```

### Scrollbar Rendering

When `overflow` is `scroll` or `auto` (and content overflows), a scrollbar is drawn
along the right edge (vertical) or bottom edge (horizontal) of the container.

**Vertical scrollbar:**
```
┌──────────────────┐▲
│ Content line 1   │█
│ Content line 2   │█
│ Content line 3   │░
│ Content line 4   │░
│ Content line 5   │░
└──────────────────┘▼
```

Components:
- `\u25B2` / `\u25BC` -- up/down arrows at top and bottom.
- `\u2588` -- thumb (proportional to visible/total content ratio).
- `\u2591` -- track (remaining space).

**Thumb size calculation:**
```
visibleRatio = containerHeight / contentHeight
thumbSize = max(1, round(visibleRatio * trackHeight))
```

**Thumb position calculation:**
```
scrollRatio = scrollTop / (contentHeight - containerHeight)
thumbPos = round(scrollRatio * (trackHeight - thumbSize))
```

**Horizontal scrollbar:**
```
┌────────────────────────────────────┐
│ Content that extends beyond the    │
│ visible area of the container      │
└◄░░░░░░██████░░░░░░░░░░░░░░░░░░░░►┘
```

Components:
- `\u25C4` / `\u25BA` -- left/right arrows.
- `\u2588` -- thumb.
- `\u2591` -- track.

### Scroll State Management

Each scrollable element has an associated scroll state:

```typescript
interface ScrollState {
  scrollTop: number;   // vertical scroll offset (in character rows)
  scrollLeft: number;  // horizontal scroll offset (in character cols)
  maxScrollTop: number;
  maxScrollLeft: number;
  contentHeight: number;  // total content height in rows
  contentWidth: number;   // total content width in cols
  viewportHeight: number; // visible area height in rows
  viewportWidth: number;  // visible area width in cols
}
```

The DomWalker reads `element.scrollTop` and `element.scrollHeight` from the shadow
DOM to initialize scroll state. The EventDispatcher updates scroll state on wheel
events and scrollbar interactions.

### Interaction Between Overflow and Stacking

Important rule: **`overflow: hidden` clips content, but does NOT clip stacking
contexts that escape via `position: fixed` or overlays.**

In practice:
- A `position: fixed` element inside an `overflow: hidden` container is NOT clipped
  (it has its own stacking context relative to the viewport).
- Overlays (managed by OverlayManager) are never clipped by any `overflow` setting,
  because they paint after all normal content.

---

## Boundary Detection

When positioning overlays (dropdowns, tooltips, datepickers), the system must ensure
they remain visible within the canvas bounds.

### Dropdown Direction Flipping

A select dropdown normally opens downward. If there is not enough space below, it
flips to open upward.

```
Algorithm: positionDropdown(anchor, dropdownHeight)

  anchorBottom = anchor.row + anchor.height
  spaceBelow   = gridRows - anchorBottom
  spaceAbove   = anchor.row

  if (spaceBelow >= dropdownHeight) {
    // Open downward (preferred)
    return { row: anchorBottom, direction: 'down' }
  } else if (spaceAbove >= dropdownHeight) {
    // Open upward
    return { row: anchor.row - dropdownHeight, direction: 'up' }
  } else {
    // Not enough space either way: use whichever side has more space
    // and constrain height
    if (spaceBelow >= spaceAbove) {
      return { row: anchorBottom, height: spaceBelow, direction: 'down' }
    } else {
      return { row: 0, height: spaceAbove, direction: 'up' }
    }
  }
```

**Visual example -- downward (normal):**
```
[Selected ▼]
┌───────────┐
│ Option 1  │
│ Option 2  │
│ Option 3  │
└───────────┘
```

**Visual example -- flipped upward:**
```
┌───────────┐
│ Option 1  │
│ Option 2  │
│ Option 3  │
└───────────┘
[Selected ▲]
```

### Horizontal Boundary Clamping

If an overlay would extend beyond the right edge of the grid, it is shifted left:

```
Algorithm: clampHorizontal(overlayCol, overlayWidth, gridCols)

  if (overlayCol + overlayWidth > gridCols) {
    overlayCol = gridCols - overlayWidth
  }
  if (overlayCol < 0) {
    overlayCol = 0
  }
  return overlayCol
```

### Tooltip Positioning

Tooltips follow a preference order:

```
1. Above the element, centered horizontally
2. Below the element, centered horizontally (if no space above)
3. Right of the element (if no space above or below)
4. Left of the element (fallback)
```

```
Preferred (above):
         ┌─────────────────┐
         │ Tooltip text     │
         └────────┬────────┘
              [element]

Fallback (below):
              [element]
         ┌────────┴────────┐
         │ Tooltip text     │
         └─────────────────┘
```

### Dialog Centering

Modal dialogs are centered both horizontally and vertically in the grid:

```
dialogCol = floor((gridCols - dialogWidth) / 2)
dialogRow = floor((gridRows - dialogHeight) / 2)
```

If the dialog is larger than the grid, it is pinned to `(0, 0)` and the content
scrolls within the dialog.

---

## Stacking Order Summary

From bottom to top, the complete painting order is:

```
 Layer 0:  Canvas background (theme background color)
 Layer 1:  Root stacking context (normal document flow)
           - Backgrounds, borders
           - Negative z-index stacking contexts
           - Block-level content
           - Floats
           - Inline content
           - z-index: 0 / auto positioned elements
           - Positive z-index stacking contexts
 Layer 2:  Overlay stack (bottom to top)
           - Non-modal overlays (tooltips, dropdowns)
           - Modal backdrops
           - Modal dialog content
```

Each layer overwrites lower layers in both the CharGrid (visual) and HitTestBuffer
(events). The result is correct visual ordering and correct event targeting.
