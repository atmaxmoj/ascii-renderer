import { describe, it, expect } from 'vitest';
import { ScrollHandler } from '../../src/events/ScrollHandler.js';
import { CharGrid } from '../../src/display/CharGrid.js';

describe('ScrollHandler', () => {
  describe('scroll', () => {
    it('updates scroll position within bounds', () => {
      const sh = new ScrollHandler();
      sh.register({
        elementId: 1,
        col: 0, row: 0,
        viewportWidth: 20, viewportHeight: 10,
        contentWidth: 20, contentHeight: 30,
        scrollX: 0, scrollY: 0,
      });

      sh.scroll(1, 0, 5);
      expect(sh.getScroll(1)).toEqual({ x: 0, y: 5 });

      sh.scroll(1, 0, 100);
      expect(sh.getScroll(1)).toEqual({ x: 0, y: 20 }); // clamped to max (30-10)
    });

    it('does not scroll below 0', () => {
      const sh = new ScrollHandler();
      sh.register({
        elementId: 1,
        col: 0, row: 0,
        viewportWidth: 20, viewportHeight: 10,
        contentWidth: 20, contentHeight: 30,
        scrollX: 0, scrollY: 5,
      });

      sh.scroll(1, 0, -100);
      expect(sh.getScroll(1)).toEqual({ x: 0, y: 0 }); // clamped to 0
    });

    it('returns false for unregistered elements', () => {
      const sh = new ScrollHandler();
      expect(sh.scroll(999, 0, 5)).toBe(false);
    });
  });

  describe('renderScrollbar', () => {
    it('renders vertical scrollbar with arrows and thumb', () => {
      const sh = new ScrollHandler();
      const grid = new CharGrid(25, 12);
      const region = {
        elementId: 1,
        col: 0, row: 0,
        viewportWidth: 25, viewportHeight: 12,
        contentWidth: 25, contentHeight: 36,
        scrollX: 0, scrollY: 0,
      };

      sh.renderScrollbar(region, grid);

      // Up arrow at top
      expect(grid.get(24, 0)?.char).toBe('▲');
      // Down arrow at bottom
      expect(grid.get(24, 11)?.char).toBe('▼');
      // Thumb somewhere in the middle
      let hasThumb = false;
      for (let r = 1; r < 11; r++) {
        if (grid.get(24, r)?.char === '█') hasThumb = true;
      }
      expect(hasThumb).toBe(true);
    });

    it('does not render scrollbar when content fits viewport', () => {
      const sh = new ScrollHandler();
      const grid = new CharGrid(25, 12);
      const region = {
        elementId: 1,
        col: 0, row: 0,
        viewportWidth: 25, viewportHeight: 12,
        contentWidth: 25, contentHeight: 10,
        scrollX: 0, scrollY: 0,
      };

      sh.renderScrollbar(region, grid);

      // No arrows should be drawn
      expect(grid.get(24, 0)?.char).toBe(' ');
    });
  });
});
