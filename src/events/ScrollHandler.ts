import { CharGrid } from '../display/CharGrid.js';

/**
 * Handles scroll regions with overflow:auto/scroll.
 * Renders ASCII scrollbars (▲█░▼), handles wheel events,
 * and tracks scroll state per element.
 */

export interface ScrollRegion {
  elementId: number;
  col: number;
  row: number;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  scrollX: number;
  scrollY: number;
}

export class ScrollHandler {
  private regions: Map<number, ScrollRegion> = new Map();

  /** Register a scroll region */
  register(region: ScrollRegion): void {
    this.regions.set(region.elementId, region);
  }

  /** Unregister a scroll region */
  unregister(elementId: number): void {
    this.regions.delete(elementId);
  }

  /** Handle a wheel event. Returns true if a scroll region consumed it. */
  scroll(elementId: number, deltaX: number, deltaY: number): boolean {
    const region = this.regions.get(elementId);
    if (!region) return false;

    const maxScrollX = Math.max(0, region.contentWidth - region.viewportWidth);
    const maxScrollY = Math.max(0, region.contentHeight - region.viewportHeight);

    region.scrollX = Math.max(0, Math.min(maxScrollX, region.scrollX + deltaX));
    region.scrollY = Math.max(0, Math.min(maxScrollY, region.scrollY + deltaY));
    return true;
  }

  /** Get scroll position for a region */
  getScroll(elementId: number): { x: number; y: number } | null {
    const region = this.regions.get(elementId);
    if (!region) return null;
    return { x: region.scrollX, y: region.scrollY };
  }

  /** Render scrollbar for a region onto the grid */
  renderScrollbar(region: ScrollRegion, grid: CharGrid): void {
    const { col, row, viewportWidth, viewportHeight, contentHeight, scrollY } = region;

    // Only render vertical scrollbar if content overflows
    if (contentHeight <= viewportHeight) return;

    const barCol = col + viewportWidth - 1;
    const barHeight = viewportHeight;
    const maxScroll = contentHeight - viewportHeight;
    const ratio = scrollY / maxScroll;

    // Calculate thumb position and size
    const thumbSize = Math.max(1, Math.round((viewportHeight / contentHeight) * (barHeight - 2)));
    const thumbPos = Math.round(ratio * (barHeight - 2 - thumbSize));

    // Up arrow
    grid.set(barCol, row, { char: '▲', fg: '#888888' });

    // Track
    for (let r = 1; r < barHeight - 1; r++) {
      const isThumb = r - 1 >= thumbPos && r - 1 < thumbPos + thumbSize;
      grid.set(barCol, row + r, {
        char: isThumb ? '█' : '░',
        fg: isThumb ? '#aaaaaa' : '#444444',
      });
    }

    // Down arrow
    grid.set(barCol, row + barHeight - 1, { char: '▼', fg: '#888888' });
  }

  /** Get all registered regions */
  getRegions(): Map<number, ScrollRegion> {
    return this.regions;
  }

  /** Clear all regions */
  clear(): void {
    this.regions.clear();
  }
}
