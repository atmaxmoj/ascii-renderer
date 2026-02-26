

/**
 * Manages focus state: tracks the currently focused element,
 * handles Tab/Shift+Tab navigation, and provides focus ring info
 * for the rasterizer to draw visual focus indicators.
 */
export class FocusManager {
  private focusedElementId: number = 0;
  private focusableElements: Map<number, Element> = new Map();
  private focusOrder: number[] = [];

  /** Update the set of focusable elements from the element map */
  updateFocusableElements(elementMap: Map<number, Element>): void {
    this.focusableElements.clear();
    this.focusOrder = [];

    for (const [id, element] of elementMap) {
      if (this.isFocusableElement(element)) {
        this.focusableElements.set(id, element);
        this.focusOrder.push(id);
      }
    }

    // Sort by tabIndex, then DOM order (approximated by id)
    this.focusOrder.sort((a, b) => {
      const elA = this.focusableElements.get(a)!;
      const elB = this.focusableElements.get(b)!;
      const tabA = this.getTabIndex(elA);
      const tabB = this.getTabIndex(elB);

      if (tabA > 0 && tabB > 0) return tabA - tabB;
      if (tabA > 0) return -1;
      if (tabB > 0) return 1;
      return a - b;
    });

    // If current focused element no longer exists, clear focus
    if (this.focusedElementId && !this.focusableElements.has(this.focusedElementId)) {
      this.focusedElementId = 0;
    }
  }

  /** Focus a specific element by ID */
  focus(elementId: number): void {
    this.focusedElementId = elementId;
  }

  /** Focus by element reference (find its ID in the map) */
  focusByElement(element: Element, elementMap: Map<number, Element>): void {
    for (const [id, el] of elementMap) {
      if (el === element) {
        this.focusedElementId = id;
        return;
      }
    }
  }

  /** Move focus forward (Tab) */
  focusNext(): number {
    if (this.focusOrder.length === 0) return 0;
    const currentIdx = this.focusOrder.indexOf(this.focusedElementId);
    // If not found (-1), start at 0; otherwise advance
    const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % this.focusOrder.length;
    this.focusedElementId = this.focusOrder[nextIdx];
    return this.focusedElementId;
  }

  /** Move focus backward (Shift+Tab) */
  focusPrev(): number {
    if (this.focusOrder.length === 0) return 0;
    const currentIdx = this.focusOrder.indexOf(this.focusedElementId);
    // If not found (-1), start at last; otherwise go back
    const prevIdx = currentIdx < 0
      ? this.focusOrder.length - 1
      : (currentIdx - 1 + this.focusOrder.length) % this.focusOrder.length;
    this.focusedElementId = this.focusOrder[prevIdx];
    return this.focusedElementId;
  }

  /** Get currently focused element ID */
  getFocusedId(): number {
    return this.focusedElementId;
  }

  /** Get the focused element */
  getFocusedElement(): Element | null {
    return this.focusableElements.get(this.focusedElementId) || null;
  }

  /** Get the focus order list */
  getFocusOrder(): number[] {
    return [...this.focusOrder];
  }

  /** Clear focus */
  blur(): void {
    this.focusedElementId = 0;
  }

  /** Check if an element is focusable */
  isFocusableElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
      return !element.hasAttribute('disabled');
    }
    return element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  }

  private getTabIndex(element: Element): number {
    const attr = element.getAttribute('tabindex');
    if (attr === null) return 0;
    return parseInt(attr, 10) || 0;
  }
}
