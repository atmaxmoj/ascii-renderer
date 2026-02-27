// Public API
export { AsciiRenderer } from './AsciiRenderer.js';

// Types
export type {
  Cell,
  CharRect,
  PixelRect,
  LayoutNode,
  StackingContext,
  Theme,
  AsciiRendererOptions,
  AsciiEvent,
  BorderCharSet,
  ComputedStyleInfo,
} from './types.js';

// Utilities (for advanced usage)
export { CharGrid } from './display/CharGrid.js';
export { TextExporter } from './export/TextExporter.js';
export { CoordinateMapper } from './layout/CoordinateMapper.js';
export { HitTestBuffer } from './events/HitTestBuffer.js';
export { SelectionManager } from './events/SelectionManager.js';
export type { SelectionMode, SelectionGranularity } from './events/SelectionManager.js';

// Mermaid support
export { mermaidToHtml, preprocessMermaid } from './mermaid/index.js';
export type { FlowchartDef, SequenceDef, MermaidDef } from './mermaid/index.js';
