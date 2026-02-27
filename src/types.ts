/** A single character cell in the grid */
export interface Cell {
  char: string;
  fg: string;
  bg: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  elementId: number;
  /** True for continuation cell of a full-width (CJK) character */
  wide: boolean;
}

/** Rectangle in character-grid coordinates */
export interface CharRect {
  col: number;
  row: number;
  width: number;
  height: number;
}

/** Rectangle in pixel coordinates */
export interface PixelRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Computed style subset relevant to ASCII rendering */
export interface ComputedStyleInfo {
  display: string;
  position: string;
  overflow: string;
  overflowX: string;
  overflowY: string;
  zIndex: string;
  opacity: string;
  transform: string;
  visibility: string;
  color: string;
  backgroundColor: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  borderTopStyle: string;
  borderRightStyle: string;
  borderBottomStyle: string;
  borderLeftStyle: string;
  borderTopWidth: string;
  borderRightWidth: string;
  borderBottomWidth: string;
  borderLeftWidth: string;
  borderTopColor: string;
  borderRightColor: string;
  borderBottomColor: string;
  borderLeftColor: string;
  flexDirection: string;
  cursor: string;
  whiteSpace: string;
  textOverflow: string;
}

/** A node in the layout tree, one per DOM element */
export interface LayoutNode {
  id: number;
  element: Element;
  tagName: string;
  pixelRect: PixelRect;
  charRect: CharRect;
  style: ComputedStyleInfo;
  textContent: string | null;
  children: LayoutNode[];
  parent: LayoutNode | null;
  isTextNode: boolean;
  /** True if element has data-ascii-escape — rendered as native HTML overlay */
  isEscaped: boolean;
  /** For stacking context sorting */
  stackingOrder: number;
}

/** Stacking context tree node */
export interface StackingContext {
  node: LayoutNode;
  zIndex: number;
  children: StackingContext[];
}

/** Theme configuration */
export interface Theme {
  fg: string;
  bg: string;
  border: string;
  focus: string;
  link: string;
  selection: string;
}

/** Renderer configuration */
export interface AsciiRendererOptions {
  target: HTMLElement;
  cols?: number;
  rows?: number;
  font?: string;
  fontSize?: number;
  theme?: Partial<Theme>;
  /** Auto-resize grid when the target container changes size */
  autoResize?: boolean;
}

/** Event data emitted by the renderer */
export interface AsciiEvent {
  type: string;
  element: Element | null;
  charCol: number;
  charRow: number;
  originalEvent: Event;
}

/** Border character set for a given border style */
export interface BorderCharSet {
  horizontal: string;
  vertical: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

/** Default values */
export const DEFAULT_THEME: Theme = {
  fg: '#c0c0c0',
  bg: '#1a1a1a',
  border: '#404040',
  focus: '#ffffff',
  link: '#5599ff',
  selection: '#264f78',
};

export const DEFAULT_COLS = 120;
export const DEFAULT_ROWS = 40;
export const DEFAULT_FONT = 'JetBrains Mono, Consolas, monospace';
export const DEFAULT_FONT_SIZE = 14;

export function createEmptyCell(): Cell {
  return {
    char: ' ',
    fg: DEFAULT_THEME.fg,
    bg: DEFAULT_THEME.bg,
    bold: false,
    italic: false,
    underline: false,
    elementId: 0,
    wide: false,
  };
}
