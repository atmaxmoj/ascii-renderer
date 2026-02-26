/**
 * Pre-rendered character bitmap cache using OffscreenCanvas.
 * Each unique (char, fg, bg, bold, italic) combination is rendered once
 * and cached as an ImageBitmap for fast drawImage() calls.
 *
 * This is a Phase 5 optimization — initially CanvasDisplay uses fillText() directly.
 */
export class GlyphAtlas {
  private cache: Map<string, ImageBitmap> = new Map();
  private cellWidth: number;
  private cellHeight: number;
  private font: string;
  private fontSize: number;

  constructor(cellWidth: number, cellHeight: number, font: string, fontSize: number) {
    this.cellWidth = cellWidth;
    this.cellHeight = cellHeight;
    this.font = font;
    this.fontSize = fontSize;
  }

  /** Get or create a cached glyph bitmap */
  async getGlyph(
    char: string,
    fg: string,
    bg: string,
    bold: boolean,
    italic: boolean,
  ): Promise<ImageBitmap> {
    const key = `${char}|${fg}|${bg}|${bold ? 'B' : ''}|${italic ? 'I' : ''}`;

    let bitmap = this.cache.get(key);
    if (bitmap) return bitmap;

    bitmap = await this.renderGlyph(char, fg, bg, bold, italic);
    this.cache.set(key, bitmap);
    return bitmap;
  }

  private async renderGlyph(
    char: string,
    fg: string,
    bg: string,
    bold: boolean,
    italic: boolean,
  ): Promise<ImageBitmap> {
    const canvas = new OffscreenCanvas(
      Math.ceil(this.cellWidth),
      Math.ceil(this.cellHeight),
    );
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.cellWidth, this.cellHeight);

    // Character
    let fontStr = '';
    if (italic) fontStr += 'italic ';
    if (bold) fontStr += 'bold ';
    fontStr += `${this.fontSize}px ${this.font}`;
    ctx.font = fontStr;
    ctx.textBaseline = 'top';
    ctx.fillStyle = fg;
    ctx.fillText(char, 0, (this.cellHeight - this.fontSize) / 2);

    return createImageBitmap(canvas);
  }

  /** Clear the cache */
  clear(): void {
    for (const bitmap of this.cache.values()) {
      bitmap.close();
    }
    this.cache.clear();
  }

  /** Get cache size for diagnostics */
  get size(): number {
    return this.cache.size;
  }
}
