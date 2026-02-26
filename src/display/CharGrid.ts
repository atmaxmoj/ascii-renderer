import { Cell, createEmptyCell, BorderCharSet } from '../types.js';
import { charDisplayWidth } from '../utils/charWidth.js';

/** Border character sets for different CSS border styles */
const BORDER_CHARS: Record<string, BorderCharSet> = {
  solid: {
    horizontal: '─',
    vertical: '│',
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
  },
  double: {
    horizontal: '═',
    vertical: '║',
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
  },
  dashed: {
    horizontal: '·',
    vertical: '·',
    topLeft: '·',
    topRight: '·',
    bottomLeft: '·',
    bottomRight: '·',
  },
  dotted: {
    horizontal: '·',
    vertical: '·',
    topLeft: '·',
    topRight: '·',
    bottomLeft: '·',
    bottomRight: '·',
  },
};

/**
 * 2D buffer of Cell objects representing the ASCII grid.
 * This is the core data structure that holds the rendered output.
 */
export class CharGrid {
  readonly cols: number;
  readonly rows: number;
  private cells: Cell[][];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push(createEmptyCell());
      }
      this.cells.push(row);
    }
  }

  /** Check if coordinates are within bounds */
  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  /** Get a cell (returns copy) */
  get(col: number, row: number): Cell | null {
    if (!this.inBounds(col, row)) return null;
    return { ...this.cells[row][col] };
  }

  /** Get cell reference (for reading without copy overhead) */
  getRef(col: number, row: number): Cell | null {
    if (!this.inBounds(col, row)) return null;
    return this.cells[row][col];
  }

  /** Set a cell. Full-width characters automatically occupy col+1 as a continuation cell. */
  set(col: number, row: number, cell: Partial<Cell>): void {
    if (!this.inBounds(col, row)) return;

    // If we're overwriting a continuation cell, clear the lead cell that owns it
    const existing = this.cells[row][col];
    if (existing.wide && existing.char === '') {
      // This is a continuation cell; clear the lead cell to the left
      if (col > 0) {
        const lead = this.cells[row][col - 1];
        lead.char = ' ';
        lead.wide = false;
      }
    }

    Object.assign(this.cells[row][col], cell);

    // Handle full-width character: set continuation cell at col+1
    if (cell.char && charDisplayWidth(cell.char) === 2) {
      this.cells[row][col].wide = false; // lead cell is not a continuation
      if (this.inBounds(col + 1, row)) {
        // If col+1 is a lead cell of another wide char, clear its continuation
        const next = this.cells[row][col + 1];
        if (next.char !== '' && charDisplayWidth(next.char) === 2 && this.inBounds(col + 2, row)) {
          this.cells[row][col + 2].char = ' ';
          this.cells[row][col + 2].wide = false;
        }
        this.cells[row][col + 1].char = '';
        this.cells[row][col + 1].wide = true;
        this.cells[row][col + 1].fg = cell.fg || this.cells[row][col].fg;
        this.cells[row][col + 1].bg = cell.bg || this.cells[row][col].bg;
        if (cell.elementId !== undefined) {
          this.cells[row][col + 1].elementId = cell.elementId;
        }
      }
    } else if (cell.char !== undefined) {
      this.cells[row][col].wide = false;
    }
  }

  /** Set just the character at a position */
  setChar(col: number, row: number, char: string, elementId?: number): void {
    if (!this.inBounds(col, row)) return;
    this.cells[row][col].char = char;
    if (elementId !== undefined) {
      this.cells[row][col].elementId = elementId;
    }
  }

  /** Fill a rectangular region with a cell value */
  fill(col: number, row: number, width: number, height: number, cell: Partial<Cell>): void {
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        this.set(c, r, cell);
      }
    }
  }

  /** Fill a rectangular region's background only */
  fillBg(col: number, row: number, width: number, height: number, bg: string, elementId?: number): void {
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        if (!this.inBounds(c, r)) continue;
        this.cells[r][c].bg = bg;
        if (elementId !== undefined) {
          this.cells[r][c].elementId = elementId;
        }
      }
    }
  }

  /** Draw a box with border characters */
  drawBox(
    col: number,
    row: number,
    width: number,
    height: number,
    borderStyle: string = 'solid',
    fg?: string,
    elementId?: number,
  ): void {
    if (width < 2 || height < 2) return;

    const chars = BORDER_CHARS[borderStyle] || BORDER_CHARS.solid;
    const cellProps: Partial<Cell> = {};
    if (fg) cellProps.fg = fg;
    if (elementId !== undefined) cellProps.elementId = elementId;

    // Corners
    this.set(col, row, { char: chars.topLeft, ...cellProps });
    this.set(col + width - 1, row, { char: chars.topRight, ...cellProps });
    this.set(col, row + height - 1, { char: chars.bottomLeft, ...cellProps });
    this.set(col + width - 1, row + height - 1, { char: chars.bottomRight, ...cellProps });

    // Top and bottom edges
    for (let c = col + 1; c < col + width - 1; c++) {
      this.set(c, row, { char: chars.horizontal, ...cellProps });
      this.set(c, row + height - 1, { char: chars.horizontal, ...cellProps });
    }

    // Left and right edges
    for (let r = row + 1; r < row + height - 1; r++) {
      this.set(col, r, { char: chars.vertical, ...cellProps });
      this.set(col + width - 1, r, { char: chars.vertical, ...cellProps });
    }
  }

  /** Write text horizontally starting at position, respecting full-width characters */
  writeText(col: number, row: number, text: string, fg?: string, bg?: string, elementId?: number): void {
    let visualCol = 0;
    for (const char of text) {
      const w = charDisplayWidth(char);
      const c = col + visualCol;
      if (!this.inBounds(c, row)) break;
      if (w === 2 && !this.inBounds(c + 1, row)) break; // wide char needs 2 cols

      this.cells[row][c].char = char;
      this.cells[row][c].wide = false;
      if (fg) this.cells[row][c].fg = fg;
      if (bg) this.cells[row][c].bg = bg;
      if (elementId !== undefined) this.cells[row][c].elementId = elementId;

      if (w === 2) {
        // Set continuation cell
        this.cells[row][c + 1].char = '';
        this.cells[row][c + 1].wide = true;
        if (fg) this.cells[row][c + 1].fg = fg;
        if (bg) this.cells[row][c + 1].bg = bg;
        if (elementId !== undefined) this.cells[row][c + 1].elementId = elementId;
      }

      visualCol += w;
    }
  }

  /** Clear the entire grid */
  clear(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        cell.char = ' ';
        cell.fg = '#c0c0c0';
        cell.bg = '#1a1a1a';
        cell.bold = false;
        cell.italic = false;
        cell.underline = false;
        cell.elementId = 0;
        cell.wide = false;
      }
    }
  }

  /** Convert grid to plain text string (skips continuation cells) */
  toString(): string {
    const lines: string[] = [];
    for (let r = 0; r < this.rows; r++) {
      let line = '';
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        // Skip continuation cells of wide characters
        if (cell.wide && cell.char === '') continue;
        line += cell.char;
      }
      // Trim trailing spaces
      lines.push(line.replace(/\s+$/, ''));
    }
    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.join('\n');
  }

  /** Get a snapshot of the internal cell array (deep copy) */
  snapshot(): Cell[][] {
    return this.cells.map(row => row.map(cell => ({ ...cell })));
  }

  /** Get border character set for a style */
  static getBorderChars(style: string): BorderCharSet {
    return BORDER_CHARS[style] || BORDER_CHARS.solid;
  }
}
