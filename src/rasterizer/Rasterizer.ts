import { LayoutNode, StackingContext } from '../types.js';
import { CharGrid } from '../display/CharGrid.js';
import { BoxRenderer } from './BoxRenderer.js';
import { TextRenderer } from './TextRenderer.js';
import { ElementRenderers } from './ElementRenderers.js';
import { OverlayManager } from './OverlayManager.js';
import { StackingContextBuilder } from '../layout/StackingContext.js';
import { HitTestBuffer } from '../events/HitTestBuffer.js';
import { stringDisplayWidth } from '../utils/charWidth.js';

/**
 * Walks the LayoutNode tree in stacking context order and renders
 * each node onto a CharGrid. Also builds the hit-test buffer.
 *
 * When a form element's ASCII representation is wider than its browser-computed
 * charRect, subsequent siblings on the same row are shifted right to prevent overlap.
 */
export class Rasterizer {
  private boxRenderer: BoxRenderer;
  private textRenderer: TextRenderer;
  private elementRenderers: ElementRenderers;
  private overlayManager: OverlayManager;
  private stackingBuilder: StackingContextBuilder;
  private paintedTableIds: Set<number> = new Set();

  constructor(overlayManager: OverlayManager) {
    this.boxRenderer = new BoxRenderer();
    this.textRenderer = new TextRenderer();
    this.elementRenderers = new ElementRenderers();
    this.overlayManager = overlayManager;
    this.stackingBuilder = new StackingContextBuilder();
  }

  /** Rasterize the layout tree onto the grid */
  rasterize(root: LayoutNode, grid: CharGrid, hitTestBuffer: HitTestBuffer): void {
    grid.clear();
    hitTestBuffer.clear();
    this.paintedTableIds.clear();

    // Pre-pass: adjust charRects so inline siblings don't overlap
    this.adjustInlineSiblings(root);

    // Pre-pass: ensure bordered elements with text have minimum height
    this.adjustMinHeights(root);

    // Pre-pass: compact vertical gaps caused by pixel-to-char rounding
    this.compactBlockSiblings(root);

    // Pre-pass: clamp children so they don't overlap parent borders
    this.clampChildrenToBorderArea(root);

    // Pre-pass: grow bordered parents to fully contain their children (bottom-up)
    // (must run after clamping, since clamping may shift children down)
    this.ensureBorderedContainment(root);

    // Build stacking context tree
    const stackingRoot = this.stackingBuilder.build(root);

    // Paint in stacking order
    this.paintStackingContext(stackingRoot, grid, hitTestBuffer);

    // Paint overlays on top of everything
    this.overlayManager.paintAll(grid);
  }

  /**
   * Walk the layout tree and adjust charRects for inline siblings.
   * If a form element's ASCII width exceeds its charRect.width,
   * shift all subsequent same-row siblings right by the overflow amount.
   */
  private adjustInlineSiblings(node: LayoutNode): void {
    if (node.isEscaped) return;
    let colShift = 0;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      // Apply accumulated shift from previous siblings
      if (colShift > 0) {
        this.shiftNode(child, colShift);
      }

      // Check if this element's ASCII representation is wider than its charRect
      const asciiWidth = this.getAsciiIntrinsicWidth(child);
      if (asciiWidth > 0 && asciiWidth > child.charRect.width) {
        const overflow = asciiWidth - child.charRect.width;
        child.charRect.width = asciiWidth;
        colShift += overflow;
      }

      // Recurse into children
      this.adjustInlineSiblings(child);
    }
  }

  /** Get the ASCII intrinsic width for elements with custom renderers */
  private getAsciiIntrinsicWidth(node: LayoutNode): number {
    switch (node.tagName) {
      case 'button': {
        const label = node.textContent || 'Button';
        return stringDisplayWidth(label) + 4; // "[ " + label + " ]"
      }
      case 'input': {
        const type = node.element.getAttribute?.('type') || 'text';
        switch (type) {
          case 'checkbox':
          case 'radio':
            return 3;
          case 'range':
            return Math.max(node.charRect.width, 12);
          case 'file': {
            const fileName = (node.element as HTMLInputElement).value?.split(/[\\/]/).pop() || '';
            return 16 + (fileName ? stringDisplayWidth(fileName) : 14);
          }
          default: {
            const value = (node.element as HTMLInputElement).value || '';
            let base = Math.max(node.charRect.width, stringDisplayWidth(value) + 2, 12);
            if (type === 'number') base += 3;
            if (type === 'date') base += 2;
            return base;
          }
        }
      }
      case 'select': {
        const select = node.element as HTMLSelectElement;
        const text = select.options?.[select.selectedIndex]?.text || '';
        return stringDisplayWidth(text) + 4;
      }
      default:
        return 0; // Not a custom-rendered element
    }
  }

  /**
   * Ensure elements with borders and text content have at least height 3
   * (border-top + 1 row text + border-bottom).
   * Shifts subsequent siblings down when a cell is expanded.
   */
  private adjustMinHeights(node: LayoutNode): void {
    if (node.isEscaped) return;
    const isTableRow = node.tagName === 'tr';

    if (isTableRow) {
      // Determine the ideal height for each cell based on content
      let maxHeight = 0;
      for (const cell of node.children) {
        if (cell.tagName === 'td' || cell.tagName === 'th') {
          const hasBorder = cell.style.borderTopStyle !== 'none' || cell.style.borderBottomStyle !== 'none';
          const minH = hasBorder ? 3 : 1;
          // Count content lines to determine actual needed height
          const textLines = cell.textContent ? cell.textContent.split('\n').length : 1;
          const neededH = hasBorder ? textLines + 2 : textLines;
          maxHeight = Math.max(maxHeight, minH, neededH);
        }
      }
      // Apply uniform height to all cells in the row
      if (maxHeight > 0) {
        for (const cell of node.children) {
          cell.charRect.height = maxHeight;
        }
        node.charRect.height = maxHeight;
      }
    }

    // Expand bordered non-table elements that are too short for their text
    // Only shift subsequent siblings vertically for block/vertical flow layouts,
    // not for flex-row layouts where children are arranged horizontally.
    const isHorizontalLayout = node.style?.display === 'flex' || node.style?.display === 'inline-flex';
    let rowShift = 0;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];

      if (rowShift > 0 && !isHorizontalLayout) {
        this.shiftNodeVertical(child, rowShift);
      }

      if (!isTableRow && this.needsHeightExpansion(child)) {
        const minH = 3;
        if (child.charRect.height < minH) {
          const delta = minH - child.charRect.height;
          child.charRect.height = minH;
          rowShift += delta;
        }
      }
    }

    // Recurse into children
    for (let i = 0; i < node.children.length; i++) {
      this.adjustMinHeights(node.children[i]);
    }

    // After recursing, re-layout vertical positions of children (for table rows)
    if (node.tagName === 'table' || node.tagName === 'tbody' || node.tagName === 'thead') {
      let currentRow = node.charRect.row;
      for (const child of node.children) {
        if (child.tagName === 'tr') {
          const rowShift = currentRow - child.charRect.row;
          if (rowShift !== 0) {
            this.shiftNodeVertical(child, rowShift);
          }
          currentRow += child.charRect.height;
        }
      }
    }
  }

  /** Check if a non-table element needs height expansion for its borders + text */
  private needsHeightExpansion(node: LayoutNode): boolean {
    if (node.tagName === 'tr' || node.tagName === 'td' || node.tagName === 'th' ||
        node.tagName === 'table' || node.tagName === 'tbody' || node.tagName === 'thead') {
      return false;
    }
    const { style } = node;
    const hasTopBorder = style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) > 0;
    const hasBottomBorder = style.borderBottomStyle !== 'none' && parseFloat(style.borderBottomWidth) > 0;
    if (!hasTopBorder || !hasBottomBorder) return false;
    if (node.textContent) return true;
    return node.children.some(c => c.textContent || c.isTextNode);
  }

  /**
   * Remove 1-row gaps between consecutive block siblings caused by pixel→char rounding.
   * If two siblings are on different rows with a 1-row gap, but their pixel rects
   * show they should be adjacent (pixel gap < half a cell height), shift up.
   */
  private compactBlockSiblings(node: LayoutNode): void {
    if (node.isEscaped) return;
    // Skip flex/inline layouts (children are horizontal, not vertical)
    const display = node.style?.display || '';
    if (display === 'flex' || display === 'inline-flex') {
      for (const child of node.children) this.compactBlockSiblings(child);
      return;
    }

    // Process consecutive block siblings
    for (let i = 1; i < node.children.length; i++) {
      const prev = node.children[i - 1];
      const curr = node.children[i];

      // Only compact vertically-stacked siblings (same col range, different rows)
      if (curr.charRect.row <= prev.charRect.row) continue;

      const prevBottom = prev.charRect.row + prev.charRect.height;
      const gap = curr.charRect.row - prevBottom;

      if (gap === 1) {
        // Check pixel gap: prev pixel bottom vs curr pixel top
        const prevPixelBottom = prev.pixelRect.y + prev.pixelRect.height;
        const currPixelTop = curr.pixelRect.y;
        const pixelGap = currPixelTop - prevPixelBottom;

        // If pixel gap is small relative to cell height, it's a rounding artifact
        if (pixelGap < prev.pixelRect.height * 0.8) {
          // Shift this and all subsequent siblings up by 1
          for (let j = i; j < node.children.length; j++) {
            this.shiftNodeVertical(node.children[j], -1);
          }
        }
      }
    }

    // Recurse
    for (const child of node.children) {
      this.compactBlockSiblings(child);
    }
  }

  /**
   * Bottom-up pass: ensure every bordered parent is tall enough to contain
   * all its children. When a parent grows, subsequent siblings shift down.
   */
  private ensureBorderedContainment(node: LayoutNode): void {
    if (node.isEscaped) return;
    // Process children first (bottom-up)
    for (const child of node.children) {
      this.ensureBorderedContainment(child);
    }

    if (node.children.length === 0) return;

    const { style } = node;
    const hasBorderBottom = style.borderBottomStyle !== 'none' && parseFloat(style.borderBottomWidth) > 0;
    const hasBorderTop = style.borderTopStyle !== 'none' && parseFloat(style.borderTopWidth) > 0;
    if (!hasBorderTop && !hasBorderBottom) return;

    // Skip table elements (handled separately)
    if (['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'].includes(node.tagName)) return;

    // Find the maximum bottom edge across all descendants
    const maxBottom = this.deepestChildBottom(node);
    // Needed height: children extent + bottom border row
    const neededHeight = maxBottom - node.charRect.row + (hasBorderBottom ? 1 : 0);

    if (neededHeight > node.charRect.height) {
      const delta = neededHeight - node.charRect.height;
      node.charRect.height = neededHeight;

      // Shift subsequent siblings of this node down
      if (node.parent) {
        const siblings = node.parent.children;
        const idx = siblings.indexOf(node);
        const isHoriz = node.parent.style?.display === 'flex' || node.parent.style?.display === 'inline-flex';
        if (idx >= 0 && !isHoriz) {
          for (let i = idx + 1; i < siblings.length; i++) {
            this.shiftNodeVertical(siblings[i], delta);
          }
        }
      }
    }
  }

  /** Find the bottom edge (row + height) of the deepest descendant */
  private deepestChildBottom(node: LayoutNode): number {
    let max = node.charRect.row;
    for (const child of node.children) {
      const childBottom = child.charRect.row + child.charRect.height;
      max = Math.max(max, childBottom);
      // Also check grandchildren recursively
      const descBottom = this.deepestChildBottom(child);
      max = Math.max(max, descBottom);
    }
    return max;
  }

  /**
   * Clamp children of bordered elements so they don't overlap the parent's
   * border characters. Pixel-to-char rounding can place children at the same
   * row/col as the border when padding is small (< half a cell).
   * Shifts ALL children uniformly to preserve relative positions.
   */
  private clampChildrenToBorderArea(node: LayoutNode): void {
    if (node.isEscaped) return;
    const { style, charRect } = node;
    const hasTop = this.hasBorder(style.borderTopStyle, style.borderTopWidth);
    const hasBottom = this.hasBorder(style.borderBottomStyle, style.borderBottomWidth);
    const hasLeft = this.hasBorder(style.borderLeftStyle, style.borderLeftWidth);
    const hasRight = this.hasBorder(style.borderRightStyle, style.borderRightWidth);

    if ((hasTop || hasBottom || hasLeft || hasRight) && node.children.length > 0 &&
        !['table', 'tbody', 'thead', 'tfoot', 'tr', 'td', 'th'].includes(node.tagName)) {
      const innerLeft = charRect.col + (hasLeft ? 1 : 0);
      const innerTop = charRect.row + (hasTop ? 1 : 0);
      const innerRight = charRect.col + charRect.width - (hasRight ? 1 : 0);

      // Find the topmost/leftmost child
      let minRow = Infinity;
      let minCol = Infinity;
      for (const child of node.children) {
        minRow = Math.min(minRow, child.charRect.row);
        minCol = Math.min(minCol, child.charRect.col);
      }

      // Shift ALL children uniformly if any overlap with top/left border
      if (minRow < innerTop) {
        const rowShift = innerTop - minRow;
        for (const child of node.children) {
          this.shiftNodeVertical(child, rowShift);
        }
      }
      if (minCol < innerLeft) {
        const colShift = innerLeft - minCol;
        for (const child of node.children) {
          this.shiftNode(child, colShift);
        }
      }

      // Clamp right/bottom edges per child
      for (const child of node.children) {
        if (child.charRect.col + child.charRect.width > innerRight) {
          child.charRect.width = Math.max(0, innerRight - child.charRect.col);
        }
      }
    }

    for (const child of node.children) {
      this.clampChildrenToBorderArea(child);
    }
  }

  private hasBorder(style: string, width: string): boolean {
    return style !== 'none' && style !== 'hidden' && parseFloat(width) > 0;
  }

  /** Shift a node and all descendants down by `amount` rows */
  private shiftNodeVertical(node: LayoutNode, amount: number): void {
    node.charRect.row += amount;
    for (const child of node.children) {
      this.shiftNodeVertical(child, amount);
    }
  }

  /** Shift a node and all its descendants right by `amount` columns */
  private shiftNode(node: LayoutNode, amount: number): void {
    node.charRect.col += amount;
    for (const child of node.children) {
      this.shiftNode(child, amount);
    }
  }

  private paintStackingContext(
    context: StackingContext,
    grid: CharGrid,
    hitTestBuffer: HitTestBuffer,
  ): void {
    const node = context.node;

    // Skip entire subtree for escaped nodes
    if (node.isEscaped) return;

    // Paint this node
    this.paintNode(node, grid, hitTestBuffer);

    // Paint children in stacking order (already sorted)
    for (const child of context.children) {
      this.paintStackingContext(child, grid, hitTestBuffer);
    }
  }

  private paintNode(node: LayoutNode, grid: CharGrid, hitTestBuffer: HitTestBuffer): void {
    const { charRect, style } = node;

    // Skip escaped elements — they render as native HTML overlays
    if (node.isEscaped) return;

    // Skip invisible elements
    if (style.display === 'none' || style.visibility === 'hidden') return;
    if (charRect.width <= 0 || charRect.height <= 0) return;

    // Text nodes: only render text at the measured position, no borders/bg/hit-test
    if (node.isTextNode) {
      this.textRenderer.render(node, grid);
      return;
    }

    // Fill background if set
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent') {
      grid.fillBg(charRect.col, charRect.row, charRect.width, charRect.height, style.backgroundColor, node.id);
    }

    // Update hit-test buffer for this element's area
    hitTestBuffer.fill(charRect.col, charRect.row, charRect.width, charRect.height, node.id);

    // Try element-specific renderer first
    if (this.elementRenderers.render(node, grid) > 0) {
      return;
    }

    // Table: draw unified cell borders (with junction characters)
    if (node.tagName === 'table') {
      this.paintTableBorders(node, grid);
    }

    // Render borders (skip for table cells — table draws unified borders)
    const isTableCell = node.tagName === 'td' || node.tagName === 'th';
    if (!isTableCell) {
      this.boxRenderer.render(node, grid);
    }

    // Render text content
    this.textRenderer.render(node, grid);
  }

  /**
   * Draw unified table borders with proper junction characters (┬ ┤ ├ ┴ ┼).
   * Replaces individual cell border rendering for a cleaner look.
   */
  private paintTableBorders(tableNode: LayoutNode, grid: CharGrid): void {
    const rows = this.collectTableRows(tableNode);
    if (rows.length === 0 || rows[0].length === 0) return;

    // Check if cells have visible borders
    const firstCell = rows[0][0];
    const s = firstCell.style;
    const hasBorders =
      (s.borderTopStyle !== 'none' && parseFloat(s.borderTopWidth) > 0) ||
      (s.borderLeftStyle !== 'none' && parseFloat(s.borderLeftWidth) > 0);
    if (!hasBorders) return;

    const fg = s.borderTopColor || s.color;
    const id = tableNode.id;

    // Collect x boundaries: left edge of each cell + right edge of last cell per row
    const xSet = new Set<number>();
    for (const row of rows) {
      for (const cell of row) {
        xSet.add(cell.charRect.col);
      }
      const last = row[row.length - 1];
      xSet.add(last.charRect.col + last.charRect.width - 1);
    }
    const xs = [...xSet].sort((a, b) => a - b);

    // Collect y boundaries: top edge of each row + bottom edge of last row
    const ySet = new Set<number>();
    for (const row of rows) {
      if (row.length > 0) {
        ySet.add(row[0].charRect.row);
      }
    }
    const lastRow = rows[rows.length - 1];
    if (lastRow.length > 0) {
      ySet.add(lastRow[0].charRect.row + lastRow[0].charRect.height - 1);
    }
    const ys = [...ySet].sort((a, b) => a - b);

    if (xs.length < 2 || ys.length < 2) return;

    // Draw horizontal segments
    for (const y of ys) {
      for (let xi = 0; xi < xs.length - 1; xi++) {
        for (let x = xs[xi] + 1; x < xs[xi + 1]; x++) {
          grid.set(x, y, { char: '─', fg, elementId: id });
        }
      }
    }

    // Draw vertical segments
    for (const x of xs) {
      for (let yi = 0; yi < ys.length - 1; yi++) {
        for (let y = ys[yi] + 1; y < ys[yi + 1]; y++) {
          grid.set(x, y, { char: '│', fg, elementId: id });
        }
      }
    }

    // Draw junction characters at intersections
    for (let yi = 0; yi < ys.length; yi++) {
      for (let xi = 0; xi < xs.length; xi++) {
        const isTop = yi === 0;
        const isBottom = yi === ys.length - 1;
        const isLeft = xi === 0;
        const isRight = xi === xs.length - 1;

        let char: string;
        if (isTop && isLeft) char = '┌';
        else if (isTop && isRight) char = '┐';
        else if (isBottom && isLeft) char = '└';
        else if (isBottom && isRight) char = '┘';
        else if (isTop) char = '┬';
        else if (isBottom) char = '┴';
        else if (isLeft) char = '├';
        else if (isRight) char = '┤';
        else char = '┼';

        grid.set(xs[xi], ys[yi], { char, fg, elementId: id });
      }
    }
  }

  /** Collect all rows of cells from a table node, traversing thead/tbody/tfoot */
  private collectTableRows(tableNode: LayoutNode): LayoutNode[][] {
    const rows: LayoutNode[][] = [];
    const visit = (node: LayoutNode) => {
      for (const child of node.children) {
        if (child.tagName === 'tr') {
          const cells = child.children.filter(c => c.tagName === 'td' || c.tagName === 'th');
          if (cells.length > 0) rows.push(cells);
        } else if (child.tagName === 'thead' || child.tagName === 'tbody' || child.tagName === 'tfoot') {
          visit(child);
        }
      }
    };
    visit(tableNode);
    return rows;
  }
}
