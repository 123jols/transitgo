import { useRef, useState } from "react";

const REVEAL_WIDTH = 76; // px width of the delete button revealed on swipe
const OPEN_THRESHOLD = 40; // px dragged left before it snaps open on release
const FLICK_VELOCITY = 0.5; // px/ms

export default function SwipeToDelete({ children, onDelete, deleteLabel = "Delete" }) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragState = useRef(null);

  function onPointerDown(e) {
    dragState.current = {
      startX: e.clientX,
      startOffset: open ? -REVEAL_WIDTH : 0,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    const drag = dragState.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const next = Math.min(0, Math.max(-REVEAL_WIDTH - 24, drag.startOffset + dx));
    setDragX(next);

    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientX - drag.lastX) / dt;
    drag.lastX = e.clientX;
    drag.lastT = now;
  }

  function onPointerUp(e) {
    const drag = dragState.current;
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);

    const fastLeftFlick = drag.velocity < -FLICK_VELOCITY;
    const fastRightFlick = drag.velocity > FLICK_VELOCITY;
    const shouldOpen = fastLeftFlick ? true : fastRightFlick ? false : dragX < -OPEN_THRESHOLD;

    setOpen(shouldOpen);
    setDragX(shouldOpen ? -REVEAL_WIDTH : 0);
    dragState.current = null;
  }

  function handleDeleteClick() {
    setOpen(false);
    setDragX(0);
    onDelete();
  }

  return (
    <div className="swipe-row">
      <div className="swipe-row-actions" style={{ width: REVEAL_WIDTH }}>
        <button
          type="button"
          className="swipe-delete-button"
          style={{ width: REVEAL_WIDTH }}
          onClick={handleDeleteClick}
        >
          <i className="ti ti-trash"></i>
          <span>{deleteLabel}</span>
        </button>
      </div>
      <div
        className="swipe-row-content"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 200ms var(--ease-out)",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  );
}
