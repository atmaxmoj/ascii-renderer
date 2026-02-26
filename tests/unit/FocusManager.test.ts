import { describe, it, expect } from 'vitest';
import { FocusManager } from '../../src/events/FocusManager.js';

function mockElement(tag: string, attrs: Record<string, string> = {}): Element {
  return {
    tagName: tag.toUpperCase(),
    getAttribute: (name: string) => attrs[name] ?? null,
    hasAttribute: (name: string) => name in attrs,
  } as unknown as Element;
}

describe('FocusManager', () => {
  describe('updateFocusableElements', () => {
    it('collects focusable elements (button, input, a, select, textarea)', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('div')],
        [2, mockElement('button')],
        [3, mockElement('input')],
        [4, mockElement('a')],
        [5, mockElement('span')],
        [6, mockElement('select')],
        [7, mockElement('textarea')],
      ]);
      fm.updateFocusableElements(map);
      expect(fm.getFocusOrder()).toEqual([2, 3, 4, 6, 7]);
    });

    it('excludes disabled elements', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('button', { disabled: '' })],
        [2, mockElement('button')],
      ]);
      fm.updateFocusableElements(map);
      expect(fm.getFocusOrder()).toEqual([2]);
    });

    it('includes elements with tabindex', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('div', { tabindex: '0' })],
        [2, mockElement('div')],
      ]);
      fm.updateFocusableElements(map);
      expect(fm.getFocusOrder()).toEqual([1]);
    });

    it('excludes tabindex="-1"', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('div', { tabindex: '-1' })],
      ]);
      fm.updateFocusableElements(map);
      expect(fm.getFocusOrder()).toEqual([]);
    });
  });

  describe('focusNext / focusPrev', () => {
    it('cycles forward through focus order', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('button')],
        [2, mockElement('input')],
        [3, mockElement('button')],
      ]);
      fm.updateFocusableElements(map);

      expect(fm.focusNext()).toBe(1);
      expect(fm.focusNext()).toBe(2);
      expect(fm.focusNext()).toBe(3);
      expect(fm.focusNext()).toBe(1); // wraps around
    });

    it('cycles backward through focus order', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('button')],
        [2, mockElement('input')],
        [3, mockElement('button')],
      ]);
      fm.updateFocusableElements(map);

      // Start from no focus — focusPrev wraps to last
      expect(fm.focusPrev()).toBe(3);
      expect(fm.focusPrev()).toBe(2);
      expect(fm.focusPrev()).toBe(1);
    });

    it('returns 0 when no focusable elements', () => {
      const fm = new FocusManager();
      fm.updateFocusableElements(new Map());
      expect(fm.focusNext()).toBe(0);
      expect(fm.focusPrev()).toBe(0);
    });
  });

  describe('tabIndex ordering', () => {
    it('positive tabindex elements come first', () => {
      const fm = new FocusManager();
      const map = new Map<number, Element>([
        [1, mockElement('button')],           // tabindex 0 (default)
        [2, mockElement('button', { tabindex: '2' })],
        [3, mockElement('button', { tabindex: '1' })],
      ]);
      fm.updateFocusableElements(map);
      // tabindex 1 first, then tabindex 2, then default (DOM order)
      expect(fm.getFocusOrder()).toEqual([3, 2, 1]);
    });
  });

  describe('focus / blur', () => {
    it('focus sets the focused element', () => {
      const fm = new FocusManager();
      fm.focus(5);
      expect(fm.getFocusedId()).toBe(5);
    });

    it('blur clears focus', () => {
      const fm = new FocusManager();
      fm.focus(5);
      fm.blur();
      expect(fm.getFocusedId()).toBe(0);
    });
  });
});
