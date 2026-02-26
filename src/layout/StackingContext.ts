import { LayoutNode, StackingContext } from '../types.js';

/**
 * Builds a stacking context tree from the LayoutNode tree.
 *
 * A new stacking context is created when an element has:
 * - position: relative/absolute/fixed/sticky with z-index != auto
 * - opacity < 1
 * - transform != none
 * - display: flex/grid children with z-index != auto
 */
export class StackingContextBuilder {
  /** Build the stacking context tree from a layout tree */
  build(root: LayoutNode): StackingContext {
    return this.buildContext(root);
  }

  private buildContext(node: LayoutNode): StackingContext {
    const context: StackingContext = {
      node,
      zIndex: this.getZIndex(node),
      children: [],
    };

    // Collect all children, separating those that form new stacking contexts
    this.collectChildren(node, context);

    // Sort children by stacking order:
    // 1. Negative z-index
    // 2. Non-positioned (flow order)
    // 3. Positioned without z-index
    // 4. Positive z-index
    context.children.sort((a, b) => {
      if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
      // Same z-index: maintain DOM order (by node id)
      return a.node.id - b.node.id;
    });

    return context;
  }

  private collectChildren(node: LayoutNode, parentContext: StackingContext): void {
    for (const child of node.children) {
      if (this.createsStackingContext(child)) {
        // This child forms a new stacking context
        const childContext = this.buildContext(child);
        parentContext.children.push(childContext);
      } else {
        // This child doesn't form a stacking context, add its content
        // to the parent context but still recurse for grandchildren
        const inlineContext: StackingContext = {
          node: child,
          zIndex: 0,
          children: [],
        };
        this.collectChildren(child, inlineContext);
        parentContext.children.push(inlineContext);
      }
    }
  }

  /** Check if a node creates a new stacking context */
  private createsStackingContext(node: LayoutNode): boolean {
    const style = node.style;

    // Position with explicit z-index
    if (
      (style.position === 'relative' ||
        style.position === 'absolute' ||
        style.position === 'fixed' ||
        style.position === 'sticky') &&
      style.zIndex !== 'auto'
    ) {
      return true;
    }

    // Opacity < 1
    if (parseFloat(style.opacity) < 1) {
      return true;
    }

    // Transform
    if (style.transform !== 'none' && style.transform !== '') {
      return true;
    }

    return false;
  }

  /** Get numeric z-index, defaulting to 0 */
  private getZIndex(node: LayoutNode): number {
    const z = parseInt(node.style.zIndex, 10);
    return isNaN(z) ? 0 : z;
  }

  /** Flatten stacking context tree into ordered list for painting */
  flatten(context: StackingContext): LayoutNode[] {
    const result: LayoutNode[] = [];
    this.flattenRecursive(context, result);
    return result;
  }

  private flattenRecursive(context: StackingContext, result: LayoutNode[]): void {
    result.push(context.node);
    for (const child of context.children) {
      this.flattenRecursive(child, result);
    }
  }
}
