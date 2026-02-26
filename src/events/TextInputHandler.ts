/**
 * Handles text input via a hidden textarea technique (like CodeMirror).
 * Captures keystrokes, handles IME composition, and manages cursor display.
 * Syncs value back to the hidden DOM input element and requests re-render.
 */
export class TextInputHandler {
  private textarea: HTMLTextAreaElement;
  private activeElement: HTMLInputElement | HTMLTextAreaElement | null = null;
  private activeElementId: number = 0;
  private cursorVisible: boolean = false;
  private cursorTimer: ReturnType<typeof setInterval> | null = null;
  private composing: boolean = false;
  private onRenderRequest: (() => void) | null = null;
  private abortController: AbortController;

  constructor() {
    this.abortController = new AbortController();

    // Create hidden textarea for capturing input
    this.textarea = document.createElement('textarea');
    this.textarea.style.position = 'fixed';
    this.textarea.style.left = '-9999px';
    this.textarea.style.top = '-9999px';
    this.textarea.style.opacity = '0';
    this.textarea.style.width = '1px';
    this.textarea.style.height = '1px';
    this.textarea.style.padding = '0';
    this.textarea.style.border = 'none';
    this.textarea.setAttribute('autocomplete', 'off');
    this.textarea.setAttribute('autocorrect', 'off');
    this.textarea.setAttribute('autocapitalize', 'off');
    this.textarea.setAttribute('spellcheck', 'false');
    document.body.appendChild(this.textarea);

    this.setupListeners();
  }

  /** Set a callback to request re-render */
  setRenderCallback(cb: () => void): void {
    this.onRenderRequest = cb;
  }

  /** Activate text input for a specific input/textarea element */
  activate(elementId: number, element: HTMLInputElement | HTMLTextAreaElement): void {
    this.activeElementId = elementId;
    this.activeElement = element;
    this.textarea.value = element.value || '';
    this.textarea.focus();
    this.startCursorBlink();
  }

  /** Deactivate text input */
  deactivate(): void {
    this.activeElementId = 0;
    this.activeElement = null;
    this.stopCursorBlink();
    this.textarea.blur();
  }

  /** Check if text input is active */
  isActive(): boolean {
    return this.activeElementId !== 0;
  }

  /** Get the currently active element ID */
  getActiveElementId(): number {
    return this.activeElementId;
  }

  /** Check if cursor should be visible (for blink animation) */
  isCursorVisible(): boolean {
    return this.cursorVisible && this.activeElementId !== 0;
  }

  /** Check if currently in IME composition */
  isComposing(): boolean {
    return this.composing;
  }

  /** Get current cursor position */
  getCursorPosition(): number {
    return this.textarea.selectionStart || 0;
  }

  /** Get current value */
  getValue(): string {
    return this.textarea.value;
  }

  private setupListeners(): void {
    const signal = this.abortController.signal;

    // Input event — character typed or deleted
    this.textarea.addEventListener('input', () => {
      if (this.composing) return;
      this.syncToElement();
      this.startCursorBlink(); // Reset blink — keep cursor solid while typing
    }, { signal });

    // IME composition events
    this.textarea.addEventListener('compositionstart', () => {
      this.composing = true;
    }, { signal });

    this.textarea.addEventListener('compositionupdate', () => {
      // Could show composition underline — for now just re-render
      this.requestRender();
    }, { signal });

    this.textarea.addEventListener('compositionend', () => {
      this.composing = false;
      this.syncToElement();
    }, { signal });

    // Key events for special handling
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.deactivate();
        this.requestRender();
      } else if (e.key === 'Tab') {
        // Let the EventManager handle Tab for focus navigation
        this.deactivate();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        // Number input: increment/decrement value
        if (this.activeElement &&
            this.activeElement.tagName === 'INPUT' &&
            (this.activeElement as HTMLInputElement).type === 'number') {
          e.preventDefault();
          const input = this.activeElement as HTMLInputElement;
          const step = parseFloat(input.step) || 1;
          const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
          const max = input.max !== '' ? parseFloat(input.max) : Infinity;
          let val = parseFloat(input.value) || 0;
          val += e.key === 'ArrowUp' ? step : -step;
          val = Math.max(min, Math.min(max, val));
          input.value = String(val);
          this.textarea.value = input.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          this.startCursorBlink();
          this.requestRender();
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                 e.key === 'Home' || e.key === 'End') {
        // Cursor moved — reset blink to keep cursor solid
        this.startCursorBlink();
        this.requestRender();
      }
    }, { signal });
  }

  /** Sync textarea value back to the active DOM element */
  private syncToElement(): void {
    if (!this.activeElement) return;
    this.activeElement.value = this.textarea.value;
    this.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    this.requestRender();
  }

  private startCursorBlink(): void {
    // Clear existing timer without touching visibility
    if (this.cursorTimer) {
      clearInterval(this.cursorTimer);
      this.cursorTimer = null;
    }
    // Keep cursor solid, then start blinking after delay
    this.cursorVisible = true;
    this.cursorTimer = setInterval(() => {
      this.cursorVisible = !this.cursorVisible;
      this.requestRender();
    }, 530);
  }

  private stopCursorBlink(): void {
    this.cursorVisible = false;
    if (this.cursorTimer) {
      clearInterval(this.cursorTimer);
      this.cursorTimer = null;
    }
  }

  private requestRender(): void {
    this.onRenderRequest?.();
  }

  /** Clean up */
  destroy(): void {
    this.stopCursorBlink();
    this.abortController.abort();
    if (this.textarea.parentNode) {
      this.textarea.parentNode.removeChild(this.textarea);
    }
  }
}
