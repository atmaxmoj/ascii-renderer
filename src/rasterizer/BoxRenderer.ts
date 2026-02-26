import { LayoutNode } from '../types.js';
import { CharGrid } from '../display/CharGrid.js';

/** Maps CSS border-style to box-drawing character set name */
function mapBorderStyle(cssStyle: string): string {
  switch (cssStyle) {
    case 'double': return 'double';
    case 'dashed': return 'dashed';
    case 'dotted': return 'dotted';
    case 'solid': return 'solid';
    case 'none':
    case 'hidden':
      return 'none';
    default: return 'solid';
  }
}

/** Check if a border side has visible width */
function hasBorder(style: string, width: string): boolean {
  if (style === 'none' || style === 'hidden') return false;
  const w = parseFloat(width);
  return w > 0;
}

/**
 * Renders box borders using box-drawing characters.
 * Maps CSS border-style → character set, handles per-side styles,
 * and resolves corners based on adjacent sides.
 */
export class BoxRenderer {
  /** Render borders for a layout node onto the grid */
  render(node: LayoutNode, grid: CharGrid): void {
    const { charRect, style, id } = node;
    const { col, row, width, height } = charRect;

    if (width < 1 || height < 1) return;

    const hasTop = hasBorder(style.borderTopStyle, style.borderTopWidth);
    const hasRight = hasBorder(style.borderRightStyle, style.borderRightWidth);
    const hasBottom = hasBorder(style.borderBottomStyle, style.borderBottomWidth);
    const hasLeft = hasBorder(style.borderLeftStyle, style.borderLeftWidth);

    if (!hasTop && !hasRight && !hasBottom && !hasLeft) return;

    // Per-side border colors (fall back to text color)
    const fgTop = style.borderTopColor || style.color;
    const fgRight = style.borderRightColor || style.color;
    const fgBottom = style.borderBottomColor || style.color;
    const fgLeft = style.borderLeftColor || style.color;

    // Determine which character set to use (use top border's style as primary)
    const chars = CharGrid.getBorderChars(mapBorderStyle(style.borderTopStyle));

    // Top border
    if (hasTop && width >= 2) {
      for (let c = col + 1; c < col + width - 1; c++) {
        grid.set(c, row, { char: chars.horizontal, fg: fgTop, elementId: id });
      }
    }

    // Bottom border
    if (hasBottom && width >= 2) {
      for (let c = col + 1; c < col + width - 1; c++) {
        grid.set(c, row + height - 1, { char: chars.horizontal, fg: fgBottom, elementId: id });
      }
    }

    // Left border
    if (hasLeft && height >= 2) {
      for (let r = row + 1; r < row + height - 1; r++) {
        grid.set(col, r, { char: chars.vertical, fg: fgLeft, elementId: id });
      }
    }

    // Right border
    if (hasRight && height >= 2) {
      for (let r = row + 1; r < row + height - 1; r++) {
        grid.set(col + width - 1, r, { char: chars.vertical, fg: fgRight, elementId: id });
      }
    }

    // Corners — use the color of the top/left side that forms the corner
    if (hasTop && hasLeft) {
      grid.set(col, row, { char: chars.topLeft, fg: fgTop, elementId: id });
    } else if (hasTop) {
      grid.set(col, row, { char: chars.horizontal, fg: fgTop, elementId: id });
    } else if (hasLeft) {
      grid.set(col, row, { char: chars.vertical, fg: fgLeft, elementId: id });
    }

    if (hasTop && hasRight) {
      grid.set(col + width - 1, row, { char: chars.topRight, fg: fgTop, elementId: id });
    } else if (hasTop) {
      grid.set(col + width - 1, row, { char: chars.horizontal, fg: fgTop, elementId: id });
    } else if (hasRight) {
      grid.set(col + width - 1, row, { char: chars.vertical, fg: fgRight, elementId: id });
    }

    if (hasBottom && hasLeft) {
      grid.set(col, row + height - 1, { char: chars.bottomLeft, fg: fgBottom, elementId: id });
    } else if (hasBottom) {
      grid.set(col, row + height - 1, { char: chars.horizontal, fg: fgBottom, elementId: id });
    } else if (hasLeft) {
      grid.set(col, row + height - 1, { char: chars.vertical, fg: fgLeft, elementId: id });
    }

    if (hasBottom && hasRight) {
      grid.set(col + width - 1, row + height - 1, { char: chars.bottomRight, fg: fgBottom, elementId: id });
    } else if (hasBottom) {
      grid.set(col + width - 1, row + height - 1, { char: chars.horizontal, fg: fgBottom, elementId: id });
    } else if (hasRight) {
      grid.set(col + width - 1, row + height - 1, { char: chars.vertical, fg: fgRight, elementId: id });
    }
  }
}
