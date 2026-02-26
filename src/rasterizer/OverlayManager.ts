import { CharGrid } from '../display/CharGrid.js';

/** An overlay layer that renders on top of normal content */
export interface Overlay {
  id: string;
  col: number;
  row: number;
  width: number;
  height: number;
  render: (grid: CharGrid) => void;
  /** Priority for event handling (higher = first) */
  priority: number;
  /** Called when click occurs inside the overlay */
  onClick?: (col: number, row: number) => void;
  /** Called when click occurs outside the overlay */
  onClickOutside?: () => void;
}

/**
 * Manages overlay layers (dropdowns, tooltips, datepickers, dialogs).
 * Overlays are painted AFTER all normal content and ignore overflow:hidden.
 * Events are dispatched to the topmost overlay first.
 */
export class OverlayManager {
  private overlays: Overlay[] = [];

  /** Add an overlay */
  push(overlay: Overlay): void {
    this.overlays.push(overlay);
    this.overlays.sort((a, b) => a.priority - b.priority);
  }

  /** Remove an overlay by id */
  remove(id: string): void {
    this.overlays = this.overlays.filter(o => o.id !== id);
  }

  /** Remove all overlays */
  clear(): void {
    this.overlays = [];
  }

  /** Paint all overlays onto the grid (called after normal rendering) */
  paintAll(grid: CharGrid): void {
    for (const overlay of this.overlays) {
      overlay.render(grid);
    }
  }

  /** Check if a position is inside any overlay */
  hitTest(col: number, row: number): Overlay | null {
    // Check from top (highest priority) to bottom
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const o = this.overlays[i];
      if (col >= o.col && col < o.col + o.width &&
          row >= o.row && row < o.row + o.height) {
        return o;
      }
    }
    return null;
  }

  /** Handle a click at grid position. Returns true if overlay consumed the event. */
  handleClick(col: number, row: number): boolean {
    if (this.overlays.length === 0) return false;

    const hit = this.hitTest(col, row);
    if (hit) {
      if (hit.onClick) {
        hit.onClick(col, row);
      }
      return true; // Overlay consumes the click
    }

    // Click outside — close the topmost overlay that supports it
    const top = this.overlays[this.overlays.length - 1];
    if (top?.onClickOutside) {
      top.onClickOutside();
      return true;
    }
    return false;
  }

  /** Get the topmost overlay */
  getTopOverlay(): Overlay | null {
    if (this.overlays.length === 0) return null;
    return this.overlays[this.overlays.length - 1];
  }

  /** Get overlay count */
  get count(): number {
    return this.overlays.length;
  }

  /**
   * Create a select dropdown overlay.
   * Renders a bordered list of options at the specified position.
   */
  static createSelectDropdown(
    id: string,
    col: number,
    row: number,
    options: string[],
    selectedIndex: number,
    maxVisibleRows: number,
    gridRows: number,
    onSelect: (index: number) => void,
    onClose: () => void,
  ): { overlay: Overlay; highlightedIndex: number; moveUp: () => void; moveDown: () => void; confirm: () => void } {
    let highlightedIndex = selectedIndex;
    const width = Math.max(...options.map(o => o.length), 5) + 4; // "│ " + text + " │"
    const visibleCount = Math.min(options.length, maxVisibleRows);
    const height = visibleCount + 2; // top/bottom border

    // Boundary detection: flip up if not enough space below
    let actualRow = row;
    if (row + height > gridRows) {
      actualRow = Math.max(0, row - height);
    }

    const overlay: Overlay = {
      id,
      col,
      row: actualRow,
      width,
      height,
      priority: 100,
      onClick: (clickCol: number, clickRow: number) => {
        const optIdx = clickRow - actualRow - 1;
        if (optIdx >= 0 && optIdx < options.length) {
          onSelect(optIdx);
          onClose();
        }
      },
      onClickOutside: onClose,
      render: (grid: CharGrid) => {
        // Draw border
        grid.drawBox(col, actualRow, width, height, 'solid');

        // Draw options
        for (let i = 0; i < visibleCount; i++) {
          const optIdx = i; // TODO: scroll offset for long lists
          if (optIdx >= options.length) break;
          const text = options[optIdx].substring(0, width - 4);
          const isHighlighted = optIdx === highlightedIndex;
          const prefix = isHighlighted ? '>' : ' ';
          const line = prefix + ' ' + text.padEnd(width - 4) + ' ';

          for (let c = 0; c < line.length && c < width - 2; c++) {
            grid.set(col + 1 + c, actualRow + 1 + i, {
              char: line[c],
              fg: isHighlighted ? '#000000' : '#c0c0c0',
              bg: isHighlighted ? '#ffffff' : '#2a2a2a',
            });
          }
        }
      },
    };

    return {
      overlay,
      get highlightedIndex() { return highlightedIndex; },
      moveUp: () => {
        highlightedIndex = (highlightedIndex - 1 + options.length) % options.length;
      },
      moveDown: () => {
        highlightedIndex = (highlightedIndex + 1) % options.length;
      },
      confirm: () => {
        onSelect(highlightedIndex);
        onClose();
      },
    };
  }
}
