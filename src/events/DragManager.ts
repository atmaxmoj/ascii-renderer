/**
 * Unified drag state machine for:
 * - Range input thumb
 * - Textarea resize handle
 * - Scrollbar thumb
 * - Text selection
 * - Dialog move
 */

export type DragType = 'range' | 'resize' | 'scrollbar' | 'selection' | 'dialog';

export interface DragState {
  type: DragType;
  elementId: number;
  startCol: number;
  startRow: number;
  currentCol: number;
  currentRow: number;
  active: boolean;
  data?: Record<string, unknown>;
}

export class DragManager {
  private state: DragState | null = null;
  private onDragUpdate: ((state: DragState) => void) | null = null;
  private onDragEnd: ((state: DragState) => void) | null = null;

  /** Start a drag operation */
  start(
    type: DragType,
    elementId: number,
    col: number,
    row: number,
    data?: Record<string, unknown>,
  ): void {
    this.state = {
      type,
      elementId,
      startCol: col,
      startRow: row,
      currentCol: col,
      currentRow: row,
      active: true,
      data,
    };
  }

  /** Update drag position */
  move(col: number, row: number): void {
    if (!this.state?.active) return;
    this.state.currentCol = col;
    this.state.currentRow = row;
    this.onDragUpdate?.(this.state);
  }

  /** End the drag operation */
  end(): DragState | null {
    if (!this.state) return null;
    const finalState = { ...this.state, active: false };
    this.state = null;
    this.onDragEnd?.(finalState);
    return finalState;
  }

  /** Cancel the drag */
  cancel(): void {
    this.state = null;
  }

  /** Get current drag state */
  getState(): DragState | null {
    return this.state;
  }

  /** Check if a drag is active */
  isActive(): boolean {
    return this.state?.active ?? false;
  }

  /** Get delta from start */
  getDelta(): { dCol: number; dRow: number } {
    if (!this.state) return { dCol: 0, dRow: 0 };
    return {
      dCol: this.state.currentCol - this.state.startCol,
      dRow: this.state.currentRow - this.state.startRow,
    };
  }

  /** Set callbacks */
  setCallbacks(
    onUpdate: ((state: DragState) => void) | null,
    onEnd: ((state: DragState) => void) | null,
  ): void {
    this.onDragUpdate = onUpdate;
    this.onDragEnd = onEnd;
  }
}
