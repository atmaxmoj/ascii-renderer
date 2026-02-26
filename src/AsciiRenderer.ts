import {
  AsciiRendererOptions,
  AsciiEvent,
  Theme,
  LayoutNode,
  DEFAULT_THEME,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
} from './types.js';
import { stringDisplayWidth } from './utils/charWidth.js';
import { LayoutEngine } from './layout/LayoutEngine.js';
import { DomWalker } from './layout/DomWalker.js';
import { CoordinateMapper } from './layout/CoordinateMapper.js';
import { CharGrid } from './display/CharGrid.js';
import { CanvasDisplay } from './display/CanvasDisplay.js';
import { Rasterizer } from './rasterizer/Rasterizer.js';
import { OverlayManager } from './rasterizer/OverlayManager.js';
import { HitTestBuffer } from './events/HitTestBuffer.js';
import { EventManager } from './events/EventManager.js';
import { SelectionManager } from './events/SelectionManager.js';
import { TextInputHandler } from './events/TextInputHandler.js';
import { TextExporter } from './export/TextExporter.js';

type EventCallback = (event: AsciiEvent) => void;

/**
 * Main orchestrator for the ASCII rendering engine.
 *
 * Usage:
 *   const renderer = new AsciiRenderer({ target: document.getElementById('app') });
 *   renderer.setContent('<div><h1>Hello</h1><p>World</p></div>');
 *   console.log(renderer.toText());
 */
export class AsciiRenderer {
  private cols: number;
  private rows: number;
  private font: string;
  private fontSize: number;
  private theme: Theme;

  private target: HTMLElement;
  private canvas: HTMLCanvasElement;
  private layoutEngine: LayoutEngine;
  private domWalker: DomWalker;
  private mapper: CoordinateMapper;
  private grid: CharGrid;
  private display: CanvasDisplay;
  private rasterizer: Rasterizer;
  private overlayManager: OverlayManager;
  private hitTestBuffer: HitTestBuffer;
  private eventManager: EventManager;
  private textInputHandler: TextInputHandler;
  private textExporter: TextExporter;
  private mutationObserver: MutationObserver | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number = 0;
  private autoResize: boolean;

  private layoutTree: LayoutNode | null = null;
  private elementMap: Map<number, Element> = new Map();
  private nodeMap: Map<number, LayoutNode> = new Map();
  private renderPending: boolean = false;
  private currentHtml: string = '';

  // Viewport scroll state
  private scrollY: number = 0;
  private maxScrollY: number = 0;

  // Range slider drag state
  private activeRangeInput: HTMLInputElement | null = null;

  // Textarea resize drag state
  private resizingTextarea: {
    element: HTMLTextAreaElement;
    startCol: number;
    startRow: number;
    startWidth: number;
    startHeight: number;
  } | null = null;

  // Select dropdown state
  private selectDropdownState: {
    moveUp: () => void;
    moveDown: () => void;
    confirm: () => void;
  } | null = null;

  // Escape overlay: native HTML elements rendered on top of the canvas
  private escapeOverlay: HTMLDivElement;
  private escapedState: Map<Element, {
    parent: Node;
    nextSibling: Node | null;
    savedStyle: string;
  }> = new Map();

  constructor(options: AsciiRendererOptions) {
    this.target = options.target;
    this.cols = options.cols ?? DEFAULT_COLS;
    this.rows = options.rows ?? DEFAULT_ROWS;
    this.font = options.font ?? DEFAULT_FONT;
    this.fontSize = options.fontSize ?? DEFAULT_FONT_SIZE;
    this.theme = { ...DEFAULT_THEME, ...options.theme };
    this.autoResize = options.autoResize ?? false;

    // Set up target as positioning context for the overlay
    const targetPos = window.getComputedStyle(this.target).position;
    if (targetPos === 'static' || !targetPos) {
      this.target.style.position = 'relative';
    }

    // Create canvas (stays in normal flow so the container sizes correctly)
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.target.appendChild(this.canvas);

    // Create escape overlay (absolute, layered above canvas for native HTML elements)
    this.escapeOverlay = document.createElement('div');
    this.escapeOverlay.style.position = 'absolute';
    this.escapeOverlay.style.top = '0';
    this.escapeOverlay.style.left = '0';
    this.escapeOverlay.style.width = '100%';
    this.escapeOverlay.style.height = '100%';
    this.escapeOverlay.style.pointerEvents = 'none';
    this.escapeOverlay.style.overflow = 'hidden';
    // Match Shadow DOM's global box-sizing so escaped elements keep their measured dimensions
    const overlayStyle = document.createElement('style');
    overlayStyle.textContent = `.ascii-escape-overlay, .ascii-escape-overlay * { box-sizing: border-box; }`;
    this.escapeOverlay.classList.add('ascii-escape-overlay');
    this.target.appendChild(overlayStyle);
    this.target.appendChild(this.escapeOverlay);

    // Initialize layout engine (creates hidden Shadow DOM)
    this.layoutEngine = new LayoutEngine(this.font, this.fontSize, this.theme.fg);

    // Coordinate mapper
    this.mapper = new CoordinateMapper(
      this.layoutEngine.getCellWidth(),
      this.layoutEngine.getCellHeight(),
    );

    // DOM walker
    this.domWalker = new DomWalker(this.mapper);

    // Character grid
    this.grid = new CharGrid(this.cols, this.rows);

    // Canvas display — use LayoutEngine's cell dimensions so canvas rendering
    // matches the coordinate mapper used for hit-testing
    this.display = new CanvasDisplay(
      this.canvas, this.font, this.fontSize, this.theme,
      this.layoutEngine.getCellWidth(), this.layoutEngine.getCellHeight(),
    );
    this.display.setupCanvas(this.cols, this.rows);

    // Overlay manager
    this.overlayManager = new OverlayManager();

    // Rasterizer
    this.rasterizer = new Rasterizer(this.overlayManager);

    // Hit-test buffer
    this.hitTestBuffer = new HitTestBuffer(this.cols, this.rows);

    // Event manager
    this.eventManager = new EventManager(this.canvas, this.mapper, this.hitTestBuffer);
    this.eventManager.setGrid(this.grid);
    this.eventManager.setRenderCallback(() => this.scheduleRender());

    // Text input handler
    this.textInputHandler = new TextInputHandler();
    this.textInputHandler.setRenderCallback(() => this.scheduleRender());

    // Wire click interactions for form controls
    this.eventManager.on('click', (e) => {
      // Check overlay first (e.g. select dropdown)
      if (this.overlayManager.handleClick(e.charCol, e.charRow)) {
        this.scheduleRender();
        return;
      }

      if (!e.element) return;

      const tag = e.element.tagName.toLowerCase();
      const type = e.element.getAttribute?.('type') || 'text';

      // Text inputs and textarea: activate TextInputHandler
      const isTextInput = (tag === 'input' && ['text', 'password', 'email', 'url', 'search', 'tel', 'number'].includes(type)) || tag === 'textarea';
      if (isTextInput) {
        for (const [id, el] of this.elementMap) {
          if (el === e.element) {
            this.textInputHandler.activate(id, e.element as HTMLInputElement | HTMLTextAreaElement);
            break;
          }
        }
        return;
      }

      this.textInputHandler.deactivate();

      // Range slider: click sets value based on cursor position
      if (tag === 'input' && type === 'range') {
        this.handleRangeClick(e.element as HTMLInputElement, e.charCol);
        return;
      }

      // Select: open dropdown overlay
      if (tag === 'select') {
        this.openSelectDropdown(e.element as HTMLSelectElement);
        return;
      }
    });

    // Range drag: mousedown on range starts dragging
    this.eventManager.on('mousedown', (e) => {
      if (!e.element) return;
      const tag = e.element.tagName.toLowerCase();
      const type = e.element.getAttribute?.('type') || '';
      if (tag === 'input' && type === 'range') {
        this.activeRangeInput = e.element as HTMLInputElement;
      }
      // Textarea resize: check if mousedown is on the resize handle (◢)
      if (tag === 'textarea') {
        const node = this.findNodeForElement(e.element);
        if (node) {
          const boxW = Math.max(node.charRect.width, 20);
          const boxH = Math.max(node.charRect.height, 4);
          const handleCol = node.charRect.col + boxW - 1;
          const handleRow = node.charRect.row + boxH - 1;
          if (e.charCol === handleCol && e.charRow === handleRow) {
            this.resizingTextarea = {
              element: e.element as HTMLTextAreaElement,
              startCol: e.charCol,
              startRow: e.charRow,
              startWidth: boxW,
              startHeight: boxH,
            };
          }
        }
      }
    });

    // Range drag + textarea resize: mousemove
    this.eventManager.on('mousemove', (e) => {
      if (this.activeRangeInput) {
        this.handleRangeClick(this.activeRangeInput, e.charCol);
      }
      if (this.resizingTextarea) {
        const deltaW = e.charCol - this.resizingTextarea.startCol;
        const deltaH = e.charRow - this.resizingTextarea.startRow;
        const newW = Math.max(20, this.resizingTextarea.startWidth + deltaW);
        const newH = Math.max(4, this.resizingTextarea.startHeight + deltaH);
        const cellW = this.layoutEngine.getCellWidth();
        const cellH = this.layoutEngine.getCellHeight();
        this.resizingTextarea.element.style.width = `${newW * cellW}px`;
        this.resizingTextarea.element.style.height = `${newH * cellH}px`;
        this.scheduleRender();
      }
    });

    // Range drag + textarea resize: mouseup
    this.eventManager.on('mouseup', () => {
      this.activeRangeInput = null;
      this.resizingTextarea = null;
    });

    // Keyboard: select dropdown navigation
    this.eventManager.on('keydown', (e) => {
      if (this.selectDropdownState) {
        const key = (e.originalEvent as KeyboardEvent).key;
        if (key === 'ArrowUp') {
          this.selectDropdownState.moveUp();
          this.scheduleRender();
        } else if (key === 'ArrowDown') {
          this.selectDropdownState.moveDown();
          this.scheduleRender();
        } else if (key === 'Enter') {
          this.selectDropdownState.confirm();
        } else if (key === 'Escape') {
          this.overlayManager.remove('select-dropdown');
          this.selectDropdownState = null;
          this.scheduleRender();
        }
      }
    });

    // Selection: Ctrl+A select all, Ctrl+C copy selected
    this.setupSelectionHandlers();

    // Viewport scroll via mouse wheel
    this.eventManager.on('wheel', (e) => {
      const wheelEvent = e.originalEvent as WheelEvent;
      const delta = Math.sign(wheelEvent.deltaY) * 3; // 3 rows per tick
      const newScrollY = Math.max(0, Math.min(this.maxScrollY, this.scrollY + delta));
      if (newScrollY !== this.scrollY) {
        this.scrollY = newScrollY;
        this.scheduleRender();
      }
    });

    // Text exporter
    this.textExporter = new TextExporter();

    // ResizeObserver for auto-resize
    if (this.autoResize) {
      this.setupResizeObserver();
    }
  }

  /** Set HTML content to render */
  setContent(html: string): void {
    this.currentHtml = html;
    this.scrollY = 0;
    const pixelWidth = this.layoutEngine.getPixelWidth(this.cols);
    const pixelHeight = this.layoutEngine.getPixelHeight(this.rows);
    this.layoutEngine.setContent(html, pixelWidth, pixelHeight);

    this.setupMutationObserver();
    this.renderFrame();
  }

  /** Force a re-render */
  render(): void {
    this.renderFrame();
  }

  /** Export current grid as plain text */
  toText(): string {
    return this.textExporter.toPlainText(this.grid);
  }

  /** Export current grid as ANSI-formatted text */
  toAnsi(): string {
    return this.textExporter.toAnsi(this.grid);
  }

  /** Copy current grid text to clipboard */
  async copyToClipboard(): Promise<void> {
    const text = this.toText();
    await navigator.clipboard.writeText(text);
  }

  /** Register an event listener */
  on(eventType: string, callback: EventCallback): void {
    this.eventManager.on(eventType, callback);
  }

  /** Remove an event listener */
  off(eventType: string, callback: EventCallback): void {
    this.eventManager.off(eventType, callback);
  }

  /** Get the CharGrid */
  getGrid(): CharGrid {
    return this.grid;
  }

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Get grid dimensions */
  getDimensions(): { cols: number; rows: number } {
    return { cols: this.cols, rows: this.rows };
  }

  /** Update theme */
  setTheme(theme: Partial<Theme>): void {
    this.theme = { ...this.theme, ...theme };
    this.display.setTheme(this.theme);
    if (theme.fg) {
      this.layoutEngine.setFgColor(theme.fg);
    }
    this.renderFrame();
  }

  /** Resize the grid */
  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.grid = new CharGrid(cols, rows);
    this.hitTestBuffer = new HitTestBuffer(cols, rows);
    this.display.setupCanvas(cols, rows);
    this.eventManager.setHitTestBuffer(this.hitTestBuffer);
    this.eventManager.setGrid(this.grid);

    // Re-layout content for new dimensions
    if (this.currentHtml) {
      const pixelWidth = this.layoutEngine.getPixelWidth(cols);
      const pixelHeight = this.layoutEngine.getPixelHeight(rows);
      this.layoutEngine.setContent(this.currentHtml, pixelWidth, pixelHeight);
    }

    this.renderFrame();
  }

  /** Start continuous animation rendering (for CSS animations) */
  startAnimationMode(): void {
    if (this.animationFrameId) return;
    const loop = () => {
      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  /** Stop continuous animation rendering */
  stopAnimationMode(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  /** Clean up all resources */
  destroy(): void {
    this.stopAnimationMode();
    this.eventManager.destroy();
    this.textInputHandler.destroy();
    this.layoutEngine.destroy();
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    // Clean up escape overlay — restore elements to Shadow DOM first
    this.restoreEscapedElements();
    if (this.escapeOverlay.parentNode) {
      this.escapeOverlay.parentNode.removeChild(this.escapeOverlay);
    }
  }

  /** Handle click on range slider — set value based on click position */
  private handleRangeClick(input: HTMLInputElement, clickCol: number): void {
    const node = this.findNodeForElement(input);
    if (!node) return;

    const min = parseFloat(input.min || '0');
    const max = parseFloat(input.max || '100');
    const trackWidth = Math.max(node.charRect.width - 2, 10);
    // clickCol relative to element start, minus 1 for the '◄' char
    const relativeCol = clickCol - node.charRect.col - 1;
    const ratio = Math.max(0, Math.min(1, relativeCol / (trackWidth - 1)));
    const newValue = min + ratio * (max - min);
    input.value = String(Math.round(newValue));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    this.scheduleRender();
  }

  /** Open select dropdown overlay */
  private openSelectDropdown(select: HTMLSelectElement): void {
    // Close any existing dropdown
    this.overlayManager.remove('select-dropdown');
    this.selectDropdownState = null;

    if (select.options.length === 0) return;

    const node = this.findNodeForElement(select);
    if (!node) return;

    const options = Array.from(select.options).map(o => o.text);
    const col = node.charRect.col;
    const row = node.charRect.row + 1; // Below the select element

    const dropdown = OverlayManager.createSelectDropdown(
      'select-dropdown',
      col,
      row,
      options,
      select.selectedIndex,
      Math.min(options.length, 8),
      this.rows,
      (index) => {
        select.selectedIndex = index;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.scheduleRender();
      },
      () => {
        this.overlayManager.remove('select-dropdown');
        this.selectDropdownState = null;
        this.scheduleRender();
      },
    );

    this.overlayManager.push(dropdown.overlay);
    this.selectDropdownState = dropdown;
    this.scheduleRender();
  }

  /** Find a LayoutNode for a given DOM element */
  private findNodeForElement(element: Element): LayoutNode | null {
    for (const [id, el] of this.elementMap) {
      if (el === element) {
        return this.nodeMap.get(id) || null;
      }
    }
    return null;
  }

  /** Get the selection manager for external access */
  getSelectionManager(): SelectionManager {
    return this.eventManager.getSelectionManager();
  }

  /** Set up selection-related event handlers */
  private setupSelectionHandlers(): void {
    // Ctrl+A: select all
    this.eventManager.on('selectall', () => {
      this.eventManager.getSelectionManager().selectAll(this.cols, this.rows);
      this.scheduleRender();
    });

    // Ctrl+C: copy selected text (or full grid if no selection)
    this.eventManager.on('copy', () => {
      const sm = this.eventManager.getSelectionManager();
      const text = sm.hasSelection() ? sm.getSelectedText(this.grid) : this.toText();
      navigator.clipboard.writeText(text);
    });
  }

  /** Set up ResizeObserver to auto-resize grid when container changes */
  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const cellW = this.layoutEngine.getCellWidth();
        const cellH = this.layoutEngine.getCellHeight();
        if (cellW <= 0 || cellH <= 0) continue;

        const newCols = Math.max(10, Math.floor(width / cellW));
        const newRows = Math.max(5, Math.floor(height / cellH));

        if (newCols !== this.cols || newRows !== this.rows) {
          this.resize(newCols, newRows);
        }
      }
    });
    this.resizeObserver.observe(this.target);
  }

  /** Schedule a render on next animation frame (debounces rapid state changes) */
  private scheduleRender(): void {
    if (this.renderPending) return;
    this.renderPending = true;
    requestAnimationFrame(() => {
      this.renderPending = false;
      this.renderFrame();
    });
  }

  /** Execute the full render pipeline */
  private renderFrame(): void {
    const root = this.layoutEngine.getContentRoot();
    if (!root.innerHTML) return;

    // Pause MutationObserver — moving escaped elements in/out triggers mutations
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    // Restore escaped elements to Shadow DOM so DomWalker can measure them
    this.restoreEscapedElements();

    // Walk DOM to build layout tree
    this.layoutTree = this.domWalker.walk(root);

    // Build element ID → DOM element map and node map
    this.elementMap = new Map();
    this.nodeMap = new Map();
    this.buildMaps(this.layoutTree);
    this.eventManager.setElementMap(this.elementMap);
    this.eventManager.setNodeMap(this.nodeMap);

    // Compute content height and apply viewport scroll offset
    const contentHeight = this.getContentHeight(this.layoutTree);
    this.maxScrollY = Math.max(0, contentHeight - this.rows);
    this.scrollY = Math.min(this.scrollY, this.maxScrollY);

    if (this.scrollY > 0) {
      this.applyScrollOffset(this.layoutTree, -this.scrollY);
    }

    // Rasterize layout tree onto grid (also fills hit-test buffer)
    this.rasterizer.rasterize(this.layoutTree, this.grid, this.hitTestBuffer);

    // Draw viewport scrollbar if content overflows
    if (this.maxScrollY > 0) {
      this.renderViewportScrollbar();
    }

    // Draw focus ring if an element is focused
    this.drawFocusRing();

    // Draw text input cursor if active
    this.drawTextCursor();

    // Draw selection highlight
    this.drawSelection();

    // Move escaped elements from Shadow DOM to overlay
    this.updateEscapeOverlay();

    // Render grid to canvas
    this.display.render(this.grid);

    // Reconnect MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    }
  }

  /** Recursively compute the maximum bottom row across all layout nodes */
  private getContentHeight(node: LayoutNode): number {
    // Skip option/optgroup — they're internal to <select> and not part of page layout
    if (node.tagName === 'option' || node.tagName === 'optgroup') {
      return 0;
    }
    let maxBottom = node.charRect.row + node.charRect.height;
    for (const child of node.children) {
      maxBottom = Math.max(maxBottom, this.getContentHeight(child));
    }
    return maxBottom;
  }

  /** Recursively offset all charRect.row values (mutates in place) */
  private applyScrollOffset(node: LayoutNode, offset: number): void {
    if (node.tagName === 'option' || node.tagName === 'optgroup') return;
    node.charRect.row += offset;
    for (const child of node.children) {
      this.applyScrollOffset(child, offset);
    }
  }

  /** Draw an ASCII scrollbar on the rightmost column */
  private renderViewportScrollbar(): void {
    const col = this.cols - 1;
    const trackStart = 1;
    const trackEnd = this.rows - 2;
    const trackLen = trackEnd - trackStart + 1;

    if (trackLen < 1) return;

    const contentHeight = this.maxScrollY + this.rows;
    const thumbSize = Math.max(1, Math.round(this.rows / contentHeight * trackLen));
    const thumbPos = trackStart + Math.round(this.scrollY / this.maxScrollY * (trackLen - thumbSize));

    // Up arrow
    this.grid.set(col, 0, { char: '▲', fg: '#888888', bg: '', elementId: 0 });

    // Track and thumb
    for (let r = trackStart; r <= trackEnd; r++) {
      if (r >= thumbPos && r < thumbPos + thumbSize) {
        this.grid.set(col, r, { char: '█', fg: '#aaaaaa', bg: '', elementId: 0 });
      } else {
        this.grid.set(col, r, { char: '░', fg: '#444444', bg: '', elementId: 0 });
      }
    }

    // Down arrow
    this.grid.set(col, this.rows - 1, { char: '▼', fg: '#888888', bg: '', elementId: 0 });
  }

  /** Draw a visual focus indicator around the focused element */
  private drawFocusRing(): void {
    const focusedId = this.eventManager.getFocusManager().getFocusedId();
    if (!focusedId) return;

    const node = this.nodeMap.get(focusedId);
    if (!node) return;

    const { col, row, width, height } = node.charRect;
    if (width <= 0 || height <= 0) return;

    // Draw bright border around focused element
    const fg = this.theme.focus;

    // Top and bottom edges
    for (let c = col; c < col + width; c++) {
      const topCell = this.grid.getRef(c, row);
      if (topCell) topCell.fg = fg;
      const bottomCell = this.grid.getRef(c, row + height - 1);
      if (bottomCell) bottomCell.fg = fg;
    }
    // Left and right edges
    for (let r = row; r < row + height; r++) {
      const leftCell = this.grid.getRef(col, r);
      if (leftCell) leftCell.fg = fg;
      const rightCell = this.grid.getRef(col + width - 1, r);
      if (rightCell) rightCell.fg = fg;
    }
  }

  /** Draw blinking cursor in active text input */
  private drawTextCursor(): void {
    if (!this.textInputHandler.isCursorVisible()) return;

    const activeId = this.textInputHandler.getActiveElementId();
    const node = this.nodeMap.get(activeId);
    if (!node) return;

    const cursorPos = this.textInputHandler.getCursorPosition();
    const value = this.textInputHandler.getValue();

    let cursorCol: number;
    let cursorRow: number;

    if (node.tagName === 'textarea') {
      // Textarea: find line and column from cursor offset in multi-line text
      const textBefore = value.substring(0, cursorPos);
      const lines = textBefore.split('\n');
      const lineIndex = lines.length - 1;
      const colInLine = stringDisplayWidth(lines[lineIndex]);
      cursorCol = node.charRect.col + 1 + colInLine; // +1 for left border
      cursorRow = node.charRect.row + 1 + lineIndex; // +1 for top border
    } else {
      // Single-line input: after "[" prefix + visual width of text before cursor
      cursorCol = node.charRect.col + 1 + stringDisplayWidth(value.substring(0, cursorPos));
      cursorRow = node.charRect.row;
    }

    if (this.grid.inBounds(cursorCol, cursorRow)) {
      const cell = this.grid.getRef(cursorCol, cursorRow);
      if (cell) {
        // Invert fg/bg for cursor
        const tmpFg = cell.fg;
        cell.fg = cell.bg;
        cell.bg = tmpFg;
      }
    }
  }

  /** Draw selection highlight by inverting fg/bg on selected cells */
  private drawSelection(): void {
    const sm = this.eventManager.getSelectionManager();
    if (!sm.hasSelection()) return;

    const selBg = this.theme.selection;
    const selFg = '#ffffff';

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (sm.isSelected(c, r)) {
          const cell = this.grid.getRef(c, r);
          if (cell) {
            cell.bg = selBg;
            cell.fg = selFg;
          }
        }
      }
    }
  }

  /** Restore escaped elements from the overlay back to their Shadow DOM positions */
  private restoreEscapedElements(): void {
    for (const [element, state] of this.escapedState) {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      // Restore original inline style
      (element as HTMLElement).style.cssText = state.savedStyle;
      state.parent.insertBefore(element, state.nextSibling);
    }
    this.escapedState.clear();
  }

  /** Move escaped elements from Shadow DOM into the overlay, positioned over the canvas */
  private updateEscapeOverlay(): void {
    if (!this.layoutTree) return;

    const cellW = this.layoutEngine.getCellWidth();
    const cellH = this.layoutEngine.getCellHeight();

    // Collect all escaped nodes from the layout tree
    const escapedNodes: LayoutNode[] = [];
    this.collectEscapedNodes(this.layoutTree, escapedNodes);

    for (const node of escapedNodes) {
      const el = node.element as HTMLElement;

      // Save state before moving (only on first move)
      if (!this.escapedState.has(node.element)) {
        this.escapedState.set(node.element, {
          parent: node.element.parentNode!,
          nextSibling: node.element.nextSibling,
          savedStyle: el.style.cssText,
        });
      }

      // Position element using charRect × cellSize — aligns exactly with the ASCII grid
      const { col, row, width, height } = node.charRect;
      el.style.position = 'absolute';
      el.style.left = `${col * cellW}px`;
      el.style.top = `${row * cellH}px`;
      el.style.width = `${width * cellW}px`;
      el.style.height = `${height * cellH}px`;
      el.style.overflow = 'hidden';
      el.style.margin = '0';
      el.style.pointerEvents = 'auto';
      // Inherit Shadow DOM typography so content fits the allocated space
      el.style.fontFamily = this.font;
      el.style.fontSize = `${this.fontSize}px`;
      el.style.lineHeight = '1';

      this.escapeOverlay.appendChild(el);
    }
  }

  /** Collect all escaped LayoutNodes from the tree */
  private collectEscapedNodes(node: LayoutNode, result: LayoutNode[]): void {
    if (node.isEscaped) {
      result.push(node);
      return; // Escaped nodes have no children in the layout tree
    }
    for (const child of node.children) {
      this.collectEscapedNodes(child, result);
    }
  }

  /** Recursively build element and node maps from the layout tree */
  private buildMaps(node: LayoutNode): void {
    this.elementMap.set(node.id, node.element);
    this.nodeMap.set(node.id, node);
    for (const child of node.children) {
      this.buildMaps(child);
    }
  }

  /** Set up MutationObserver to watch for DOM changes */
  private setupMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }

    this.mutationObserver = new MutationObserver(() => {
      this.scheduleRender();
    });

    this.mutationObserver.observe(this.layoutEngine.getContentRoot(), {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  }
}
