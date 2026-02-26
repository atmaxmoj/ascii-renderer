import { heading, p, esc, diagram } from '../utils.js';

// ——————————————————————————————————————————————
// 1. Initialization
// ——————————————————————————————————————————————
const initArt = esc(
`User          AsciiRenderer     CanvasDisplay     ShadowDomHost     CoordMapper
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
 |                 | create CharGrid, HitTestBuffer    |                |
 |                 | create Rasterizer, OverlayMgr     |                |
 |                 | create EventDispatcher, Exporter   |                |
 |                 |                 |                  |                |
 |                 | attach event listeners to canvas   |                |
 |                 |                 |                  |                |
 | <instance>      |                 |                  |                |
 |<----------------|                 |                  |                |
 |                 |                 |                  |                |`
);

// ——————————————————————————————————————————————
// 2. Render
// ——————————————————————————————————————————————
const renderArt = esc(
`User       AsciiRenderer   ShadowDomHost   DomWalker   CoordMapper   Rasterizer   OverlayMgr   CanvasDisp
 |              |               |              |             |             |             |            |
 | setContent   |               |              |             |             |             |            |
 | (html, css)  |               |              |             |             |             |            |
 |------------->|               |              |             |             |             |            |
 |              |               |              |             |             |             |            |
 |              | inject(html)  |              |             |             |             |            |
 |              |-------------->|              |             |             |             |            |
 |              |               | innerHTML =  |             |             |             |            |
 |              |               | html         |             |             |             |            |
 |              |               | force reflow |             |             |             |            |
 |              |               |              |             |             |             |            |
 |              | walk(root)    |              |             |             |             |            |
 |              |-------------------------->|             |             |             |            |
 |              |               |              | for each    |             |             |            |
 |              |               |              | element:    |             |             |            |
 |              |               |              | getRect()   |             |             |            |
 |              |               |              | getStyle()  |             |             |            |
 |              |               |              | pxToGrid()  |             |             |            |
 |              |               |              |------------>|             |             |            |
 |              |               |              | GridRect    |             |             |            |
 |              |               |              |<------------|             |             |            |
 |              |               |              | build tree  |             |             |            |
 |              |               |              |             |             |             |            |
 |              | layoutTree    |              |             |             |             |            |
 |              |<--------------------------|             |             |             |            |
 |              |               |              |             |             |             |            |
 |              | grid.clear()  |              |             |             |             |            |
 |              | hitTest.clear()              |             |             |             |            |
 |              |               |              |             |             |             |            |
 |              | rasterize(tree, grid, hitTest)              |             |             |            |
 |              |------------------------------------------->|             |             |            |
 |              |               |              |             | sort stacking|             |            |
 |              |               |              |             | write chars  |             |            |
 |              |               |              |             |             |             |            |
 |              | paintOverlays(grid, hitTest)  |             |             |             |            |
 |              |------------------------------------------------------------>|            |
 |              |               |              |             |             |             |            |
 |              | render(grid)  |              |             |             |             |            |
 |              |------------------------------------------------------------------------>|
 |              |               |              |             |             |  fillText()  |            |
 |              |               |              |             |             |  per cell    |            |
 |              |               |              |             |             |             |            |
 | <done>       |               |              |             |             |             |            |
 |<-------------|               |              |             |             |             |            |`
);

// ——————————————————————————————————————————————
// 3. Click
// ——————————————————————————————————————————————
const clickArt = esc(
`Browser      CanvasDisplay   EventDispatcher   CoordMapper   HitTestBuffer   OverlayMgr   Target
 |                |                |               |              |              |            |
 | mousedown      |                |               |              |              |            |
 | (px: 245,118)  |                |               |              |              |            |
 |--------------->|                |               |              |              |            |
 |                | onMouseDown    |               |              |              |            |
 |                |--------------->|               |              |              |            |
 |                |                |               |              |              |            |
 |                |                | pxToCol(245)  |              |              |            |
 |                |                | pxToRow(118)  |              |              |            |
 |                |                |-------------->|              |              |            |
 |                |                | col=28, row=8 |              |              |            |
 |                |                |<--------------|              |              |            |
 |                |                |               |              |              |            |
 |                |                | hasOverlay()? |              |              |            |
 |                |                |------------------------------------------>|            |
 |                |                | no            |              |              |            |
 |                |                |<------------------------------------------|            |
 |                |                |               |              |              |            |
 |                |                | get(28, 8)    |              |              |            |
 |                |                |----------------------------->|              |            |
 |                |                | <button>      |              |              |            |
 |                |                |<-----------------------------|              |            |
 |                |                |               |              |              |            |
 |                |                | update focus  |              |              |            |
 |                |                | set cursor    |              |              |            |
 |                |                | dispatch      |              |              |            |
 |                |                | "click"       |              |              |            |
 |                |                |-------------------------------------------------------->|
 |                |                |               |              |              | handler    |
 |                |                |               |              |              | runs       |
 |                |                |               |              |              |            |`
);

// ——————————————————————————————————————————————
// 4. Text Input & IME
// ——————————————————————————————————————————————
const inputArt = esc(
`User       CanvasDisplay   EventDispatcher   HiddenTextarea   ShadowInput   Renderer
 |              |                |                |               |             |
 | click input  |                |                |               |             |
 |------------->|                |                |               |             |
 |              | mousedown      |                |               |             |
 |              |--------------->|                |               |             |
 |              |                | hit-test ->    |               |             |
 |              |                | <input>        |               |             |
 |              |                | setFocus()     |               |             |
 |              |                | show hidden    |               |             |
 |              |                | textarea       |               |             |
 |              |                |--------------->|               |             |
 |              |                |                | .focus()      |             |
 |              |                |                | .value = val  |             |
 |              |                |                |               |             |
 | types "h"    |                |                |               |             |
 |-------------------------------------->|               |             |
 |              |                |                | "input" event |             |
 |              |                |<---------------|               |             |
 |              |                | sync value     |               |             |
 |              |                |------------------------------>|             |
 |              |                | re-render      |               |             |
 |              |                |------------------------------------------->|
 |              |                |                |               |             |
 | IME compose  |                |                |               |             |
 |-------------------------------------->|               |             |
 |              |                |                | composition   |             |
 |              |                |                | start         |             |
 |              |                |<---------------|               |             |
 |              |                | composing=true |               |             |
 |              |                |                |               |             |
 | intermediate |                |                |               |             |
 |-------------------------------------->|               |             |
 |              |                |                | composition   |             |
 |              |                |<---------------| update        |             |
 |              |                | render with    |               |             |
 |              |                | underline      |               |             |
 |              |                |------------------------------------------->|
 |              |                |                |               |             |
 | commit       |                |                |               |             |
 |-------------------------------------->|               |             |
 |              |                |                | composition   |             |
 |              |                |<---------------| end           |             |
 |              |                | composing=false|               |             |
 |              |                | sync final val |               |             |
 |              |                |------------------------------>|             |
 |              |                | re-render      |               |             |
 |              |                |------------------------------------------->|`
);

// ——————————————————————————————————————————————
// 5. Scroll
// ——————————————————————————————————————————————
const scrollArt = esc(
`Browser    CanvasDisplay   EventDispatcher   CoordMapper   HitTestBuffer   ScrollState   Renderer
 |              |                |               |              |              |             |
 | wheel event  |                |               |              |              |             |
 | (deltaY:120) |                |               |              |              |             |
 | at (300,200) |                |               |              |              |             |
 |------------->|                |               |              |              |             |
 |              | onWheel        |               |              |              |             |
 |              |--------------->|               |              |              |             |
 |              |                | pxToCol(300)  |              |              |             |
 |              |                | pxToRow(200)  |              |              |             |
 |              |                |-------------->|              |              |             |
 |              |                | col=34,row=14 |              |              |             |
 |              |                |<--------------|              |              |             |
 |              |                |               |              |              |             |
 |              |                | get(34,14)    |              |              |             |
 |              |                |----------------------------->|              |             |
 |              |                | <div.scroll>  |              |              |             |
 |              |                |<-----------------------------|              |             |
 |              |                |               |              |              |             |
 |              |                | find scrollable ancestor     |              |             |
 |              |                | deltaY -> char rows (~3)    |              |             |
 |              |                |               |              |              |             |
 |              |                | getScrollState|              |              |             |
 |              |                |------------------------------------------>|             |
 |              |                | {top:0,max:50}|              |              |             |
 |              |                |<------------------------------------------|             |
 |              |                |               |              |              |             |
 |              |                | clamp(0+3, 0, 50) = 3       |              |             |
 |              |                | setScrollState(el, 3)       |              |             |
 |              |                |------------------------------------------>|             |
 |              |                |               |              |              |             |
 |              |                | re-render     |              |              |             |
 |              |                |-------------------------------------------------------->|`
);

// ——————————————————————————————————————————————
// 6. Drag
// ——————————————————————————————————————————————
const dragArt = esc(
`User       CanvasDisplay   EventDispatcher   CoordMapper   HitTestBuffer   DragState   Renderer
 |              |                |               |              |             |            |
 | mousedown    |                |               |              |             |            |
 | at (120,40)  |                |               |              |             |            |
 |------------->|                |               |              |             |            |
 |              | onMouseDown    |               |              |             |            |
 |              |--------------->|               |              |             |            |
 |              |                | pxToCol/Row   |              |             |            |
 |              |                |-------------->|              |             |            |
 |              |                | col=14,row=3  |              |             |            |
 |              |                |<--------------|              |             |            |
 |              |                | get(14,3)     |              |             |            |
 |              |                |----------------------------->|             |            |
 |              |                | <div.handle>  |              |             |            |
 |              |                |<-----------------------------|             |            |
 |              |                |               |              |             |            |
 |              |                | check draggable              |             |            |
 |              |                | initDrag(el, col=14, row=3)  |             |            |
 |              |                |----------------------------------------->|            |
 |              |                | dispatch "dragstart"         |             |            |
 |              |                | set cursor = "grabbing"      |             |            |
 |              |                |               |              |             |            |
 | mousemove    |                |               |              |             |            |
 | at (180,70)  |                |               |              |             |            |
 |------------->|                |               |              |             |            |
 |              | onMouseMove    |               |              |             |            |
 |              |--------------->|               |              |             |            |
 |              |                | isDragging?   |              |             |            |
 |              |                |----------------------------------------->|            |
 |              |                | yes           |              |             |            |
 |              |                |<-----------------------------------------|            |
 |              |                | pxToCol/Row -> col=21,row=5  |             |            |
 |              |                | delta: col=7, row=2          |             |            |
 |              |                | dispatch "drag" + re-render  |             |            |
 |              |                |------------------------------------------------------->|
 |              |                |               |              |             |            |
 | mouseup      |                |               |              |             |            |
 |------------->|                |               |              |             |            |
 |              | onMouseUp      |               |              |             |            |
 |              |--------------->|               |              |             |            |
 |              |                | finalizeDrag()|              |             |            |
 |              |                |----------------------------------------->|            |
 |              |                | dispatch "dragend"           |             |            |
 |              |                | cursor = "default"           |             |            |
 |              |                | re-render     |              |             |            |
 |              |                |------------------------------------------------------->|`
);

export const sequences = [
  { title: 'Sequence: Initialization',    id: 'sec-seq-init',   desc: 'When <code style="color:#79c0ff;">new AsciiRenderer(container, options)</code> is called:', art: initArt },
  { title: 'Sequence: Render',            id: 'sec-seq-render', desc: 'When <code style="color:#79c0ff;">renderer.setContent(html)</code> is called:',              art: renderArt },
  { title: 'Sequence: Click Interaction', id: 'sec-seq-click',  desc: 'User clicks on a rendered button in the ASCII canvas:',                                     art: clickArt },
  { title: 'Sequence: Text Input & IME',  id: 'sec-seq-input',  desc: 'User focuses an input field and types, including IME composition:',                         art: inputArt },
  { title: 'Sequence: Scroll',            id: 'sec-seq-scroll', desc: 'User scrolls a container with <code style="color:#79c0ff;">overflow: auto</code>:',         art: scrollArt },
  { title: 'Sequence: Drag',              id: 'sec-seq-drag',   desc: 'User drags a draggable element:',                                                           art: dragArt },
].map(s => `
  ${heading(s.title, s.id)}
  ${p(s.desc)}
  ${diagram(s.art)}
`).join('');
