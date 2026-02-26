/**
 * 2D element-ID lookup buffer backed by a Uint32Array.
 * Built during rasterization and queried during event handling
 * to determine which element is at a given grid position.
 */
export class HitTestBuffer {
  readonly cols: number;
  readonly rows: number;
  private buffer: Uint32Array;

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.buffer = new Uint32Array(cols * rows);
  }

  /** Clear the buffer */
  clear(): void {
    this.buffer.fill(0);
  }

  /** Set element ID at a position */
  set(col: number, row: number, elementId: number): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.buffer[row * this.cols + col] = elementId;
  }

  /** Fill a rectangular region with an element ID */
  fill(col: number, row: number, width: number, height: number, elementId: number): void {
    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        this.set(c, r, elementId);
      }
    }
  }

  /** Look up which element is at a grid position */
  lookup(col: number, row: number): number {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;
    return this.buffer[row * this.cols + col];
  }

  /** Resize the buffer (creates a new backing array) */
  resize(cols: number, rows: number): HitTestBuffer {
    return new HitTestBuffer(cols, rows);
  }
}
