import { describe, it, expect } from 'vitest';
import { OverlayManager } from '../../src/rasterizer/OverlayManager.js';
import { CharGrid } from '../../src/display/CharGrid.js';

describe('OverlayManager', () => {
  describe('push / remove / clear', () => {
    it('adds and removes overlays', () => {
      const om = new OverlayManager();
      om.push({
        id: 'test',
        col: 0, row: 0, width: 10, height: 5,
        priority: 1,
        render: () => {},
      });
      expect(om.count).toBe(1);
      om.remove('test');
      expect(om.count).toBe(0);
    });

    it('clears all overlays', () => {
      const om = new OverlayManager();
      om.push({ id: 'a', col: 0, row: 0, width: 5, height: 5, priority: 1, render: () => {} });
      om.push({ id: 'b', col: 0, row: 0, width: 5, height: 5, priority: 2, render: () => {} });
      om.clear();
      expect(om.count).toBe(0);
    });
  });

  describe('hitTest', () => {
    it('returns overlay when position is inside', () => {
      const om = new OverlayManager();
      const overlay = {
        id: 'test',
        col: 5, row: 3, width: 10, height: 5,
        priority: 1,
        render: () => {},
      };
      om.push(overlay);

      expect(om.hitTest(5, 3)).toBe(overlay);
      expect(om.hitTest(14, 7)).toBe(overlay);
      expect(om.hitTest(4, 3)).toBeNull();  // outside left
      expect(om.hitTest(15, 3)).toBeNull(); // outside right
    });

    it('returns topmost overlay on overlap', () => {
      const om = new OverlayManager();
      om.push({ id: 'bottom', col: 0, row: 0, width: 20, height: 20, priority: 1, render: () => {} });
      om.push({ id: 'top', col: 5, row: 5, width: 10, height: 10, priority: 2, render: () => {} });

      const hit = om.hitTest(7, 7);
      expect(hit?.id).toBe('top');
    });
  });

  describe('handleClick', () => {
    it('returns false when no overlays', () => {
      const om = new OverlayManager();
      expect(om.handleClick(0, 0)).toBe(false);
    });

    it('returns true when click is inside overlay', () => {
      const om = new OverlayManager();
      om.push({ id: 'test', col: 0, row: 0, width: 10, height: 10, priority: 1, render: () => {} });
      expect(om.handleClick(5, 5)).toBe(true);
    });

    it('calls onClick when click is inside overlay', () => {
      const om = new OverlayManager();
      let clickedCol = -1;
      let clickedRow = -1;
      om.push({
        id: 'test', col: 0, row: 0, width: 10, height: 10, priority: 1,
        render: () => {},
        onClick: (col, row) => { clickedCol = col; clickedRow = row; },
      });
      om.handleClick(5, 3);
      expect(clickedCol).toBe(5);
      expect(clickedRow).toBe(3);
    });

    it('calls onClickOutside when click is outside', () => {
      const om = new OverlayManager();
      let closed = false;
      om.push({
        id: 'test', col: 5, row: 5, width: 5, height: 5, priority: 1,
        render: () => {},
        onClickOutside: () => { closed = true; },
      });
      om.handleClick(0, 0);
      expect(closed).toBe(true);
    });
  });

  describe('paintAll', () => {
    it('calls render on all overlays', () => {
      const om = new OverlayManager();
      const grid = new CharGrid(20, 10);
      let rendered = 0;

      om.push({ id: 'a', col: 0, row: 0, width: 5, height: 5, priority: 1, render: () => { rendered++; } });
      om.push({ id: 'b', col: 0, row: 0, width: 5, height: 5, priority: 2, render: () => { rendered++; } });

      om.paintAll(grid);
      expect(rendered).toBe(2);
    });
  });

  describe('createSelectDropdown', () => {
    it('creates a dropdown overlay with correct dimensions', () => {
      const options = ['Apple', 'Banana', 'Cherry'];
      let selectedIdx = -1;
      let closed = false;

      const dropdown = OverlayManager.createSelectDropdown(
        'select-1', 5, 3, options, 0, 10, 30,
        (idx) => { selectedIdx = idx; },
        () => { closed = true; },
      );

      expect(dropdown.overlay.id).toBe('select-1');
      expect(dropdown.overlay.col).toBe(5);
      expect(dropdown.overlay.height).toBe(5); // 3 options + 2 border

      // Navigate and confirm
      dropdown.moveDown();
      dropdown.confirm();
      expect(selectedIdx).toBe(1); // Banana
      expect(closed).toBe(true);
    });

    it('clicking on an option selects it', () => {
      const options = ['Apple', 'Banana', 'Cherry'];
      let selectedIdx = -1;
      let closed = false;

      const dropdown = OverlayManager.createSelectDropdown(
        'select-1', 5, 3, options, 0, 10, 30,
        (idx) => { selectedIdx = idx; },
        () => { closed = true; },
      );

      const om = new OverlayManager();
      om.push(dropdown.overlay);

      // Click on the second option (row = actualRow + 1 + 1 = 5)
      om.handleClick(6, 5); // col inside overlay, row for "Banana"
      expect(selectedIdx).toBe(1);
      expect(closed).toBe(true);
    });

    it('flips up when not enough space below', () => {
      const options = ['A', 'B', 'C', 'D', 'E'];
      const dropdown = OverlayManager.createSelectDropdown(
        'select-1', 0, 28, options, 0, 10, 30, // row 28, gridRows 30, needs 7 rows
        () => {}, () => {},
      );
      // Should flip up: 28 - 7 = 21
      expect(dropdown.overlay.row).toBeLessThan(28);
    });
  });
});
