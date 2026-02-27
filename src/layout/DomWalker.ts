import { LayoutNode, ComputedStyleInfo, PixelRect } from '../types.js';
import { CoordinateMapper } from './CoordinateMapper.js';

let nextNodeId = 1;

/** Reset the node ID counter (useful for tests) */
export function resetNodeIdCounter(): void {
  nextNodeId = 1;
}

/**
 * Recursively walks the DOM tree, reading getBoundingClientRect() and
 * getComputedStyle() for each element to build a LayoutNode tree.
 *
 * When an element has mixed content (child elements + text nodes, e.g.
 * `<div><input type="checkbox"> Dark mode</div>`), text nodes are measured
 * via Range and added as LayoutNode children with `isTextNode: true`.
 * This ensures text is rendered at its correct browser-computed position,
 * not overlapping with sibling elements.
 */
export class DomWalker {
  private mapper: CoordinateMapper;
  private containerRect: DOMRect;

  constructor(mapper: CoordinateMapper) {
    this.mapper = mapper;
    this.containerRect = new DOMRect(0, 0, 0, 0);
  }

  /** Walk the DOM tree starting from the root element */
  walk(root: Element): LayoutNode {
    this.containerRect = root.getBoundingClientRect();
    resetNodeIdCounter();
    return this.walkElement(root, null);
  }

  private walkElement(element: Element, parent: LayoutNode | null): LayoutNode {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    const pixelRect: PixelRect = {
      x: rect.left - this.containerRect.left,
      y: rect.top - this.containerRect.top,
      width: rect.width,
      height: rect.height,
    };

    const charRect = this.mapper.pixelToChar(pixelRect);
    const styleInfo = this.extractStyleInfo(style);

    const isEscaped = element.hasAttribute('data-ascii-escape');

    const node: LayoutNode = {
      id: nextNodeId++,
      element,
      tagName: element.tagName.toLowerCase(),
      pixelRect,
      charRect,
      style: styleInfo,
      textContent: null,
      children: [],
      parent,
      isTextNode: false,
      isEscaped,
      stackingOrder: 0,
    };

    // Escaped elements: keep the LayoutNode (for positioning) but don't recurse children
    if (isEscaped) {
      return node;
    }

    // Select elements: treat as leaf — option children are handled by ElementRenderers
    const tag = node.tagName;
    if (tag === 'select') {
      node.textContent = this.getDirectTextContent(element, styleInfo.whiteSpace);
      return node;
    }

    const hasElementChildren = element.children.length > 0;

    if (hasElementChildren) {
      // Mixed content: walk all child nodes (elements + text nodes)
      // Text nodes get their own LayoutNode with measured positions
      for (let i = 0; i < element.childNodes.length; i++) {
        const childNode = element.childNodes[i];
        if (childNode.nodeType === Node.ELEMENT_NODE) {
          const childLayoutNode = this.walkElement(childNode as Element, node);
          node.children.push(childLayoutNode);
        } else if (childNode.nodeType === Node.TEXT_NODE) {
          const textLayoutNode = this.createTextLayoutNode(childNode as Text, node, styleInfo);
          if (textLayoutNode) {
            node.children.push(textLayoutNode);
          }
        }
      }
      // textContent stays null — text is handled by child text nodes
    } else {
      // Leaf element: use direct text content as before
      node.textContent = this.getDirectTextContent(element, styleInfo.whiteSpace);
      // No children to walk
    }

    return node;
  }

  /** Create a LayoutNode for a text DOM node, using Range to measure position */
  private createTextLayoutNode(
    textNode: Text,
    parent: LayoutNode,
    parentStyle: ComputedStyleInfo,
  ): LayoutNode | null {
    const text = textNode.textContent;
    if (!text || !text.trim()) return null;

    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rects = range.getClientRects();
    if (rects.length === 0) return null;

    // Use the bounding rect of all client rects
    const bounding = range.getBoundingClientRect();
    if (bounding.width === 0 && bounding.height === 0) return null;

    const pixelRect: PixelRect = {
      x: bounding.left - this.containerRect.left,
      y: bounding.top - this.containerRect.top,
      width: bounding.width,
      height: bounding.height,
    };

    const charRect = this.mapper.pixelToChar(pixelRect);
    if (charRect.width <= 0 || charRect.height <= 0) return null;

    return {
      id: nextNodeId++,
      element: parent.element, // Hit-testing maps to parent element
      tagName: '#text',
      pixelRect,
      charRect,
      style: parentStyle, // Inherit parent's computed style
      textContent: text.trim(),
      children: [],
      parent,
      isTextNode: true,
      isEscaped: false,
      stackingOrder: 0,
    };
  }

  /** Get only direct text content (not from children) — for leaf elements */
  private getDirectTextContent(element: Element, whiteSpace: string): string | null {
    let text = '';
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || '';
      }
    }
    // Preserve leading whitespace for pre-formatted text (positioning-significant)
    if (whiteSpace === 'pre' || whiteSpace === 'pre-wrap') {
      return text.length > 0 ? text : null;
    }
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  /** Extract relevant computed styles */
  private extractStyleInfo(style: CSSStyleDeclaration): ComputedStyleInfo {
    return {
      display: style.display,
      position: style.position,
      overflow: style.overflow,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      zIndex: style.zIndex,
      opacity: style.opacity,
      transform: style.transform,
      visibility: style.visibility,
      color: style.color,
      backgroundColor: style.backgroundColor,
      fontWeight: style.fontWeight,
      fontStyle: style.fontStyle,
      textDecoration: style.textDecoration,
      textAlign: style.textAlign,
      borderTopStyle: style.borderTopStyle,
      borderRightStyle: style.borderRightStyle,
      borderBottomStyle: style.borderBottomStyle,
      borderLeftStyle: style.borderLeftStyle,
      borderTopWidth: style.borderTopWidth,
      borderRightWidth: style.borderRightWidth,
      borderBottomWidth: style.borderBottomWidth,
      borderLeftWidth: style.borderLeftWidth,
      borderTopColor: style.borderTopColor,
      borderRightColor: style.borderRightColor,
      borderBottomColor: style.borderBottomColor,
      borderLeftColor: style.borderLeftColor,
      flexDirection: style.flexDirection,
      cursor: style.cursor,
      whiteSpace: style.whiteSpace,
      textOverflow: style.textOverflow,
    };
  }
}
