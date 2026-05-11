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
        element.releasePointerCapture(event.pointerId);
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
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const element = ref.current;
        if (!element) return;

        state.current = {
          active: true,
          moved: false,
          pointerId: event.pointerId,
          startX: event.clientX,
          scrollLeft: element.scrollLeft
        };
        element.setPointerCapture(event.pointerId);
        setDragging(true);
      },
      onPointerMove: (event: ReactPointerEvent<T>) => {
        const element = ref.current;
        if (!element || !state.current.active) return;

        const deltaX = event.clientX - state.current.startX;
        if (Math.abs(deltaX) > 4) state.current.moved = true;
        element.scrollLeft = state.current.scrollLeft - deltaX;
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

