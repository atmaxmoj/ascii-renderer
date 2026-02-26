# ASCII Renderer -- Sequence Diagrams

This document contains UML-style sequence diagrams for the core interactions in the
ASCII Renderer system. All diagrams use text-based notation.

---

## 1. Initialization Sequence

When `new AsciiRenderer(container, options)` is called.

```
  User          AsciiRenderer     CanvasDisplay     ShadowDomHost     CoordMapper
   |                 |                 |                  |                |
   | new(container,  |                 |                  |                |
   |     options)    |                 |                  |                |
   |---------------->|                 |                  |                |
   |                 |                 |                  |                |
   |                 | new(container,  |                  |                |
   |                 |     font, dpr)  |                  |                |
   |                 |---------------->|                  |                |
   |                 |                 |                  |                |
   |                 |                 | create <canvas>  |                |
   |                 |                 | set width/height |                |
   |                 |                 | apply DPI scale  |                |
   |                 |                 | set font         |                |
   |                 |                 |                  |                |
   |                 |                 | measureCellSize()|                |
   |                 |                 | ctx.measureText  |                |
   |                 |                 | ("M") -> width   |                |
   |                 |                 | lineHeight calc  |                |
   |                 |                 |   -> height      |                |
   |                 |                 |                  |                |
   |                 | (cellW, cellH)  |                  |                |
   |                 |<----------------|                  |                |
   |                 |                 |                  |                |
   |                 | new(cellW, cellH)                  |                |
   |                 |----------------------------------------------->---|
   |                 |                 |                  |                |
   |                 | new()           |                  |                |
   |                 |--------------------------------->|                |
   |                 |                 |                  |                |
   |                 |                 |                  | create hidden  |
   |                 |                 |                  | <div>          |
   |                 |                 |                  | attachShadow() |
   |                 |                 |                  |                |
   |                 | create CharGrid(cols, rows)       |                |
   |                 | create HitTestBuffer(cols, rows)  |                |
   |                 | create Rasterizer                 |                |
   |                 | create OverlayManager             |                |
   |                 | create EventDispatcher            |                |
   |                 | create TextExporter               |                |
   |                 |                 |                  |                |
   |                 | attach event    |                  |                |
   |                 | listeners to    |                  |                |
   |                 | canvas          |                  |                |
   |                 |                 |                  |                |
   | <instance>      |                 |                  |                |
   |<----------------|                 |                  |                |
   |                 |                 |                  |                |
```

---

## 2. Render Sequence

When `renderer.setContent(html, css)` is called.

```
  User         AsciiRenderer    ShadowDomHost    DomWalker    CoordMapper    Rasterizer    OverlayMgr    CanvasDisplay
   |                |                |               |             |              |              |              |
   | setContent     |                |               |             |              |              |              |
   | (html, css)    |                |               |             |              |              |              |
   |--------------->|                |               |             |              |              |              |
   |                |                |               |             |              |              |              |
   |                | inject(html,   |               |             |              |              |              |
   |                |        css)    |               |             |              |              |              |
   |                |--------------->|               |             |              |              |              |
   |                |                |               |             |              |              |              |
   |                |                | shadow.inner  |             |              |              |              |
   |                |                | HTML = html   |             |              |              |              |
   |                |                | <style> = css |             |              |              |              |
   |                |                |               |             |              |              |              |
   |                |                | force reflow  |             |              |              |              |
   |                |                | (offsetHeight)|             |              |              |              |
   |                |                |               |             |              |              |              |
   |                | walk(shadow    |               |             |              |              |              |
   |                |      Root)     |               |             |              |              |              |
   |                |------------------------------>|             |              |              |              |
   |                |                |               |             |              |              |              |
   |                |                |               | for each    |              |              |              |
   |                |                |               | element:    |              |              |              |
   |                |                |               |             |              |              |              |
   |                |                |               | getBounding |              |              |              |
   |                |                |               | ClientRect()|              |              |              |
   |                |                |               |             |              |              |              |
   |                |                |               | getComputed |              |              |              |
   |                |                |               | Style()     |              |              |              |
   |                |                |               |             |              |              |              |
   |                |                |               | pxRectTo    |              |              |              |
   |                |                |               | GridRect()  |              |              |              |
   |                |                |               |------------>|              |              |              |
   |                |                |               |  GridRect   |              |              |              |
   |                |                |               |<------------|              |              |              |
   |                |                |               |             |              |              |              |
   |                |                |               | build       |              |              |              |
   |                |                |               | LayoutNode  |              |              |              |
   |                |                |               | tree        |              |              |              |
   |                |                |               |             |              |              |              |
   |                | layoutTree     |               |             |              |              |              |
   |                |<-------------------------------|             |              |              |              |
   |                |                |               |             |              |              |              |
   |                | charGrid.clear()               |             |              |              |              |
   |                | hitTest.clear()                |             |              |              |              |
   |                |                |               |             |              |              |              |
   |                | rasterize(layoutTree, grid, hitTest)         |              |              |              |
   |                |--------------------------------------------------->|              |              |
   |                |                |               |             |              |              |              |
   |                |                |               |             |       sort stacking        |              |
   |                |                |               |             |       contexts             |              |
   |                |                |               |             |              |              |              |
   |                |                |               |             |       for each node:       |              |
   |                |                |               |             |       write chars to       |              |
   |                |                |               |             |       CharGrid +           |              |
   |                |                |               |             |       HitTestBuffer        |              |
   |                |                |               |             |              |              |              |
   |                | paintOverlays(grid, hitTest)   |             |              |              |              |
   |                |------------------------------------------------------------------------>|              |
   |                |                |               |             |              |              |              |
   |                |                |               |             |              |       paint overlay        |
   |                |                |               |             |              |       layers on top        |
   |                |                |               |             |              |              |              |
   |                | render(grid)   |               |             |              |              |              |
   |                |--------------------------------------------------------------------------->|
   |                |                |               |             |              |              |              |
   |                |                |               |             |              |              | for each cell:|
   |                |                |               |             |              |              | fillText()   |
   |                |                |               |             |              |              | with color   |
   |                |                |               |             |              |              |              |
   |                | <done>         |               |             |              |              |              |
   |<---------------|                |               |             |              |              |              |
   |                |                |               |             |              |              |              |
```

---

## 3. Click Interaction

User clicks on a rendered button inside the ASCII canvas.

```
  Browser        CanvasDisplay    EventDispatcher    CoordMapper    HitTestBuffer    OverlayMgr    TargetElement
   |                  |                 |                |               |               |               |
   | mousedown        |                 |                |               |               |               |
   | (px: 245, 118)   |                 |                |               |               |               |
   |----------------->|                 |                |               |               |               |
   |                  |                 |                |               |               |               |
   |                  | onMouseDown     |                |               |               |               |
   |                  | (pixel x, y)   |                |               |               |               |
   |                  |---------------->|                |               |               |               |
   |                  |                 |                |               |               |               |
   |                  |                 | pxToCol(245)   |               |               |               |
   |                  |                 | pxToRow(118)   |               |               |               |
   |                  |                 |--------------->|               |               |               |
   |                  |                 | col=28, row=8  |               |               |               |
   |                  |                 |<---------------|               |               |               |
   |                  |                 |                |               |               |               |
   |                  |                 | hasActiveOverlay()?            |               |               |
   |                  |                 |---------------------------------------------->|               |
   |                  |                 | no             |               |               |               |
   |                  |                 |<----------------------------------------------|               |
   |                  |                 |                |               |               |               |
   |                  |                 | get(28, 8)     |               |               |               |
   |                  |                 |------------------------------>|               |               |
   |                  |                 | <button>       |               |               |               |
   |                  |                 |<------------------------------|               |               |
   |                  |                 |                |               |               |               |
   |                  |                 | update focus   |               |               |               |
   |                  |                 | state          |               |               |               |
   |                  |                 |                |               |               |               |
   |                  |                 | set cursor =   |               |               |               |
   |                  |                 | "pointer"      |               |               |               |
   |                  |                 |                |               |               |               |
   |                  |                 | dispatch       |               |               |               |
   |                  |                 | synthetic      |               |               |               |
   |                  |                 | "click" event  |               |               |               |
   |                  |                 |-------------------------------------------------------------->|
   |                  |                 |                |               |               |               |
   |                  |                 |                |               |               |  handler runs |
   |                  |                 |                |               |               |  (user code)  |
   |                  |                 |                |               |               |               |
   |                  |                 | if content     |               |               |               |
   |                  |                 | changed:       |               |               |               |
   |                  |                 | trigger        |               |               |               |
   |                  |                 | re-render      |               |               |               |
   |                  |                 |                |               |               |               |
```

---

## 4. Text Input and IME

User focuses an `<input type="text">` and types characters, including IME
composition for CJK input.

```
  User         CanvasDisplay    EventDispatcher    HiddenTextarea    ShadowDOM Input    Renderer
   |                |                 |                  |                  |                |
   | click on       |                 |                  |                  |                |
   | input field    |                 |                  |                  |                |
   |--------------->|                 |                  |                  |                |
   |                | (mousedown      |                  |                  |                |
   |                |  dispatched)    |                  |                  |                |
   |                |---------------->|                  |                  |                |
   |                |                 |                  |                  |                |
   |                |                 | hit-test ->      |                  |                |
   |                |                 | <input> element  |                  |                |
   |                |                 |                  |                  |                |
   |                |                 | setFocus(<input>)|                  |                |
   |                |                 |                  |                  |                |
   |                |                 | show hidden      |                  |                |
   |                |                 | textarea (off-   |                  |                |
   |                |                 | screen, focused) |                  |                |
   |                |                 |----------------->|                  |                |
   |                |                 |                  |                  |                |
   |                |                 |                  | textarea.focus() |                |
   |                |                 |                  | textarea.value = |                |
   |                |                 |                  |   input.value    |                |
   |                |                 |                  |                  |                |
   | types "h"      |                 |                  |                  |                |
   |-------------------------------------------->|                  |                |
   |                |                 |                  |                  |                |
   |                |                 |                  | "input" event    |                |
   |                |                 |                  | value = "h"      |                |
   |                |                 |<-----------------|                  |                |
   |                |                 |                  |                  |                |
   |                |                 | sync value to    |                  |                |
   |                |                 | shadow DOM input |                  |                |
   |                |                 |---------------------------------->|                |
   |                |                 |                  |                  |                |
   |                |                 | trigger re-render|                  |                |
   |                |                 |------------------------------------------------------->|
   |                |                 |                  |                  |                |
   |                |                 |                  |                  |     re-render  |
   |                |                 |                  |                  |     pipeline   |
   |                |                 |                  |                  |                |
   | (IME) starts   |                 |                  |                  |                |
   | composing      |                 |                  |                  |                |
   |-------------------------------------------->|                  |                |
   |                |                 |                  |                  |                |
   |                |                 |                  | composition      |                |
   |                |                 |                  | start            |                |
   |                |                 |<-----------------|                  |                |
   |                |                 |                  |                  |                |
   |                |                 | set composing =  |                  |                |
   |                |                 | true             |                  |                |
   |                |                 |                  |                  |                |
   | composing      |                 |                  |                  |                |
   | (intermediate  |                 |                  |                  |                |
   |  chars)        |                 |                  |                  |                |
   |-------------------------------------------->|                  |                |
   |                |                 |                  |                  |                |
   |                |                 |                  | composition      |                |
   |                |                 |                  | update           |                |
   |                |                 |<-----------------|                  |                |
   |                |                 |                  |                  |                |
   |                |                 | render composing |                  |                |
   |                |                 | text with        |                  |                |
   |                |                 | underline        |                  |                |
   |                |                 |------------------------------------------------------->|
   |                |                 |                  |                  |                |
   | commits        |                 |                  |                  |                |
   | composition    |                 |                  |                  |                |
   |-------------------------------------------->|                  |                |
   |                |                 |                  |                  |                |
   |                |                 |                  | composition      |                |
   |                |                 |                  | end              |                |
   |                |                 |<-----------------|                  |                |
   |                |                 |                  |                  |                |
   |                |                 | composing = false|                  |                |
   |                |                 | sync final value |                  |                |
   |                |                 |---------------------------------->|                |
   |                |                 |                  |                  |                |
   |                |                 | trigger re-render|                  |                |
   |                |                 |------------------------------------------------------->|
   |                |                 |                  |                  |                |
```

---

## 5. Scroll Interaction

User scrolls a container with `overflow: auto` using the mouse wheel.

```
  Browser        CanvasDisplay    EventDispatcher    CoordMapper    HitTestBuffer    ScrollState    Renderer
   |                  |                 |                |               |               |              |
   | wheel event      |                 |                |               |               |              |
   | (deltaY: 120)    |                 |                |               |               |              |
   | at (px: 300,200) |                 |                |               |               |              |
   |----------------->|                 |                |               |               |              |
   |                  |                 |                |               |               |              |
   |                  | onWheel(px,     |                |               |               |              |
   |                  |   deltaY)       |                |               |               |              |
   |                  |---------------->|                |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | pxToCol(300)   |               |               |              |
   |                  |                 | pxToRow(200)   |               |               |              |
   |                  |                 |--------------->|               |               |              |
   |                  |                 | col=34, row=14 |               |               |              |
   |                  |                 |<---------------|               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | get(34, 14)    |               |               |              |
   |                  |                 |------------------------------>|               |              |
   |                  |                 | <div.scroll>   |               |               |              |
   |                  |                 |<------------------------------|               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | walk ancestors |               |               |              |
   |                  |                 | to find nearest|               |               |              |
   |                  |                 | scrollable     |               |               |              |
   |                  |                 | container      |               |               |              |
   |                  |                 | (overflow:auto |               |               |              |
   |                  |                 |  or scroll)    |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | found:         |               |               |              |
   |                  |                 | <div.scroll>   |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | deltaY -> char |               |               |              |
   |                  |                 | rows (120px /  |               |               |              |
   |                  |                 | cellH = ~3     |               |               |              |
   |                  |                 | rows)          |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | getScrollState |               |               |              |
   |                  |                 | (element)      |               |               |              |
   |                  |                 |---------------------------------------------->|              |
   |                  |                 | {scrollTop: 0, |               |               |              |
   |                  |                 |  maxScroll: 50}|               |               |              |
   |                  |                 |<----------------------------------------------|              |
   |                  |                 |                |               |               |              |
   |                  |                 | newScrollTop = |               |               |              |
   |                  |                 | clamp(0+3,     |               |               |              |
   |                  |                 |       0, 50)   |               |               |              |
   |                  |                 | = 3            |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | setScrollState |               |               |              |
   |                  |                 | (element, 3)   |               |               |              |
   |                  |                 |---------------------------------------------->|              |
   |                  |                 |                |               |               |              |
   |                  |                 | also set on    |               |               |              |
   |                  |                 | shadow DOM     |               |               |              |
   |                  |                 | element:       |               |               |              |
   |                  |                 | el.scrollTop=  |               |               |              |
   |                  |                 | 3*cellH        |               |               |              |
   |                  |                 |                |               |               |              |
   |                  |                 | trigger        |               |               |              |
   |                  |                 | re-render      |               |               |              |
   |                  |                 |------------------------------------------------------------->|
   |                  |                 |                |               |               |              |
   |                  |                 |                |               |               |   re-render  |
   |                  |                 |                |               |               |   pipeline   |
   |                  |                 |                |               |               |   (rasterizer|
   |                  |                 |                |               |               |   clips at   |
   |                  |                 |                |               |               |   container  |
   |                  |                 |                |               |               |   bounds,    |
   |                  |                 |                |               |               |   draws      |
   |                  |                 |                |               |               |   scrollbar) |
   |                  |                 |                |               |               |              |
```

---

## 6. Drag Interaction

User drags a draggable element (e.g., a dialog title bar or a slider thumb).

```
  User         CanvasDisplay    EventDispatcher    CoordMapper    HitTestBuffer    DragState     Renderer
   |                |                 |                |               |               |              |
   | mousedown      |                 |                |               |               |              |
   | at (120, 40)   |                 |                |               |               |              |
   |--------------->|                 |                |               |               |              |
   |                | onMouseDown     |                |               |               |              |
   |                |---------------->|                |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | pxToCol/Row    |               |               |              |
   |                |                 |--------------->|               |               |              |
   |                |                 | col=14, row=3  |               |               |              |
   |                |                 |<---------------|               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | get(14, 3)     |               |               |              |
   |                |                 |------------------------------>|               |              |
   |                |                 | <div.drag-     |               |               |              |
   |                |                 |  handle>       |               |               |              |
   |                |                 |<------------------------------|               |              |
   |                |                 |                |               |               |              |
   |                |                 | check          |               |               |              |
   |                |                 | draggable attr |               |               |              |
   |                |                 | or data-drag   |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | initDrag(      |               |               |              |
   |                |                 |   element,     |               |               |              |
   |                |                 |   col=14,      |               |               |              |
   |                |                 |   row=3)       |               |               |              |
   |                |                 |---------------------------------------------->|              |
   |                |                 |                |               |               |              |
   |                |                 |                |               |  {target,     |              |
   |                |                 |                |               |   startCol:14,|              |
   |                |                 |                |               |   startRow:3, |              |
   |                |                 |                |               |   active:true}|              |
   |                |                 |                |               |               |              |
   |                |                 | dispatch       |               |               |              |
   |                |                 | "dragstart"    |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | set cursor =   |               |               |              |
   |                |                 | "grabbing"     |               |               |              |
   |                |                 |                |               |               |              |
   | mousemove      |                 |                |               |               |              |
   | at (180, 70)   |                 |                |               |               |              |
   |--------------->|                 |                |               |               |              |
   |                | onMouseMove     |                |               |               |              |
   |                |---------------->|                |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | isDragging?    |               |               |              |
   |                |                 |---------------------------------------------->|              |
   |                |                 | yes            |               |               |              |
   |                |                 |<----------------------------------------------|              |
   |                |                 |                |               |               |              |
   |                |                 | pxToCol/Row    |               |               |              |
   |                |                 |--------------->|               |               |              |
   |                |                 | col=21, row=5  |               |               |              |
   |                |                 |<---------------|               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | deltaCol = 7   |               |               |              |
   |                |                 | deltaRow = 2   |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | dispatch "drag"|               |               |              |
   |                |                 | with delta     |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | update target  |               |               |              |
   |                |                 | position in    |               |               |              |
   |                |                 | shadow DOM     |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | trigger        |               |               |              |
   |                |                 | re-render      |               |               |              |
   |                |                 |------------------------------------------------------------->|
   |                |                 |                |               |               |              |
   | mouseup        |                 |                |               |               |              |
   | at (220, 85)   |                 |                |               |               |              |
   |--------------->|                 |                |               |               |              |
   |                | onMouseUp       |                |               |               |              |
   |                |---------------->|                |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | isDragging?    |               |               |              |
   |                |                 |---------------------------------------------->|              |
   |                |                 | yes            |               |               |              |
   |                |                 |<----------------------------------------------|              |
   |                |                 |                |               |               |              |
   |                |                 | finalizeDrag() |               |               |              |
   |                |                 |---------------------------------------------->|              |
   |                |                 |                |               | active: false |              |
   |                |                 |                |               |               |              |
   |                |                 | dispatch       |               |               |              |
   |                |                 | "dragend"      |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | set cursor =   |               |               |              |
   |                |                 | "default"      |               |               |              |
   |                |                 |                |               |               |              |
   |                |                 | trigger        |               |               |              |
   |                |                 | re-render      |               |               |              |
   |                |                 |------------------------------------------------------------->|
   |                |                 |                |               |               |              |
```

---

## Event Dispatch Detail: Overlay Priority

When an overlay is active, it intercepts events before they reach normal content.

```
  EventDispatcher    OverlayMgr     HitTestBuffer    OverlayContent    NormalContent
       |                 |                |                 |                 |
       | click at        |                |                 |                 |
       | (col, row)      |                |                 |                 |
       |                 |                |                 |                 |
       | hasActive       |                |                 |                 |
       | Overlay()?      |                |                 |                 |
       |---------------->|                |                 |                 |
       | yes             |                |                 |                 |
       |<----------------|                |                 |                 |
       |                 |                |                 |                 |
       | isInsideOverlay |                |                 |                 |
       | (col, row)?     |                |                 |                 |
       |---------------->|                |                 |                 |
       |                 |                |                 |                 |
       |--- [if YES] --->|                |                 |                 |
       |                 | dispatch to    |                 |                 |
       |                 | overlay content|                 |                 |
       |                 |------------------------------>|                 |
       |                 |                |                 | handle event   |
       |                 |                |                 | (e.g., select  |
       |                 |                |                 |  option)       |
       |                 |                |                 |                 |
       |--- [if NO] ---->|                |                 |                 |
       |                 | click outside  |                 |                 |
       |                 | -> close       |                 |                 |
       |                 | overlay        |                 |                 |
       |                 |                |                 |                 |
       |                 | trigger        |                 |                 |
       |                 | re-render      |                 |                 |
       |                 |                |                 |                 |
       | (event NOT      |                |                 |                 |
       |  forwarded to   |                |                 |                 |
       |  normal content)|                |                 |                 |
       |                 |                |                 |                 |
```
