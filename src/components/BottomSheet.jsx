import { useEffect, useRef, useState } from "react";

const SNAP_OFFSETS = {
  collapsed: "calc(100% - 128px)",
  half: "42%",
  full: "0%",
};

const VELOCITY_THRESHOLD = 0.5; // px/ms

export default function BottomSheet({ children, snap, onSnapChange }) {
  const sheetRef = useRef(null);
  const dragState = useRef(null);
  const [dragging, setDragging] = useState(false);

  function snapTo(next) {
    onSnapChange(next);
  }

  function onPointerDown(e) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      startTop: sheet.getBoundingClientRect().top,
      sheetHeight: sheet.getBoundingClientRect().height,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    setDragging(true);
  }

  function onPointerMove(e) {
    const drag = dragState.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;

    const dy = e.clientY - drag.startY;
    const viewportTop = drag.startTop + dy;
    const minTop = window.innerHeight - drag.sheetHeight; // "full" state top
    const clampedTop = Math.max(minTop, viewportTop);
    const offsetPx = clampedTop - minTop;

    sheet.style.transform = `translateY(${offsetPx}px)`;

    const now = performance.now();
    const dt = now - drag.lastT;
    if (dt > 0) drag.velocity = (e.clientY - drag.lastY) / dt;
    drag.lastY = e.clientY;
    drag.lastT = now;
  }

  function onPointerUp(e) {
    const drag = dragState.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;

    e.currentTarget.releasePointerCapture(e.pointerId);
    sheet.style.transform = "";
    setDragging(false);

    const dy = e.clientY - drag.startY;
    const fastFlick = Math.abs(drag.velocity) > VELOCITY_THRESHOLD;

    if (fastFlick) {
      snapTo(drag.velocity > 0 ? (snap === "full" ? "half" : "collapsed") : (snap === "collapsed" ? "half" : "full"));
    } else if (Math.abs(dy) > 60) {
      if (dy > 0) snapTo(snap === "full" ? "half" : "collapsed");
      else snapTo(snap === "collapsed" ? "half" : "full");
    }

    dragState.current = null;
  }

  useEffect(() => {
    if (!dragging) return;
    document.body.style.overscrollBehavior = "none";
    return () => { document.body.style.overscrollBehavior = ""; };
  }, [dragging]);

  return (
    <div
      ref={sheetRef}
      className="bottom-sheet"
      style={{
        transform: `translateY(${SNAP_OFFSETS[snap]})`,
        transition: dragging ? "none" : "transform 320ms var(--ease-drawer)",
      }}
    >
      <div
        className="bottom-sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="bottom-sheet-grip" />
      </div>
      <div className="bottom-sheet-content">
        {children}
      </div>
    </div>
  );
}
