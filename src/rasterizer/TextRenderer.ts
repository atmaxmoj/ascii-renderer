import { LayoutNode } from '../types.js';
import { CharGrid } from '../display/CharGrid.js';
import { charDisplayWidth, stringDisplayWidth } from '../utils/charWidth.js';

/**
 * Places text characters into the grid within element bounds.
 * Handles basic wrapping and text alignment.
 */
export class TextRenderer {
  /** Render text content for a layout node */
  render(node: LayoutNode, grid: CharGrid): void {
    const text = node.textContent;
    if (!text) return;

    const { charRect, style, id } = node;
    const { col, row, width, height } = charRect;

    if (width < 1 || height < 1) return;

    let innerCol: number, innerRow: number, innerWidth: number, innerHeight: number;

    if (node.isTextNode) {
      // Text nodes have no borders — use charRect directly
      innerCol = col;
      innerRow = row;
      innerWidth = width;
      innerHeight = height;
    } else {
      // Determine inner bounds (accounting for borders)
      const hasBorderLeft = this.hasBorder(style.borderLeftStyle, style.borderLeftWidth);
      const hasBorderRight = this.hasBorder(style.borderRightStyle, style.borderRightWidth);
      const hasBorderTop = this.hasBorder(style.borderTopStyle, style.borderTopWidth);
      const hasBorderBottom = this.hasBorder(style.borderBottomStyle, style.borderBottomWidth);

      innerCol = col + (hasBorderLeft ? 1 : 0);
      innerRow = row + (hasBorderTop ? 1 : 0);
      innerWidth = width - (hasBorderLeft ? 1 : 0) - (hasBorderRight ? 1 : 0);
      innerHeight = height - (hasBorderTop ? 1 : 0) - (hasBorderBottom ? 1 : 0);
    }

    if (innerWidth < 1 || innerHeight < 1) return;

    const fg = style.color;
    const bold = parseInt(style.fontWeight) >= 700 || style.fontWeight === 'bold';
    const italic = style.fontStyle === 'italic';
    const underline = style.textDecoration.includes('underline');

    // Word-wrap text into lines
    const lines = this.wrapText(text, innerWidth, style.whiteSpace);

    // Render each line
    for (let lineIdx = 0; lineIdx < lines.length && lineIdx < innerHeight; lineIdx++) {
      const line = lines[lineIdx];
      const lineRow = innerRow + lineIdx;
      const lineVisualWidth = stringDisplayWidth(line);

      // Text alignment using visual width
      let startCol = innerCol;
      if (style.textAlign === 'center') {
        startCol = innerCol + Math.floor((innerWidth - lineVisualWidth) / 2);
      } else if (style.textAlign === 'right') {
        startCol = innerCol + (innerWidth - lineVisualWidth);
      }

      let visualCol = 0;
      for (const char of line) {
        const w = charDisplayWidth(char);
        const c = startCol + visualCol;
        if (visualCol + w > innerWidth) break;
        if (!grid.inBounds(c, lineRow)) { visualCol += w; continue; }
        if (w === 2 && !grid.inBounds(c + 1, lineRow)) break;
        grid.set(c, lineRow, {
          char,
          fg,
          bold,
          italic,
          underline,
          elementId: id,
        });
        visualCol += w;
      }
    }
  }

  /** Wrap text into lines that fit within maxWidth (visual columns) */
  private wrapText(text: string, maxWidth: number, whiteSpace: string): string[] {
    if (maxWidth <= 0) return [];

    // Pre-formatted text: preserve whitespace and line breaks
    if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') {
      const rawLines = text.split('\n');
      const lines: string[] = [];
      for (const rawLine of rawLines) {
        if (whiteSpace === 'pre') {
          // No wrapping in pre — truncate to visual maxWidth
          lines.push(this.truncateToWidth(rawLine, maxWidth));
        } else {
          // pre-wrap: wrap at maxWidth
          lines.push(...this.hardWrap(rawLine, maxWidth));
        }
      }
      return lines;
    }

    // nowrap: no wrapping
    if (whiteSpace === 'nowrap') {
      // Collapse whitespace, single line, truncate to visual width
      const collapsed = text.replace(/\s+/g, ' ');
      return [this.truncateToWidth(collapsed, maxWidth)];
    }

    // Default (normal): collapse whitespace, word-wrap
    const collapsed = text.replace(/\s+/g, ' ');
    return this.wordWrap(collapsed, maxWidth);
  }

  /** Word-wrap text at word boundaries using visual widths */
  private wordWrap(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = stringDisplayWidth(word);
      if (currentWidth === 0) {
        currentLine = word;
        currentWidth = wordWidth;
      } else if (currentWidth + 1 + wordWidth <= maxWidth) {
        currentLine += ' ' + word;
        currentWidth += 1 + wordWidth;
      } else {
        lines.push(currentLine);
        currentLine = word;
        currentWidth = wordWidth;
      }

      // Handle words wider than maxWidth — hard-wrap them
      while (currentWidth > maxWidth) {
        const { line, rest } = this.splitAtWidth(currentLine, maxWidth);
        lines.push(line);
        currentLine = rest;
        currentWidth = stringDisplayWidth(rest);
      }
    }

    if (currentWidth > 0) {
      lines.push(currentLine);
    }

    return lines;
  }

  /** Hard-wrap text at visual maxWidth (no word boundary consideration) */
  private hardWrap(text: string, maxWidth: number): string[] {
    if (stringDisplayWidth(text) <= maxWidth) return [text];
    const lines: string[] = [];
    let remaining = text;
    while (remaining.length > 0) {
      const { line, rest } = this.splitAtWidth(remaining, maxWidth);
      lines.push(line);
      remaining = rest;
    }
    return lines;
  }

  /** Split a string at visual width boundary, returning (line, rest) */
  private splitAtWidth(text: string, maxWidth: number): { line: string; rest: string } {
    let width = 0;
    let i = 0;
    const chars = [...text];
    while (i < chars.length) {
      const w = charDisplayWidth(chars[i]);
      if (width + w > maxWidth) break;
      width += w;
      i++;
    }
    return { line: chars.slice(0, i).join(''), rest: chars.slice(i).join('') };
  }

  /** Truncate string to fit within visual maxWidth */
  private truncateToWidth(text: string, maxWidth: number): string {
    let width = 0;
    let result = '';
    for (const char of text) {
      const w = charDisplayWidth(char);
      if (width + w > maxWidth) break;
      result += char;
      width += w;
    }
    return result;
  }

  private hasBorder(style: string, width: string): boolean {
    if (style === 'none' || style === 'hidden') return false;
    return parseFloat(width) > 0;
  }
}
