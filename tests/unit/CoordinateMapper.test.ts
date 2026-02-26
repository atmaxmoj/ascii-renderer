import { describe, it, expect } from 'vitest';
import { CoordinateMapper } from '../../src/layout/CoordinateMapper.js';

describe('CoordinateMapper', () => {
  const cellWidth = 8;
  const cellHeight = 16;

  describe('pixelToChar', () => {
    it('converts pixel rect to char rect', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);
      const result = mapper.pixelToChar({
        x: 16,
        y: 32,
        width: 80,
        height: 48,
      });

      expect(result.col).toBe(2);   // 16 / 8 = 2
      expect(result.row).toBe(2);   // 32 / 16 = 2
      expect(result.width).toBe(10); // 80 / 8 = 10
      expect(result.height).toBe(3); // 48 / 16 = 3
    });

    it('rounds pixel values to nearest char position', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);
      const result = mapper.pixelToChar({
        x: 12,  // rounds to col 2 (12/8 = 1.5 → round → 2)
        y: 20,  // rounds to row 1 (20/16 = 1.25 → round → 1)
        width: 36, // right = 48/8 = 6, width = 6 - 2 = 4
        height: 28, // bottom = 48/16 = 3, height = 3 - 1 = 2
      });

      expect(result.col).toBe(2);
      expect(result.row).toBe(1);
      expect(result.width).toBe(4);
      expect(result.height).toBe(2);
    });

    it('clamps negative values to 0', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);
      const result = mapper.pixelToChar({
        x: -16,
        y: -32,
        width: 80,
        height: 48,
      });

      expect(result.col).toBe(0);
      expect(result.row).toBe(0);
    });

    it('handles offset', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight, 100, 50);
      const result = mapper.pixelToChar({
        x: 116, // 116 - 100 = 16 → 16 / 8 = 2
        y: 82,  // 82 - 50 = 32 → 32 / 16 = 2
        width: 80,
        height: 48,
      });

      expect(result.col).toBe(2);
      expect(result.row).toBe(2);
    });
  });

  describe('charToPixel', () => {
    it('converts char rect to pixel rect', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);
      const result = mapper.charToPixel({
        col: 2,
        row: 3,
        width: 10,
        height: 4,
      });

      expect(result.x).toBe(16);    // 2 * 8
      expect(result.y).toBe(48);    // 3 * 16
      expect(result.width).toBe(80); // 10 * 8
      expect(result.height).toBe(64); // 4 * 16
    });
  });

  describe('pixelToGridPos', () => {
    it('converts pixel position to grid position using floor', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);

      expect(mapper.pixelToGridPos(0, 0)).toEqual({ col: 0, row: 0 });
      expect(mapper.pixelToGridPos(7, 15)).toEqual({ col: 0, row: 0 });
      expect(mapper.pixelToGridPos(8, 16)).toEqual({ col: 1, row: 1 });
      expect(mapper.pixelToGridPos(20, 40)).toEqual({ col: 2, row: 2 });
    });
  });

  describe('gridToPixelCenter', () => {
    it('returns center of a grid cell in pixels', () => {
      const mapper = new CoordinateMapper(cellWidth, cellHeight);
      const center = mapper.gridToPixelCenter(2, 3);

      expect(center.x).toBe(20);  // 2 * 8 + 4
      expect(center.y).toBe(56);  // 3 * 16 + 8
    });
  });

  describe('updateCellSize', () => {
    it('updates the cell dimensions', () => {
      const mapper = new CoordinateMapper(8, 16);
      mapper.updateCellSize(10, 20);

      expect(mapper.getCellWidth()).toBe(10);
      expect(mapper.getCellHeight()).toBe(20);

      const result = mapper.pixelToChar({
        x: 20,
        y: 40,
        width: 50,
        height: 60,
      });

      expect(result.col).toBe(2);  // 20 / 10
      expect(result.row).toBe(2);  // 40 / 20
    });
  });
});
