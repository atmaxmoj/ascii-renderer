import { CharGrid } from './CharGrid.js';
import { Cell, Theme, DEFAULT_THEME } from '../types.js';

/**
 * Renders the CharGrid onto an HTML Canvas element.
 * Each cell is drawn as a colored rectangle (background) + character (foreground).
 * Handles devicePixelRatio for crisp rendering on HiDPI displays.
 *
 * Optimizations:
 * - Dirty tracking: compares previous grid snapshot and only redraws changed cells
 * - Glyph atlas: caches rendered (char, fg, bold, italic) bitmaps for drawImage() reuse
 */
export class CanvasDisplay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private font: string;
  private fontSize: number;
  private theme: Theme;
  private dpr: number;

  // Dirty tracking: previous frame's grid state
  private prevCells: Cell[][] | null = null;

  // Glyph atlas: cached character bitmaps
  private glyphCache: Map<string, OffscreenCanvas> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    font: string,
    fontSize: number,
    theme: Partial<Theme> = {},
    cellWidth?: number,
    cellHeight?: number,
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.font = font;
    this.fontSize = fontSize;
    this.theme = { ...DEFAULT_THEME, ...theme };
    this.dpr = window.devicePixelRatio || 1;

    if (cellWidth && cellHeight) {
      this.cellWidth = cellWidth;
      this.cellHeight = cellHeight;
    } else {
      this.measureCellSize();
    }
  }

  /** Measure character cell dimensions on the canvas (fallback) */
  private measureCellSize(): void {
    this.ctx.font = `${this.fontSize}px ${this.font}`;
    const metrics = this.ctx.measureText('M');
    this.cellWidth = metrics.width;
    this.cellHeight = this.fontSize * 1.2;
  }

  /** Set up canvas dimensions for the given grid size */
  setupCanvas(cols: number, rows: number): void {
    const width = Math.ceil(cols * this.cellWidth);
    const height = Math.ceil(rows * this.cellHeight);

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.font = `${this.fontSize}px ${this.font}`;
    this.ctx.textBaseline = 'top';

    // Invalidate dirty tracking on resize
    this.prevCells = null;
  }

  /** Render the grid to canvas, only redrawing changed cells */
  render(grid: CharGrid): void {
    const { cols, rows } = grid;
    const prev = this.prevCells;

    if (!prev) {
      // Full redraw (first frame or after resize)
      this.renderFull(grid);
    } else {
      // Incremental: only redraw dirty cells
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cell = grid.getRef(col, row);
          if (!cell) continue;

          const prevCell = prev[row]?.[col];
          if (prevCell && this.cellEquals(cell, prevCell)) continue;

          // If a continuation cell changed, redraw its lead cell instead
          if (cell.wide && cell.char === '' && col > 0) {
            const leadCell = grid.getRef(col - 1, row);
            if (leadCell) this.renderCell(col - 1, row, leadCell);
            continue;
          }

          this.renderCell(col, row, cell);
        }
      }
    }

    // Save snapshot for next frame comparison
    this.prevCells = grid.snapshot();
  }

  /** Full redraw of entire grid */
  private renderFull(grid: CharGrid): void {
    const { cols, rows } = grid;

    // Clear with background color
    this.ctx.fillStyle = this.theme.bg;
    this.ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = grid.getRef(col, row);
        if (!cell) continue;
        this.renderCell(col, row, cell);
      }
    }
  }

  /** Render a single cell at grid position */
  private renderCell(col: number, row: number, cell: Cell): void {
    const x = col * this.cellWidth;
    const y = row * this.cellHeight;

    // Continuation cell of a wide character: skip entirely.
    // The lead cell (col-1) already drew background + glyph across both columns.
    if (cell.wide && cell.char === '') {
      return;
    }

    // Determine if this is a lead cell of a full-width character
    const isWideLead = cell.char !== ' ' && cell.char !== '' && this.isFullWidthChar(cell.char);
    const drawWidth = isWideLead ? this.cellWidth * 2 : this.cellWidth;

    // Clear cell area with background
    this.ctx.fillStyle = cell.bg !== this.theme.bg ? cell.bg : this.theme.bg;
    this.ctx.fillRect(x, y, drawWidth, this.cellHeight);

    // Draw character
    if (cell.char !== ' ') {
      const glyph = this.getGlyph(cell.char, cell.fg, cell.bold, cell.italic, isWideLead);
      if (glyph) {
        this.ctx.drawImage(glyph, x, y);
      } else {
        // Fallback: direct fillText
        this.setFont(cell.bold, cell.italic);
        this.ctx.fillStyle = cell.fg;
        const textY = y + (this.cellHeight - this.fontSize) / 2;
        this.ctx.fillText(cell.char, x, textY);
      }

      // Underline
      if (cell.underline) {
        this.ctx.strokeStyle = cell.fg;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + this.cellHeight - 2);
        this.ctx.lineTo(x + drawWidth, y + this.cellHeight - 2);
        this.ctx.stroke();
      }
    }
  }

  /** Check if a character is full-width (CJK etc.) */
  private isFullWidthChar(char: string): boolean {
    const code = char.codePointAt(0);
    if (code === undefined) return false;
    return (
      (code >= 0x1100 && code <= 0x115F) ||
      (code >= 0x2E80 && code <= 0x303E) ||
      (code >= 0x3040 && code <= 0x9FFF) ||
      (code >= 0xAC00 && code <= 0xD7AF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE4F) ||
      (code >= 0xFF01 && code <= 0xFF60) ||
      (code >= 0xFFE0 && code <= 0xFFE6) ||
      (code >= 0x20000 && code <= 0x2FFFF) ||
      (code >= 0x30000 && code <= 0x3FFFF)
    );
  }

  /** Get or create a cached glyph (synchronous, using OffscreenCanvas) */
  private getGlyph(char: string, fg: string, bold: boolean, italic: boolean, wide: boolean = false): OffscreenCanvas | null {
    if (typeof OffscreenCanvas === 'undefined') return null;

    const key = `${char}|${fg}|${bold ? 'B' : ''}${italic ? 'I' : ''}${wide ? '|W' : ''}`;
    let glyph = this.glyphCache.get(key);
    if (glyph) return glyph;

    const canvasWidth = wide ? this.cellWidth * 2 : this.cellWidth;
    const w = Math.ceil(canvasWidth * this.dpr);
    const h = Math.ceil(this.cellHeight * this.dpr);
    if (w <= 0 || h <= 0) return null;

    glyph = new OffscreenCanvas(w, h);
    const ctx = glyph.getContext('2d')!;
    ctx.scale(this.dpr, this.dpr);

    let fontStr = '';
    if (italic) fontStr += 'italic ';
    if (bold) fontStr += 'bold ';
    fontStr += `${this.fontSize}px ${this.font}`;
    ctx.font = fontStr;
    ctx.textBaseline = 'top';
    ctx.fillStyle = fg;
    const textY = (this.cellHeight - this.fontSize) / 2;
    ctx.fillText(char, 0, textY);

    this.glyphCache.set(key, glyph);
    return glyph;
  }

  /** Set canvas font (avoids redundant changes) */
  private setFont(bold: boolean, italic: boolean): void {
    let fontStr = '';
    if (italic) fontStr += 'italic ';
    if (bold) fontStr += 'bold ';
    fontStr += `${this.fontSize}px ${this.font}`;
    this.ctx.font = fontStr;
  }

  /** Compare two cells for equality */
  private cellEquals(a: Cell, b: Cell): boolean {
    return a.char === b.char &&
      a.fg === b.fg &&
      a.bg === b.bg &&
      a.bold === b.bold &&
      a.italic === b.italic &&
      a.underline === b.underline &&
      a.wide === b.wide;
  }

  /** Get cell dimensions */
  getCellWidth(): number {
    return this.cellWidth;
  }

  getCellHeight(): number {
    return this.cellHeight;
  }

  /** Get the canvas element */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Update theme (invalidates dirty tracking) */
  setTheme(theme: Partial<Theme>): void {
    this.theme = { ...this.theme, ...theme };
    this.prevCells = null;
    this.glyphCache.clear();
  }

  /** Clear glyph cache (e.g., on font change) */
  clearGlyphCache(): void {
    this.glyphCache.clear();
  }

  /** Get glyph cache size for diagnostics */
  getGlyphCacheSize(): number {
    return this.glyphCache.size;
  }

  /** Invalidate dirty tracking (forces full redraw next frame) */
  invalidate(): void {
    this.prevCells = null;
  }
}
