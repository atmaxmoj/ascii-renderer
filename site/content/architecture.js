import { heading, p, esc, diagram } from '../utils.js';

// ——————————————————————————————————————————————
// Render Pipeline
// ——————————————————————————————————————————————
const pipelineArt = esc(
`    HTML/CSS (string)
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
+---------------------------+`
);

const pipeline = `
  ${heading('Render Pipeline', 'sec-pipeline')}
  ${p('The full pipeline from HTML/CSS input to Canvas output and text export:')}
  ${diagram(pipelineArt)}
`;

// ——————————————————————————————————————————————
// Module Architecture
// ——————————————————————————————————————————————
const subsystemsArt = esc(
`+-------------------------------------------------------+
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
+-------------+ +-------------+ +-----------+ +----------+`
);

const depTreeArt = esc(
`AsciiRenderer (public API)
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
        +-- CharGrid (reads for export)`
);

const modules = `
  ${heading('Module Architecture', 'sec-modules')}
  ${p('Four cooperating subsystems:')}
  ${diagram(subsystemsArt)}
  ${p('Module dependency tree:')}
  ${diagram(depTreeArt)}
`;

export const architecture = pipeline + modules;
