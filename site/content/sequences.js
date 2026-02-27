import { heading, p } from '../utils.js';

// ——————————————————————————————————————————————
// 1. Initialization
// ——————————————————————————————————————————————
const initDiagram = `<div data-mermaid>sequenceDiagram
    participant User as "User"
    participant AR as "AsciiRenderer"
    participant CD as "CanvasDisplay"
    participant SDH as "ShadowDomHost"
    participant CM as "CoordMapper"
    User->>AR: new(container, options)
    AR->>CD: new(container, font, dpr)
    CD->>CD: create canvas, set font
    CD->>CD: measureCellSize()
    CD-->>AR: (cellW, cellH)
    AR->>CM: new(cellW, cellH)
    AR->>SDH: new()
    SDH->>SDH: create hidden div, attachShadow()
    AR->>AR: create CharGrid, HitTestBuffer
    AR->>AR: create Rasterizer, OverlayMgr
    AR-->>User: instance
</div>`;

// ——————————————————————————————————————————————
// 2. Render
// ——————————————————————————————————————————————
const renderDiagram = `<div data-mermaid>sequenceDiagram
    participant User as "User"
    participant AR as "AsciiRenderer"
    participant SDH as "ShadowDomHost"
    participant DW as "DomWalker"
    participant Rast as "Rasterizer"
    participant CD as "CanvasDisplay"
    User->>AR: setContent(html)
    AR->>SDH: inject(html)
    SDH->>SDH: innerHTML = html, force reflow
    AR->>DW: walk(root)
    DW->>DW: for each element: getRect, getStyle, pxToGrid
    DW-->>AR: layoutTree
    AR->>AR: grid.clear(), hitTest.clear()
    AR->>Rast: rasterize(tree, grid, hitTest)
    Rast->>Rast: sort stacking, write chars
    AR->>CD: render(grid)
    CD->>CD: fillText() per cell
    AR-->>User: done
</div>`;

// ——————————————————————————————————————————————
// 3. Click
// ——————————————————————————————————————————————
const clickDiagram = `<div data-mermaid>sequenceDiagram
    participant Browser as "Browser"
    participant CD as "CanvasDisplay"
    participant ED as "EventDispatcher"
    participant HT as "HitTestBuffer"
    participant Target as "Target"
    Browser->>CD: mousedown(px: 245,118)
    CD->>ED: onMouseDown
    ED->>ED: pxToCol(245), pxToRow(118)
    ED->>HT: get(col=28, row=8)
    HT-->>ED: button element
    ED->>ED: update focus, set cursor
    ED->>Target: dispatch "click"
</div>`;

// ——————————————————————————————————————————————
// 4. Text Input & IME
// ——————————————————————————————————————————————
const inputDiagram = `<div data-mermaid>sequenceDiagram
    participant User as "User"
    participant ED as "EventDispatcher"
    participant HT as "HiddenTextarea"
    participant SI as "ShadowInput"
    participant R as "Renderer"
    User->>ED: click input
    ED->>ED: hit-test -> input, setFocus()
    ED->>HT: show hidden textarea, .focus()
    User->>HT: types "h"
    HT->>ED: "input" event
    ED->>SI: sync value
    ED->>R: re-render
    User->>HT: IME compose
    HT->>ED: compositionstart
    ED->>ED: composing=true
    User->>HT: intermediate
    HT->>ED: compositionupdate
    ED->>R: render with underline
    User->>HT: commit
    HT->>ED: compositionend
    ED->>SI: sync final value
    ED->>R: re-render
</div>`;

// ——————————————————————————————————————————————
// 5. Scroll
// ——————————————————————————————————————————————
const scrollDiagram = `<div data-mermaid>sequenceDiagram
    participant Browser as "Browser"
    participant CD as "CanvasDisplay"
    participant ED as "EventDispatcher"
    participant HT as "HitTestBuffer"
    participant SS as "ScrollState"
    participant R as "Renderer"
    Browser->>CD: wheel(deltaY:120)
    CD->>ED: onWheel
    ED->>ED: pxToCol/Row
    ED->>HT: get(col,row)
    HT-->>ED: scrollable element
    ED->>SS: getScrollState
    SS-->>ED: top:0, max:50
    ED->>ED: clamp(0+3, 0, 50) = 3
    ED->>SS: setScrollState(el, 3)
    ED->>R: re-render
</div>`;

// ——————————————————————————————————————————————
// 6. Drag
// ——————————————————————————————————————————————
const dragDiagram = `<div data-mermaid>sequenceDiagram
    participant User as "User"
    participant CD as "CanvasDisplay"
    participant ED as "EventDispatcher"
    participant HT as "HitTestBuffer"
    participant DS as "DragState"
    participant R as "Renderer"
    User->>CD: mousedown(120,40)
    CD->>ED: onMouseDown
    ED->>ED: pxToCol/Row
    ED->>HT: get(14,3)
    HT-->>ED: draggable element
    ED->>DS: initDrag(el, 14, 3)
    ED->>ED: dispatch "dragstart"
    User->>CD: mousemove(180,70)
    CD->>ED: onMouseMove
    ED->>DS: isDragging? yes
    ED->>ED: delta: col=7, row=2
    ED->>R: dispatch "drag" + re-render
    User->>CD: mouseup
    CD->>ED: onMouseUp
    ED->>DS: finalizeDrag()
    ED->>R: dispatch "dragend" + re-render
</div>`;

export const sequences = [
  { title: 'Sequence: Initialization',    id: 'sec-seq-init',   desc: 'When <code style="color:#79c0ff;">new AsciiRenderer(container, options)</code> is called:', diagram: initDiagram },
  { title: 'Sequence: Render',            id: 'sec-seq-render', desc: 'When <code style="color:#79c0ff;">renderer.setContent(html)</code> is called:',              diagram: renderDiagram },
  { title: 'Sequence: Click Interaction', id: 'sec-seq-click',  desc: 'User clicks on a rendered button in the ASCII canvas:',                                     diagram: clickDiagram },
  { title: 'Sequence: Text Input & IME',  id: 'sec-seq-input',  desc: 'User focuses an input field and types, including IME composition:',                         diagram: inputDiagram },
  { title: 'Sequence: Scroll',            id: 'sec-seq-scroll', desc: 'User scrolls a container with <code style="color:#79c0ff;">overflow: auto</code>:',         diagram: scrollDiagram },
  { title: 'Sequence: Drag',              id: 'sec-seq-drag',   desc: 'User drags a draggable element:',                                                           diagram: dragDiagram },
].map(s => `
  ${heading(s.title, s.id)}
  ${p(s.desc)}
  <div style="margin:8px 0;">
    ${s.diagram}
  </div>
`).join('');
