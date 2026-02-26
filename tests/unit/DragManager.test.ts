import { describe, it, expect } from 'vitest';
import { DragManager } from '../../src/events/DragManager.js';

describe('DragManager', () => {
  it('tracks drag state through start/move/end lifecycle', () => {
    const dm = new DragManager();

    expect(dm.isActive()).toBe(false);

    dm.start('range', 42, 10, 5);
    expect(dm.isActive()).toBe(true);
    expect(dm.getState()?.elementId).toBe(42);
    expect(dm.getState()?.startCol).toBe(10);

    dm.move(15, 5);
    expect(dm.getState()?.currentCol).toBe(15);
    expect(dm.getDelta()).toEqual({ dCol: 5, dRow: 0 });

    const final = dm.end();
    expect(final?.currentCol).toBe(15);
    expect(final?.active).toBe(false);
    expect(dm.isActive()).toBe(false);
    expect(dm.getState()).toBeNull();
  });

  it('cancel clears state without callback', () => {
    const dm = new DragManager();
    dm.start('scrollbar', 1, 0, 0);
    dm.cancel();
    expect(dm.isActive()).toBe(false);
    expect(dm.getState()).toBeNull();
  });

  it('ignores move when not active', () => {
    const dm = new DragManager();
    dm.move(5, 5); // Should not throw
    expect(dm.getDelta()).toEqual({ dCol: 0, dRow: 0 });
  });

  it('fires callbacks on move and end', () => {
    const dm = new DragManager();
    let updateCount = 0;
    let endState: any = null;

    dm.setCallbacks(
      () => { updateCount++; },
      (state) => { endState = state; },
    );

    dm.start('selection', 1, 0, 0);
    dm.move(5, 5);
    dm.move(10, 10);
    expect(updateCount).toBe(2);

    dm.end();
    expect(endState?.currentCol).toBe(10);
  });

  it('stores custom data in drag state', () => {
    const dm = new DragManager();
    dm.start('dialog', 1, 0, 0, { dialogId: 'modal-1' });
    expect(dm.getState()?.data?.dialogId).toBe('modal-1');
  });
});
