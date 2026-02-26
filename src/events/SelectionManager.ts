import { CharGrid } from '../display/CharGrid.js';

export type SelectionMode = 'linear' | 'block';
export type SelectionGranularity = 'char' | 'word' | 'line';

/**
 * Manages text selection state on the ASCII grid.
 *
 * Supports:
 * - Linear selection (click + drag)
 * - Block/rectangular selection (Alt/Option + drag)
 * - Word selection (double-click, double-click + drag)
 * - Line selection (triple-click, triple-click + drag)
 * - Shift+click to extend selection
 * - Ctrl/Cmd+A to select all
 */
export class SelectionManager {
  private anchor: { col: number; row: number } | null = null;
  private head: { col: number; row: number } | null = null;
  private _mode: SelectionMode = 'linear';
  private _granularity: SelectionGranularity = 'char';
  private _isSelecting: boolean = false;

  // For word/line drag: the original anchor unit bounds
  // so we can snap the anchor side correctly when drag direction reverses
  private anchorRange: {
    startCol: number; startRow: number;
    endCol: number; endRow: number;
  } | null = null;

  /** Begin a new character-level selection at the given grid position */
  startSelection(col: number, row: number, mode: SelectionMode = 'linear'): void {
    this.anchor = { col, row };
    this.head = { col, row };
    this._mode = mode;
    this._granularity = 'char';
    this.anchorRange = null;
    this._isSelecting = true;
  }

  /** Select the word at (col, row) and begin word-granularity drag */
  selectWord(col: number, row: number, grid: CharGrid): void {
    const [wStart, wEnd] = this.findWordBounds(col, row, grid);
    this.anchor = { col: wStart, row };
    this.head = { col: wEnd, row };
    this._mode = 'linear';
    this._granularity = 'word';
    this.anchorRange = { startCol: wStart, startRow: row, endCol: wEnd, endRow: row };
    this._isSelecting = true;
  }

  /** Select the entire line and begin line-granularity drag */
  selectLine(row: number, cols: number): void {
    this.anchor = { col: 0, row };
    this.head = { col: cols - 1, row };
    this._mode = 'linear';
    this._granularity = 'line';
    this.anchorRange = { startCol: 0, startRow: row, endCol: cols - 1, endRow: row };
    this._isSelecting = true;
  }

  /** Extend existing selection to (col, row) — for Shift+click */
  extendTo(col: number, row: number): void {
    if (!this.anchor) {
      // No existing selection: start a new one at this position
      this.startSelection(col, row);
      return;
    }
    this.head = { col, row };
    // Extension is immediate, not a drag
    this._isSelecting = false;
    this._granularity = 'char';
    this.anchorRange = null;
  }

  /** Update the selection head as the mouse moves (respects current granularity) */
  updateSelection(col: number, row: number, grid?: CharGrid): void {
    if (!this._isSelecting) return;

    if (this._granularity === 'word' && grid && this.anchorRange) {
      const [wStart, wEnd] = this.findWordBounds(col, row, grid);
      // Determine direction relative to the original double-clicked word
      const afterAnchor = row > this.anchorRange.startRow ||
        (row === this.anchorRange.startRow && col >= this.anchorRange.startCol);
      if (afterAnchor) {
        this.anchor = { col: this.anchorRange.startCol, row: this.anchorRange.startRow };
        this.head = { col: wEnd, row };
      } else {
        this.anchor = { col: this.anchorRange.endCol, row: this.anchorRange.endRow };
        this.head = { col: wStart, row };
      }
    } else if (this._granularity === 'line' && grid && this.anchorRange) {
      if (row >= this.anchorRange.startRow) {
        this.anchor = { col: 0, row: this.anchorRange.startRow };
        this.head = { col: grid.cols - 1, row };
      } else {
        this.anchor = { col: grid.cols - 1, row: this.anchorRange.endRow };
        this.head = { col: 0, row };
      }
    } else {
      this.head = { col, row };
    }
  }

  /** End the active drag (selection remains visible) */
  endSelection(): void {
    this._isSelecting = false;
  }

  /** Select all cells in the grid */
  selectAll(cols: number, rows: number): void {
    this.anchor = { col: 0, row: 0 };
    this.head = { col: cols - 1, row: rows - 1 };
    this._mode = 'linear';
    this._granularity = 'char';
    this.anchorRange = null;
    this._isSelecting = false;
  }

  /** Shift all selection row coordinates by a delta (used when viewport scrolls) */
  shiftRows(delta: number): void {
    if (this.anchor) this.anchor.row += delta;
    if (this.head) this.head.row += delta;
    if (this.anchorRange) {
      this.anchorRange.startRow += delta;
      this.anchorRange.endRow += delta;
    }
  }

  /** Clear the selection entirely */
  clearSelection(): void {
    this.anchor = null;
    this.head = null;
    this._isSelecting = false;
    this._granularity = 'char';
    this.anchorRange = null;
  }

  /** Whether any cells are currently selected */
  hasSelection(): boolean {
    return this.anchor !== null && this.head !== null;
  }

  /** Whether a drag is in progress */
  isSelecting(): boolean {
    return this._isSelecting;
  }

  /** Current selection mode */
  get mode(): SelectionMode {
    return this._mode;
  }

  /** Current selection granularity */
  get granularity(): SelectionGranularity {
    return this._granularity;
  }

  /** Get the normalized selection bounds (start <= end in reading order) */
  getBounds(): { startCol: number; startRow: number; endCol: number; endRow: number } | null {
    if (!this.anchor || !this.head) return null;

    if (this._mode === 'block') {
      return {
        startCol: Math.min(this.anchor.col, this.head.col),
        startRow: Math.min(this.anchor.row, this.head.row),
        endCol: Math.max(this.anchor.col, this.head.col),
        endRow: Math.max(this.anchor.row, this.head.row),
      };
    }

    // Linear: normalize to reading order
    if (
      this.anchor.row < this.head.row ||
      (this.anchor.row === this.head.row && this.anchor.col <= this.head.col)
    ) {
      return {
        startCol: this.anchor.col,
        startRow: this.anchor.row,
        endCol: this.head.col,
        endRow: this.head.row,
      };
    }
    return {
      startCol: this.head.col,
      startRow: this.head.row,
      endCol: this.anchor.col,
      endRow: this.anchor.row,
    };
  }

  /** Check if a cell at (col, row) is within the current selection */
  isSelected(col: number, row: number): boolean {
    const bounds = this.getBounds();
    if (!bounds) return false;

    const { startCol, startRow, endCol, endRow } = bounds;

    if (this._mode === 'block') {
      return col >= startCol && col <= endCol && row >= startRow && row <= endRow;
    }

    // Linear selection
    if (row < startRow || row > endRow) return false;

    if (startRow === endRow) {
      return row === startRow && col >= startCol && col <= endCol;
    }

    if (row === startRow) return col >= startCol;
    if (row === endRow) return col <= endCol;
    return true; // middle rows fully selected
  }

  /** Extract the selected text from the grid */
  getSelectedText(grid: CharGrid): string {
    const bounds = this.getBounds();
    if (!bounds) return '';

    const { startCol, startRow, endCol, endRow } = bounds;

    if (this._mode === 'block') {
      const lines: string[] = [];
      for (let r = startRow; r <= Math.min(endRow, grid.rows - 1); r++) {
        let line = '';
        for (let c = startCol; c <= Math.min(endCol, grid.cols - 1); c++) {
          const cell = grid.getRef(c, r);
          line += cell ? cell.char : ' ';
        }
        lines.push(line.replace(/\s+$/, ''));
      }
      return lines.join('\n');
    }

    // Linear
    const lines: string[] = [];
    for (let r = startRow; r <= Math.min(endRow, grid.rows - 1); r++) {
      let line = '';
      const cStart = r === startRow ? startCol : 0;
      const cEnd = r === endRow ? endCol : grid.cols - 1;
      for (let c = cStart; c <= Math.min(cEnd, grid.cols - 1); c++) {
        const cell = grid.getRef(c, r);
        line += cell ? cell.char : ' ';
      }
      lines.push(line.replace(/\s+$/, ''));
    }
    return lines.join('\n');
  }

  /** Find word boundaries around (col, row). Returns [startCol, endCol]. */
  findWordBounds(col: number, row: number, grid: CharGrid): [number, number] {
    const cell = grid.getRef(col, row);
    if (!cell || cell.char === ' ') {
      return [col, col];
    }

    let start = col;
    while (start > 0) {
      const c = grid.getRef(start - 1, row);
      if (!c || c.char === ' ') break;
      start--;
    }

    let end = col;
    while (end < grid.cols - 1) {
      const c = grid.getRef(end + 1, row);
      if (!c || c.char === ' ') break;
      end++;
    }

    return [start, end];
  }
}
