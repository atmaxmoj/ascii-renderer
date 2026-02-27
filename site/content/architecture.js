import { heading, p } from '../utils.js';

// ——————————————————————————————————————————————
// Render Pipeline
// ——————————————————————————————————————————————
const pipelineDiagram = `<div data-mermaid>graph TD
    A["HTML/CSS (string)"] --> B["Shadow DOM Injection"]
    B --> C["Browser Layout Engine"]
    C --> D["DomWalker"]
    D --> E["CoordinateMapper"]
    E --> F["Rasterizer"]
    F --> G["OverlayManager"]
    G --> H["CanvasDisplay"]
    H --> I["TextExporter"]
</div>`;

const pipeline = `
  ${heading('Render Pipeline', 'sec-pipeline')}
  ${p('The full pipeline from HTML/CSS input to Canvas output and text export:')}
  <div style="display:flex; justify-content:center; margin:8px 0;">
    ${pipelineDiagram}
  </div>
`;

// ——————————————————————————————————————————————
// Module Architecture
// ——————————————————————————————————————————————
const subsystemsDiagram = `<div data-mermaid>graph TD
    API["AsciiRenderer (Public API)"] --> DOM["Hidden DOM\\n(Shadow DOM)"]
    API --> RENDER["Render\\nPipeline"]
    API --> EVENT["Event\\nSystem"]
    API --> OVERLAY["Overlay\\nManager"]
</div>`;

const depTree = `<div data-mermaid>tree
AsciiRenderer
  [ShadowDomHost]
    browser DOM APIs
  [DomWalker]
    ShadowDomHost
    CoordinateMapper
  [Rasterizer]
    CharGrid
    BoxRenderer
    TextRenderer
    TableRenderer
    FormRenderer
    ListRenderer
  [OverlayManager]
    CharGrid (overlay)
    Rasterizer (re-used)
  [CanvasDisplay]
    CharGrid (reads for rendering)
  [HitTestBuffer]
  [EventDispatcher]
    CoordinateMapper
    HitTestBuffer
    OverlayManager
  [TextExporter]
    CharGrid (reads for export)
</div>`;

const modules = `
  ${heading('Module Architecture', 'sec-modules')}
  ${p('Four cooperating subsystems:')}
  <div style="display:flex; justify-content:center; margin:8px 0;">
    ${subsystemsDiagram}
  </div>
  ${p('Module dependency tree:')}
  <div style="display:flex; justify-content:center; margin:8px 0;">
    ${depTree}
  </div>
`;

export const architecture = pipeline + modules;
