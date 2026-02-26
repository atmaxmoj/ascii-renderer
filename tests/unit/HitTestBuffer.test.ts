import { describe, it, expect } from 'vitest';
import { HitTestBuffer } from '../../src/events/HitTestBuffer.js';

describe('HitTestBuffer', () => {
  describe('constructor', () => {
    it('creates a buffer with correct dimensions', () => {
      const buffer = new HitTestBuffer(10, 5);
      expect(buffer.cols).toBe(10);
      expect(buffer.rows).toBe(5);
    });

    it('initializes all values to 0', () => {
      const buffer = new HitTestBuffer(5, 5);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          expect(buffer.lookup(c, r)).toBe(0);
        }
      }
    });
  });

  describe('set/lookup', () => {
    it('stores and retrieves element IDs', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.set(3, 5, 42);
      expect(buffer.lookup(3, 5)).toBe(42);
    });

    it('returns 0 for out-of-bounds lookups', () => {
      const buffer = new HitTestBuffer(10, 10);
      expect(buffer.lookup(-1, 0)).toBe(0);
      expect(buffer.lookup(10, 0)).toBe(0);
      expect(buffer.lookup(0, -1)).toBe(0);
      expect(buffer.lookup(0, 10)).toBe(0);
    });

    it('ignores out-of-bounds sets', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.set(-1, 0, 42); // Should not throw
      buffer.set(10, 0, 42); // Should not throw
    });
  });

  describe('fill', () => {
    it('fills a rectangular region with an element ID', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.fill(2, 3, 4, 2, 7);

      expect(buffer.lookup(2, 3)).toBe(7);
      expect(buffer.lookup(5, 4)).toBe(7);
      expect(buffer.lookup(1, 3)).toBe(0); // Outside
      expect(buffer.lookup(6, 3)).toBe(0); // Outside
      expect(buffer.lookup(2, 2)).toBe(0); // Outside
      expect(buffer.lookup(2, 5)).toBe(0); // Outside
    });

    it('overwrites previous values', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.fill(0, 0, 10, 10, 1);
      buffer.fill(3, 3, 4, 4, 2);

      expect(buffer.lookup(0, 0)).toBe(1);
      expect(buffer.lookup(3, 3)).toBe(2);
      expect(buffer.lookup(6, 6)).toBe(2);
      expect(buffer.lookup(7, 7)).toBe(1);
    });
  });

  describe('clear', () => {
    it('resets all values to 0', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.fill(0, 0, 10, 10, 42);
      buffer.clear();

      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          expect(buffer.lookup(c, r)).toBe(0);
        }
      }
    });
  });

  describe('resize', () => {
    it('creates a new buffer with different dimensions', () => {
      const buffer = new HitTestBuffer(10, 10);
      buffer.fill(0, 0, 10, 10, 1);

      const resized = buffer.resize(20, 15);
      expect(resized.cols).toBe(20);
      expect(resized.rows).toBe(15);
      expect(resized.lookup(0, 0)).toBe(0); // New buffer is empty
    });
  });
});
