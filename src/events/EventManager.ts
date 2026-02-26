import { AsciiEvent, LayoutNode } from '../types.js';
import { CoordinateMapper } from '../layout/CoordinateMapper.js';
import { CharGrid } from '../display/CharGrid.js';
import { HitTestBuffer } from './HitTestBuffer.js';
import { FocusManager } from './FocusManager.js';
import { SelectionManager } from './SelectionManager.js';

type EventCallback = (event: AsciiEvent) => void;

/** Multi-click detection threshold in ms */
const MULTI_CLICK_MS = 500;

/**
 * Manages Canvas mouse/keyboard listeners, translates pixel positions
 * to character grid coordinates, performs hit-test lookups, and dispatches
 * synthetic events on hidden DOM elements.
 *
 * Handles: click, hover, focus management (Tab/Shift+Tab),
 * keyboard activation (Enter/Space), cursor management, and text selection
 * (drag, double-click word, triple-click line, Shift+click extend, Alt+drag block).
 */
export class EventManager {
  private canvas: HTMLCanvasElement;
  private mapper: CoordinateMapper;
  private hitTestBuffer: HitTestBuffer;
  private grid: CharGrid | null = null;
  private elementMap: Map<number, Element>;
  private nodeMap: Map<number, LayoutNode> = new Map();
  private listeners: Map<string, EventCallback[]>;
  private hoveredElementId: number = 0;
  private abortController: AbortController;
  private focusManager: FocusManager;
  private selectionManager: SelectionManager;
  private onRenderRequest: (() => void) | null = null;

  // Drag-detection state
  private mouseDownPos: { col: number; row: number } | null = null;
  private dragOccurred: boolean = false;

  // Multi-click detection
  private lastClickTime: number = 0;
  private lastClickCol: number = -1;
  private lastClickRow: number = -1;
  private clickCount: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    mapper: CoordinateMapper,
    hitTestBuffer: HitTestBuffer,
  ) {
    this.canvas = canvas;
    this.mapper = mapper;
    this.hitTestBuffer = hitTestBuffer;
    this.elementMap = new Map();
    this.listeners = new Map();
    this.focusManager = new FocusManager();
    this.selectionManager = new SelectionManager();
    this.abortController = new AbortController();

    this.setupListeners();
  }

  /** Register the element map (id → DOM element) */
  setElementMap(map: Map<number, Element>): void {
    this.elementMap = map;
    this.focusManager.updateFocusableElements(map);
  }

  /** Register the node map (id → LayoutNode) for escape checks */
  setNodeMap(map: Map<number, LayoutNode>): void {
    this.nodeMap = map;
  }

  /** Set the hit-test buffer (updated each render) */
  setHitTestBuffer(buffer: HitTestBuffer): void {
    this.hitTestBuffer = buffer;
  }

  /** Set the grid reference (needed for word-boundary detection) */
  setGrid(grid: CharGrid): void {
    this.grid = grid;
  }

  /** Set a callback to request re-render after state changes */
  setRenderCallback(cb: () => void): void {
    this.onRenderRequest = cb;
  }

  /** Get the focus manager */
  getFocusManager(): FocusManager {
    return this.focusManager;
  }

  /** Get the selection manager */
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  /** Add an event listener */
  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  /** Remove an event listener */
  off(eventType: string, callback: EventCallback): void {
    const cbs = this.listeners.get(eventType);
    if (!cbs) return;
    const idx = cbs.indexOf(callback);
    if (idx >= 0) cbs.splice(idx, 1);
  }

  private setupListeners(): void {
    const signal = this.abortController.signal;

    // Mouse events
    this.canvas.addEventListener('click', (e) => this.handleClick(e), { signal });
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e), { signal });
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e), { signal });
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e), { signal });
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave(), { signal });

    // Wheel events (for viewport scrolling)
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { signal, passive: false });

    // Keyboard events (canvas needs to be focusable)
    this.canvas.setAttribute('tabindex', '0');
    this.canvas.addEventListener('keydown', (e) => this.handleKeyDown(e), { signal });

    // Prevent default canvas focus outline
    this.canvas.style.outline = 'none';
  }

  private handleMouseDown(e: MouseEvent): void {
    const { col, row } = this.canvasToGrid(e);

    // Multi-click detection: same position within threshold → increment
    const now = Date.now();
    if (
      now - this.lastClickTime < MULTI_CLICK_MS &&
      col === this.lastClickCol &&
      row === this.lastClickRow
    ) {
      this.clickCount = Math.min(this.clickCount + 1, 3);
    } else {
      this.clickCount = 1;
    }
    this.lastClickTime = now;
    this.lastClickCol = col;
    this.lastClickRow = row;

    this.mouseDownPos = { col, row };
    this.dragOccurred = false;

    // Skip text selection for interactive form controls (range, textarea resize, etc.)
    const elementId = this.hitTestBuffer.lookup(col, row);
    const element = this.elementMap.get(elementId);
    const isInteractiveDrag = element && this.isInteractiveDragElement(element);

    if (isInteractiveDrag) {
      // Clear any existing selection and skip selection logic
      this.selectionManager.clearSelection();
    } else if (e.shiftKey && this.selectionManager.hasSelection()) {
      // Shift+click: extend existing selection
      this.selectionManager.extendTo(col, row);
      this.dragOccurred = true; // suppress the follow-up click handler
      this.requestRender();
      this.emitMouse('mousedown', col, row, e);
      return;
    } else if (this.clickCount === 3) {
      // Triple-click: select entire line
      const cols = this.grid ? this.grid.cols : 80;
      this.selectionManager.selectLine(row, cols);
      this.dragOccurred = true;
    } else if (this.clickCount === 2 && this.grid) {
      // Double-click: select word
      this.selectionManager.selectWord(col, row, this.grid);
      this.dragOccurred = true;
    } else {
      // Single click: start character-level selection
      const mode = e.altKey ? 'block' : 'linear';
      this.selectionManager.clearSelection();
      this.selectionManager.startSelection(col, row, mode);
    }

    this.requestRender();

    // Dispatch mousedown event on the hidden DOM element (skip escaped)
    if (element && !this.isEscapedNode(elementId)) {
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }

    this.emit({
      type: 'mousedown',
      element: element || null,
      charCol: col,
      charRow: row,
      originalEvent: e,
    });
  }

  private handleMouseUp(e: MouseEvent): void {
    const { col, row } = this.canvasToGrid(e);

    if (this.selectionManager.isSelecting()) {
      this.selectionManager.updateSelection(col, row, this.grid || undefined);
      this.selectionManager.endSelection();

      // If the selection is a single cell (no actual drag), clear it —
      // unless it was a word/line selection (double/triple click)
      if (this.selectionManager.granularity === 'char') {
        const bounds = this.selectionManager.getBounds();
        if (bounds && bounds.startCol === bounds.endCol && bounds.startRow === bounds.endRow) {
          this.selectionManager.clearSelection();
        }
      }

      this.requestRender();
    }

    this.mouseDownPos = null;

    const elementId = this.hitTestBuffer.lookup(col, row);
    const element = this.elementMap.get(elementId) || null;
    if (element && !this.isEscapedNode(elementId)) {
      const tag = element.tagName.toLowerCase();
      const inputType = element.getAttribute?.('type') || '';
      const skipDispatch = tag === 'input' && (inputType === 'checkbox' || inputType === 'radio');
      if (!skipDispatch) {
        element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    }

    this.emit({
      type: 'mouseup',
      element,
      charCol: col,
      charRow: row,
      originalEvent: e,
    });
  }

  private handleClick(e: MouseEvent): void {
    // If a drag / double-click / triple-click / shift-click occurred, don't treat as interactive click
    if (this.dragOccurred) {
      this.dragOccurred = false;
      return;
    }

    const { col, row } = this.canvasToGrid(e);
    const elementId = this.hitTestBuffer.lookup(col, row);
    const element = this.elementMap.get(elementId) || null;

    // Skip synthetic dispatch for escaped elements — they receive native events directly
    if (element && !this.isEscapedNode(elementId)) {
      // Focus the clicked element if focusable
      if (this.focusManager.isFocusableElement(element)) {
        this.focusManager.focusByElement(element, this.elementMap);
      }

      // Handle interactive element behaviors
      this.handleElementClick(element);

      // Dispatch synthetic click on hidden DOM element
      // Skip for checkbox/radio — we handle their state manually,
      // and the browser's default click handler would toggle checked again
      const tag = element.tagName.toLowerCase();
      const inputType = element.getAttribute?.('type') || '';
      const skipDispatch = tag === 'input' && (inputType === 'checkbox' || inputType === 'radio' || inputType === 'range');
      if (!skipDispatch) {
        element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    }

    this.emit({
      type: 'click',
      element,
      charCol: col,
      charRow: row,
      originalEvent: e,
    });
  }

  /** Handle click behavior for interactive elements */
  private handleElementClick(element: Element): void {
    const tag = element.tagName.toLowerCase();

    if (tag === 'input') {
      const type = element.getAttribute('type') || 'text';
      const input = element as HTMLInputElement;

      switch (type) {
        case 'checkbox':
          input.checked = !input.checked;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          this.requestRender();
          break;
        case 'radio':
          // Uncheck other radios in same group
          if (input.name) {
            const root = element.getRootNode() as Document | ShadowRoot;
            const radios = root.querySelectorAll(`input[type="radio"][name="${input.name}"]`);
            radios.forEach(r => (r as HTMLInputElement).checked = false);
          }
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          this.requestRender();
          break;
      }
    } else if (tag === 'button') {
      // Flash: briefly show focus, then auto-blur
      setTimeout(() => {
        if (this.focusManager.getFocusedId()) {
          const focusedEl = this.elementMap.get(this.focusManager.getFocusedId());
          if (focusedEl?.tagName.toLowerCase() === 'button') {
            this.focusManager.blur();
            this.requestRender();
          }
        }
      }, 150);
    } else if (tag === 'details') {
      const details = element as HTMLDetailsElement;
      details.open = !details.open;
      this.requestRender();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const { col, row } = this.canvasToGrid(e);

    // Handle drag selection (with granularity-aware snapping)
    if (this.mouseDownPos && this.selectionManager.isSelecting()) {
      const dx = Math.abs(col - this.mouseDownPos.col);
      const dy = Math.abs(row - this.mouseDownPos.row);
      if (dx > 0 || dy > 0) {
        this.dragOccurred = true;
        // Update selection mode if Alt key state changed during char drag
        if (e.altKey && this.selectionManager.mode !== 'block' && this.selectionManager.granularity === 'char') {
          this.selectionManager.startSelection(this.mouseDownPos.col, this.mouseDownPos.row, 'block');
        }
        this.selectionManager.updateSelection(col, row, this.grid || undefined);
        this.requestRender();
      }
    }

    // Update cursor based on element
    const elementId = this.hitTestBuffer.lookup(col, row);
    const element = this.elementMap.get(elementId);
    if (element) {
      const tag = element.tagName.toLowerCase();
      const type = element.getAttribute?.('type') || '';
      // Textarea resize handle (◢ at bottom-right corner)
      if (tag === 'textarea' && this.grid) {
        const cell = this.grid.get(col, row);
        if (cell && cell.char === '◢') {
          this.canvas.style.cursor = 'nwse-resize';
        } else {
          this.canvas.style.cursor = 'text';
        }
      } else if (tag === 'button' || tag === 'a' || tag === 'select' ||
          (tag === 'input' && ['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'range'].includes(type))) {
        this.canvas.style.cursor = 'pointer';
      } else if (tag === 'input') {
        this.canvas.style.cursor = 'text';
      } else {
        this.canvas.style.cursor = 'default';
      }
    } else {
      this.canvas.style.cursor = 'default';
    }

    // Hover state change (skip synthetic dispatch for escaped nodes)
    if (elementId !== this.hoveredElementId) {
      if (this.hoveredElementId && !this.isEscapedNode(this.hoveredElementId)) {
        const oldElement = this.elementMap.get(this.hoveredElementId);
        if (oldElement) {
          oldElement.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }
      }
      if (elementId && !this.isEscapedNode(elementId)) {
        const newElement = this.elementMap.get(elementId);
        if (newElement) {
          newElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      }
      this.hoveredElementId = elementId;
    }

    this.emit({
      type: 'mousemove',
      element: element || null,
      charCol: col,
      charRow: row,
      originalEvent: e,
    });
  }

  private handleMouseLeave(): void {
    if (this.hoveredElementId) {
      const element = this.elementMap.get(this.hoveredElementId);
      if (element) {
        element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      }
      this.hoveredElementId = 0;
    }
    this.canvas.style.cursor = 'default';
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const { col, row } = this.canvasToGrid(e);
    this.emit({
      type: 'wheel',
      element: null,
      charCol: col,
      charRow: row,
      originalEvent: e,
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const focusedId = this.focusManager.getFocusedId();
    const focusedElement = focusedId ? this.elementMap.get(focusedId) : null;

    // Ctrl+A / Cmd+A: select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      this.emit({
        type: 'selectall',
        element: null,
        charCol: 0,
        charRow: 0,
        originalEvent: e,
      });
      return;
    }

    // Ctrl+C / Cmd+C: copy
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      if (this.selectionManager.hasSelection()) {
        e.preventDefault();
        this.emit({
          type: 'copy',
          element: null,
          charCol: 0,
          charRow: 0,
          originalEvent: e,
        });
        return;
      }
    }

    // Escape: clear selection first, then blur focus
    if (e.key === 'Escape') {
      if (this.selectionManager.hasSelection()) {
        this.selectionManager.clearSelection();
        this.requestRender();
      } else {
        this.focusManager.blur();
        this.requestRender();
      }
    }

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          this.focusManager.focusPrev();
        } else {
          this.focusManager.focusNext();
        }
        this.requestRender();
        this.emit({
          type: 'focus',
          element: this.elementMap.get(this.focusManager.getFocusedId()) || null,
          charCol: 0,
          charRow: 0,
          originalEvent: e,
        });
        break;

      case 'Enter':
        if (focusedElement) {
          const tag = focusedElement.tagName.toLowerCase();
          if (tag === 'button' || tag === 'a') {
            focusedElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            this.handleElementClick(focusedElement);
          } else if (tag === 'details') {
            (focusedElement as HTMLDetailsElement).open = !(focusedElement as HTMLDetailsElement).open;
            this.requestRender();
          }
        }
        break;

      case ' ':
        if (focusedElement) {
          const tag = focusedElement.tagName.toLowerCase();
          const type = focusedElement.getAttribute('type') || '';
          if (tag === 'input' && type === 'checkbox') {
            e.preventDefault();
            (focusedElement as HTMLInputElement).checked = !(focusedElement as HTMLInputElement).checked;
            focusedElement.dispatchEvent(new Event('change', { bubbles: true }));
            this.requestRender();
          } else if (tag === 'button') {
            e.preventDefault();
            focusedElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          }
        }
        break;
    }

    // Emit keyboard event to listeners
    this.emit({
      type: 'keydown',
      element: focusedElement || null,
      charCol: 0,
      charRow: 0,
      originalEvent: e,
    });
  }

  /** Check if a node ID corresponds to an escaped element */
  private isEscapedNode(elementId: number): boolean {
    const node = this.nodeMap.get(elementId);
    return !!node && node.isEscaped;
  }

  /** Check if an element should use interactive drag (not text selection) */
  private isInteractiveDragElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute?.('type') || '';
    // Range sliders and textareas support drag interactions
    return (tag === 'input' && type === 'range') || tag === 'textarea';
  }

  private canvasToGrid(e: MouseEvent): { col: number; row: number } {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = e.clientX - rect.left;
    const pixelY = e.clientY - rect.top;
    return this.mapper.pixelToGridPos(pixelX, pixelY);
  }

  private emitMouse(type: string, col: number, row: number, e: MouseEvent): void {
    const elementId = this.hitTestBuffer.lookup(col, row);
    const element = this.elementMap.get(elementId) || null;
    this.emit({ type, element, charCol: col, charRow: row, originalEvent: e });
  }

  private requestRender(): void {
    this.onRenderRequest?.();
  }

  private emit(event: AsciiEvent): void {
    const cbs = this.listeners.get(event.type);
    if (cbs) {
      for (const cb of cbs) {
        cb(event);
      }
    }
  }

  /** Clean up event listeners */
  destroy(): void {
    this.abortController.abort();
  }
}
