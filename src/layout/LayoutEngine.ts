import { DEFAULT_FONT, DEFAULT_FONT_SIZE, DEFAULT_THEME } from '../types.js';

/**
 * Manages the hidden Shadow DOM container used for browser layout computation.
 * Injects user HTML, applies styles, and measures the monospace cell size.
 */
export class LayoutEngine {
  private hostElement: HTMLDivElement;
  private shadowRoot: ShadowRoot;
  private contentContainer: HTMLDivElement;
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private font: string;
  private fontSize: number;

  constructor(font?: string, fontSize?: number, fgColor?: string) {
    this.font = font || DEFAULT_FONT;
    this.fontSize = fontSize || DEFAULT_FONT_SIZE;

    // Create hidden host element
    this.hostElement = document.createElement('div');
    this.hostElement.style.position = 'fixed';
    this.hostElement.style.left = '-9999px';
    this.hostElement.style.top = '-9999px';
    this.hostElement.style.visibility = 'hidden';
    this.hostElement.style.pointerEvents = 'none';
    document.body.appendChild(this.hostElement);

    // Create Shadow DOM
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // Inject base stylesheet that sizes form elements to match their ASCII representation.
    // Uses `ch` units (= 1 monospace character width) so browser layout matches ASCII widths.
    const style = document.createElement('style');
    style.textContent = `
      * {
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        box-sizing: border-box;
      }
      button, input, select, textarea {
        font-family: inherit;
        font-size: inherit;
        border: none;
        margin: 0;
        padding: 0;
        background: transparent;
        color: inherit;
        vertical-align: middle;
      }
      /* button: "[ " + label + " ]" = label + 4ch, plus 1ch gap */
      button {
        padding: 0 2ch;
        margin-right: 1ch;
      }
      /* text-like inputs: "[" + content + "]" */
      input[type="text"], input[type="password"], input[type="email"],
      input[type="url"], input[type="search"], input[type="tel"] {
        min-width: 14ch;
        padding: 0 1ch;
      }
      input[type="number"] {
        min-width: 17ch; /* extra for " ▲▼" suffix */
        padding: 0 1ch;
      }
      input[type="date"] {
        min-width: 16ch; /* extra for " 📅" suffix */
        padding: 0 1ch;
      }
      input[type="checkbox"], input[type="radio"] {
        width: 3ch;
        height: 1lh;
        margin-right: 0.5ch;
        appearance: none;
        -webkit-appearance: none;
      }
      input[type="range"] {
        min-width: 14ch;
      }
      input[type="file"] {
        min-width: 30ch;
      }
      select {
        min-width: 14ch;
        padding: 0 1ch;
        padding-right: 3ch;
      }
      textarea {
        min-width: 20ch;
        min-height: 4lh;
      }
      /* Table layout: adjustMinHeights in Rasterizer ensures min cell height. */
      table {
        border-spacing: 0;
      }
      td, th {
        padding: 0 1ch;
      }
    `;
    this.shadowRoot.appendChild(style);

    // Create content container inside shadow DOM
    // Must set visibility:visible to override the host's visibility:hidden,
    // otherwise all children inherit hidden and the rasterizer skips them.
    this.contentContainer = document.createElement('div');
    this.contentContainer.id = 'ascii-renderer-root';
    this.contentContainer.style.visibility = 'visible';
    this.contentContainer.style.lineHeight = '1';
    this.contentContainer.style.color = fgColor || DEFAULT_THEME.fg;
    this.shadowRoot.appendChild(this.contentContainer);

    // Measure cell size
    this.measureCellSize();
  }

  /** Measure the size of a single monospace character */
  private measureCellSize(): void {
    const probe = document.createElement('span');
    probe.style.fontFamily = this.font;
    probe.style.fontSize = `${this.fontSize}px`;
    probe.style.lineHeight = '1';
    probe.style.position = 'absolute';
    probe.style.whiteSpace = 'pre';
    probe.textContent = 'M';
    this.shadowRoot.appendChild(probe);

    const rect = probe.getBoundingClientRect();
    this.cellWidth = rect.width;
    this.cellHeight = rect.height;

    this.shadowRoot.removeChild(probe);

    // Fallback if measurement fails
    if (this.cellWidth === 0) this.cellWidth = this.fontSize * 0.6;
    if (this.cellHeight === 0) this.cellHeight = this.fontSize;
  }

  /** Set HTML content into the hidden DOM for layout */
  setContent(html: string, containerWidth: number, containerHeight: number): void {
    // Set container dimensions to match the grid in pixel space
    this.contentContainer.style.width = `${containerWidth}px`;
    this.contentContainer.style.height = `${containerHeight}px`;
    this.contentContainer.style.fontFamily = this.font;
    this.contentContainer.style.fontSize = `${this.fontSize}px`;
    this.contentContainer.style.overflow = 'hidden';
    this.contentContainer.style.position = 'relative';
    this.contentContainer.style.boxSizing = 'border-box';

    this.contentContainer.innerHTML = html;
  }

  /** Get the content container root element */
  getContentRoot(): HTMLDivElement {
    return this.contentContainer;
  }

  /** Get the shadow root */
  getShadowRoot(): ShadowRoot {
    return this.shadowRoot;
  }

  /** Get measured cell width in pixels */
  getCellWidth(): number {
    return this.cellWidth;
  }

  /** Get measured cell height in pixels */
  getCellHeight(): number {
    return this.cellHeight;
  }

  /** Get pixel width for a given number of columns */
  getPixelWidth(cols: number): number {
    return cols * this.cellWidth;
  }

  /** Update the default text color (used when user HTML has no explicit color) */
  setFgColor(color: string): void {
    this.contentContainer.style.color = color;
  }

  /** Get pixel height for a given number of rows */
  getPixelHeight(rows: number): number {
    return rows * this.cellHeight;
  }

  /** Clean up DOM elements */
  destroy(): void {
    if (this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
    }
  }
}
