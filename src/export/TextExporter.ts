import { CharGrid } from '../display/CharGrid.js';

/**
 * Exports the CharGrid to plain text or ANSI escape code formatted text.
 */
export class TextExporter {
  /** Export grid as plain text (no colors, no formatting) */
  toPlainText(grid: CharGrid): string {
    return grid.toString();
  }

  /** Export grid as ANSI escape code formatted text (for terminal display) */
  toAnsi(grid: CharGrid): string {
    const lines: string[] = [];

    for (let row = 0; row < grid.rows; row++) {
      let line = '';
      let prevFg = '';
      let prevBg = '';
      let prevBold = false;
      let prevItalic = false;
      let prevUnderline = false;

      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getRef(col, row);
        if (!cell) {
          line += ' ';
          continue;
        }

        // Skip continuation cells of wide characters
        if (cell.wide && cell.char === '') continue;

        // Build ANSI escape sequence if style changed
        const codes: string[] = [];

        if (cell.bold !== prevBold || cell.italic !== prevItalic || cell.underline !== prevUnderline) {
          codes.push('0'); // Reset
          if (cell.bold) codes.push('1');
          if (cell.italic) codes.push('3');
          if (cell.underline) codes.push('4');
          prevBold = cell.bold;
          prevItalic = cell.italic;
          prevUnderline = cell.underline;
          // Force color reset after attribute reset
          prevFg = '';
          prevBg = '';
        }

        if (cell.fg !== prevFg) {
          const rgb = this.parseColor(cell.fg);
          if (rgb) {
            codes.push(`38;2;${rgb.r};${rgb.g};${rgb.b}`);
          }
          prevFg = cell.fg;
        }

        if (cell.bg !== prevBg) {
          const rgb = this.parseColor(cell.bg);
          if (rgb) {
            codes.push(`48;2;${rgb.r};${rgb.g};${rgb.b}`);
          }
          prevBg = cell.bg;
        }

        if (codes.length > 0) {
          line += `\x1b[${codes.join(';')}m`;
        }

        line += cell.char;
      }

      // Reset at end of line
      line += '\x1b[0m';
      // Trim trailing spaces (before the reset code)
      lines.push(line);
    }

    // Trim trailing empty lines
    while (lines.length > 0 && lines[lines.length - 1] === '\x1b[0m') {
      lines.pop();
    }

    return lines.join('\n');
  }

  /** Parse a CSS color string to RGB values */
  private parseColor(color: string): { r: number; g: number; b: number } | null {
    // Hex format: #rgb or #rrggbb
    const hexMatch = color.match(/^#([0-9a-f]{3,8})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      if (hex.length === 3) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
        };
      }
      if (hex.length >= 6) {
        return {
          r: parseInt(hex.substring(0, 2), 16),
          g: parseInt(hex.substring(2, 4), 16),
          b: parseInt(hex.substring(4, 6), 16),
        };
      }
    }

    // rgb() / rgba() format
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return {
        r: parseInt(rgbMatch[1], 10),
        g: parseInt(rgbMatch[2], 10),
        b: parseInt(rgbMatch[3], 10),
      };
    }

    return null;
  }
}
