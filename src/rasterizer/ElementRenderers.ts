import { LayoutNode } from '../types.js';
import { CharGrid } from '../display/CharGrid.js';
import { stringDisplayWidth } from '../utils/charWidth.js';

/**
 * Per-element ASCII rendering rules for special HTML elements.
 *
 * Each renderer returns the actual number of columns consumed,
 * so the rasterizer can adjust sibling positions to prevent overlap.
 * Returns 0 if the element was not handled.
 */
export class ElementRenderers {
  /** Render element-specific ASCII art. Returns columns consumed, or 0 if not handled. */
  render(node: LayoutNode, grid: CharGrid): number {
    switch (node.tagName) {
      case 'hr':
        return this.renderHR(node, grid);
      case 'input':
        return this.renderInput(node, grid);
      case 'button':
        return this.renderButton(node, grid);
      case 'select':
        return this.renderSelect(node, grid);
      case 'textarea':
        return this.renderTextarea(node, grid);
      case 'progress':
        return this.renderProgress(node, grid);
      case 'details':
        return this.renderDetails(node, grid);
      case 'li':
        return this.renderListItem(node, grid);
      default:
        return 0;
    }
  }

  private renderHR(node: LayoutNode, grid: CharGrid): number {
    const { col, row, width } = node.charRect;
    if (width < 1) return width;
    for (let c = col; c < col + width; c++) {
      grid.set(c, row, { char: '─', fg: node.style.color, elementId: node.id });
    }
    return width;
  }

  private renderInput(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const type = node.element.getAttribute('type') || 'text';
    const value = (node.element as HTMLInputElement).value || '';
    const id = node.id;
    const fg = node.style.color;

    let display: string;

    switch (type) {
      case 'checkbox': {
        const checked = (node.element as HTMLInputElement).checked;
        display = checked ? '[✓]' : '[ ]';
        break;
      }
      case 'radio': {
        const checked = (node.element as HTMLInputElement).checked;
        display = checked ? '(●)' : '( )';
        break;
      }
      case 'range': {
        const min = parseFloat(node.element.getAttribute('min') || '0');
        const max = parseFloat(node.element.getAttribute('max') || '100');
        const val = parseFloat(value || '50');
        const trackWidth = Math.max(node.charRect.width - 2, 10);
        const pos = Math.round(((val - min) / (max - min)) * (trackWidth - 1));
        let track = '◄';
        for (let i = 0; i < trackWidth; i++) {
          track += i === pos ? '█' : '═';
        }
        track += '►';
        display = track;
        break;
      }
      case 'password': {
        // Each character (regardless of width) shows as one '•'
        const charCount = [...value].length;
        const masked = '•'.repeat(charCount);
        const fieldWidth = Math.max(node.charRect.width - 2, charCount, 10);
        display = '[' + masked.padEnd(fieldWidth, '_') + ']';
        break;
      }
      case 'file': {
        const fileName = value ? value.split(/[\\/]/).pop() || '' : 'No file chosen';
        display = '[ Choose File ] ' + fileName;
        break;
      }
      default: {
        const valueVisualWidth = stringDisplayWidth(value);
        const fieldWidth = Math.max(node.charRect.width - 2, valueVisualWidth, 10);
        const padCount = Math.max(0, fieldWidth - valueVisualWidth);
        const displayValue = value + '_'.repeat(padCount);
        let suffix = '';
        if (type === 'number') suffix = ' ▲▼';
        if (type === 'date') suffix = ' 📅';
        display = '[' + displayValue + suffix + ']';
        break;
      }
    }

    grid.writeText(col, row, display, fg, undefined, id);
    return stringDisplayWidth(display);
  }

  private renderButton(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const label = node.textContent || 'Button';
    const fg = node.style.color;
    const display = '[ ' + label + ' ]';
    grid.writeText(col, row, display, fg, undefined, node.id);
    return stringDisplayWidth(display);
  }

  private renderSelect(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const select = node.element as HTMLSelectElement;
    const selectedText = select.options[select.selectedIndex]?.text || '';
    const display = '[' + selectedText + ' ▼]';
    grid.writeText(col, row, display, node.style.color, undefined, node.id);
    return stringDisplayWidth(display);
  }

  private renderTextarea(node: LayoutNode, grid: CharGrid): number {
    const { col, row, width, height } = node.charRect;
    const value = (node.element as HTMLTextAreaElement).value || '';
    const fg = node.style.color;
    const id = node.id;

    const boxW = Math.max(width, 20);
    const boxH = Math.max(height, 4);

    grid.drawBox(col, row, boxW, boxH, 'solid', fg, id);

    const lines = value.split('\n');
    const innerWidth = boxW - 2;
    const innerHeight = boxH - 2;

    for (let lineIdx = 0; lineIdx < lines.length && lineIdx < innerHeight; lineIdx++) {
      const line = this.truncateToVisualWidth(lines[lineIdx], innerWidth);
      grid.writeText(col + 1, row + 1 + lineIdx, line, fg, undefined, id);
    }

    if (boxH >= 2 && boxW >= 2) {
      grid.set(col + boxW - 1, row + boxH - 1, { char: '◢', fg, elementId: id });
    }

    return boxW;
  }

  private renderProgress(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const progress = node.element as HTMLProgressElement;
    const value = progress.value;
    const max = progress.max || 1;
    const ratio = Math.max(0, Math.min(1, value / max));
    const fg = node.style.color;

    const barWidth = Math.max(node.charRect.width - 2, 10);
    const filledWidth = Math.round(ratio * barWidth);
    const emptyWidth = barWidth - filledWidth;

    const display = '[' + '█'.repeat(filledWidth) + '░'.repeat(emptyWidth) + ']';
    grid.writeText(col, row, display, fg, undefined, node.id);
    return stringDisplayWidth(display);
  }

  private renderDetails(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const open = node.element.hasAttribute('open');
    const marker = open ? '▼' : '▶';
    grid.set(col, row, { char: marker, fg: node.style.color, elementId: node.id });
    return 0; // Let children render normally
  }

  private renderListItem(node: LayoutNode, grid: CharGrid): number {
    const { col, row } = node.charRect;
    const fg = node.style.color;
    const parent = node.parent;

    let marker: string;
    if (parent && parent.tagName === 'ol') {
      // Ordered list: compute index among li siblings
      let idx = 0;
      for (const sibling of parent.children) {
        if (sibling.tagName === 'li') idx++;
        if (sibling === node) break;
      }
      marker = idx + '.';
    } else {
      marker = '•';
    }

    // Place marker to the left of li content (in the ul/ol padding area)
    const markerCol = col - marker.length - 1;
    if (markerCol >= 0) {
      grid.writeText(markerCol, row, marker, fg, undefined, node.id);
    }

    return 0; // Let children render normally
  }

  /** Truncate a string to fit within a visual column width */
  private truncateToVisualWidth(text: string, maxWidth: number): string {
    let width = 0;
    let result = '';
    for (const char of text) {
      const w = stringDisplayWidth(char);
      if (width + w > maxWidth) break;
      result += char;
      width += w;
    }
    return result;
  }
}
