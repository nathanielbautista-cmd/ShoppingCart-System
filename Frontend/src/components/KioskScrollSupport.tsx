import { useEffect } from 'react';

type ScrollAxis = 'x' | 'y' | 'both';

type DragState = {
  pointerId: number;
  scroller: HTMLElement;
  axis: ScrollAxis;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  dragging: boolean;
};

const DRAG_THRESHOLD_PX = 7;

function getScrollAxis(element: HTMLElement): ScrollAxis | null {
  const style = window.getComputedStyle(element);
  const canScrollY = /(auto|scroll)/.test(style.overflowY)
    && element.scrollHeight > element.clientHeight + 1;
  const canScrollX = /(auto|scroll)/.test(style.overflowX)
    && element.scrollWidth > element.clientWidth + 1;

  if (canScrollX && canScrollY) return 'both';
  if (canScrollX) return 'x';
  if (canScrollY) return 'y';
  return null;
}

function findScroller(start: EventTarget | null): { element: HTMLElement; axis: ScrollAxis } | null {
  let element = start instanceof HTMLElement ? start : null;

  while (element) {
    const axis = getScrollAxis(element);
    if (axis) return { element, axis };
    if (element.classList.contains('app-shell')) break;
    element = element.parentElement;
  }

  return null;
}

/**
 * Some Raspberry Pi touch controllers expose a finger as a mouse pointer.
 * Chromium therefore sends a drag instead of native touch scrolling. This
 * bridge only handles those mouse-like drags; real touch pointers keep the
 * browser's momentum scrolling.
 */
export function KioskScrollSupport() {
  useEffect(() => {
    let drag: DragState | null = null;
    let suppressClickUntil = 0;
    let draggedScroller: HTMLElement | null = null;

    const finishDrag = (event?: PointerEvent) => {
      if (!drag) return;
      if (drag.dragging) {
        suppressClickUntil = Date.now() + 450;
        draggedScroller = drag.scroller;
        event?.preventDefault();
      }
      if (drag.scroller.hasPointerCapture?.(drag.pointerId)) {
        drag.scroller.releasePointerCapture(drag.pointerId);
      }
      document.documentElement.classList.remove('kiosk-drag-scrolling');
      drag = null;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || event.pointerType !== 'mouse') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], .kiosk-keyboard')) return;

      const result = findScroller(target);
      if (!result) return;
      drag = {
        pointerId: event.pointerId,
        scroller: result.element,
        axis: result.axis,
        lastX: event.clientX,
        lastY: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const totalX = event.clientX - drag.startX;
      const totalY = event.clientY - drag.startY;

      if (!drag.dragging && Math.hypot(totalX, totalY) < DRAG_THRESHOLD_PX) return;
      if (!drag.dragging) {
        drag.dragging = true;
        drag.scroller.setPointerCapture?.(drag.pointerId);
        document.documentElement.classList.add('kiosk-drag-scrolling');
      }

      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      if (drag.axis !== 'y') drag.scroller.scrollLeft -= deltaX;
      if (drag.axis !== 'x') drag.scroller.scrollTop -= deltaY;
      event.preventDefault();
    };

    const onClick = (event: MouseEvent) => {
      if (Date.now() > suppressClickUntil || !draggedScroller) return;
      if (event.target instanceof Node && draggedScroller.contains(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      suppressClickUntil = 0;
      draggedScroller = null;
    };

    document.addEventListener('pointerdown', onPointerDown, { capture: true });
    document.addEventListener('pointermove', onPointerMove, { capture: true, passive: false });
    document.addEventListener('pointerup', finishDrag, { capture: true });
    document.addEventListener('pointercancel', finishDrag, { capture: true });
    document.addEventListener('click', onClick, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', onPointerDown, { capture: true });
      document.removeEventListener('pointermove', onPointerMove, { capture: true });
      document.removeEventListener('pointerup', finishDrag, { capture: true });
      document.removeEventListener('pointercancel', finishDrag, { capture: true });
      document.removeEventListener('click', onClick, { capture: true });
      document.documentElement.classList.remove('kiosk-drag-scrolling');
    };
  }, []);

  return null;
}
