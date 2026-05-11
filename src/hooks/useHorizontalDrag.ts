import { type PointerEvent as ReactPointerEvent, useRef, useState } from 'react';

export function useHorizontalDrag<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const state = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0
  });
  const [dragging, setDragging] = useState(false);

  const stop = (event: ReactPointerEvent<T>) => {
    const element = ref.current;
    if (element && state.current.pointerId === event.pointerId) {
      try {
        if (element.hasPointerCapture(event.pointerId)) {
          element.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    state.current.active = false;
    state.current.pointerId = -1;
    setDragging(false);
  };

  return {
    ref,
    dragging,
    dragProps: {
      onPointerDown: (event: ReactPointerEvent<T>) => {
        // Let touch + pen use the browser's native momentum scrolling on iOS / Android.
        // The JS drag is only needed for desktop mouse where overflow-x doesn't drag.
        if (event.pointerType !== 'mouse') return;
        if (event.button !== 0) return;
        const element = ref.current;
        if (!element) return;

        state.current = {
          active: true,
          moved: false,
          pointerId: event.pointerId,
          startX: event.clientX,
          scrollLeft: element.scrollLeft
        };
      },
      onPointerMove: (event: ReactPointerEvent<T>) => {
        const element = ref.current;
        if (!element || !state.current.active) return;

        const deltaX = event.clientX - state.current.startX;
        if (!state.current.moved && Math.abs(deltaX) > 6) {
          state.current.moved = true;
          try {
            element.setPointerCapture(state.current.pointerId);
            setDragging(true);
          } catch {
            // Some browsers throw if the pointer is no longer active.
          }
        }
        if (state.current.moved) {
          element.scrollLeft = state.current.scrollLeft - deltaX;
        }
      },
      onPointerUp: stop,
      onPointerCancel: stop,
      onClickCapture: (event: ReactPointerEvent<T>) => {
        if (!state.current.moved) return;
        event.preventDefault();
        event.stopPropagation();
        state.current.moved = false;
      }
    }
  };
}

