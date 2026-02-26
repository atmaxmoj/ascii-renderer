import { CharRect, PixelRect } from '../types.js';

/**
 * Converts between pixel coordinates (from browser layout) and
 * character grid coordinates used by the rasterizer.
 */
export class CoordinateMapper {
  private cellWidth: number;
  private cellHeight: number;
  private offsetX: number;
  private offsetY: number;

  constructor(cellWidth: number, cellHeight: number, offsetX: number = 0, offsetY: number = 0) {
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /** Convert a pixel rectangle to character grid coordinates */
  pixelToChar(pixelRect: PixelRect): CharRect {
    const col = Math.round((pixelRect.x - this.offsetX) / this.cellWidth);
    const row = Math.round((pixelRect.y - this.offsetY) / this.cellHeight);
    const right = Math.round((pixelRect.x - this.offsetX + pixelRect.width) / this.cellWidth);
    const bottom = Math.round((pixelRect.y - this.offsetY + pixelRect.height) / this.cellHeight);

    return {
      col: Math.max(0, col),
      row: Math.max(0, row),
      width: Math.max(0, right - col),
      height: Math.max(0, bottom - row),
    };
  }

  /** Convert character grid coordinates back to pixels */
  charToPixel(charRect: CharRect): PixelRect {
    return {
      x: charRect.col * this.cellWidth + this.offsetX,
      y: charRect.row * this.cellHeight + this.offsetY,
      width: charRect.width * this.cellWidth,
      height: charRect.height * this.cellHeight,
    };
  }

  /** Convert a single pixel position to grid position */
  pixelToGridPos(pixelX: number, pixelY: number): { col: number; row: number } {
    return {
      col: Math.floor((pixelX - this.offsetX) / this.cellWidth),
      row: Math.floor((pixelY - this.offsetY) / this.cellHeight),
    };
  }

  /** Convert grid position to pixel center */
  gridToPixelCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.cellWidth + this.cellWidth / 2 + this.offsetX,
      y: row * this.cellHeight + this.cellHeight / 2 + this.offsetY,
    };
  }

  /** Update cell dimensions (e.g., after font change) */
  updateCellSize(cellWidth: number, cellHeight: number): void {
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
  }

  getCellWidth(): number {
    return this.cellWidth;
  }

  getCellHeight(): number {
    return this.cellHeight;
  }
}
