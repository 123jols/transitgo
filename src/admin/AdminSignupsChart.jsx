import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DAYS = 30;
const WIDTH = 640;
const HEIGHT = 180;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

function lastNDays(n) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// Real sign-ups per day over the trailing 30 days, from profiles.created_at —
// a single-series trend, so this earns the "line; area for a single series"
// form (dataviz skill) rather than any multi-color treatment.
export default function AdminSignupsChart() {
  const [counts, setCounts] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const svgRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const since = lastNDays(DAYS)[0];
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", since.toISOString())
      .then(({ data, error }) => {
        if (cancelled) return;
        const days = lastNDays(DAYS);
        const buckets = Object.fromEntries(days.map((d) => [dayKey(d), 0]));
        if (!error && data) {
          data.forEach((row) => {
            const key = (row.created_at || "").slice(0, 10);
            if (key in buckets) buckets[key] += 1;
          });
        }
        setCounts(days.map((d) => ({ date: d, count: buckets[dayKey(d)] })));
      });
    return () => { cancelled = true; };
  }, []);

  const geometry = useMemo(() => {
    if (!counts) return null;
    const max = Math.max(1, ...counts.map((c) => c.count));
    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const points = counts.map((c, i) => {
      const x = PAD_LEFT + (counts.length === 1 ? innerW / 2 : (i / (counts.length - 1)) * innerW);
      const y = PAD_TOP + innerH - (c.count / max) * innerH;
      return { ...c, x, y };
    });
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${PAD_TOP + innerH} L ${points[0].x.toFixed(1)} ${PAD_TOP + innerH} Z`;
    return { points, linePath, areaPath, max, innerH };
  }, [counts]);

  const handleMove = (e) => {
    if (!geometry || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    geometry.points.forEach((p, i) => {
      const d = Math.abs(p.x - relX);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIndex(nearest);
  };

  const total = counts ? counts.reduce((s, c) => s + c.count, 0) : null;
  const hovered = geometry && hoverIndex !== null ? geometry.points[hoverIndex] : null;

  return (
    <div className="admin-chart-card">
      <div className="admin-chart-header">
        <div>
          <p className="admin-chart-title">New sign-ups</p>
          <p className="admin-chart-subtitle">Last {DAYS} days{total !== null ? ` · ${total} total` : ""}</p>
        </div>
      </div>

      {!geometry ? (
        <div className="admin-chart-loading">Loading…</div>
      ) : (
        <div className="admin-chart-svg-wrap">
          <svg
            ref={svgRef}
            className="admin-chart-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Gridline: zero baseline only — recessive, hairline */}
            <line
              x1={PAD_LEFT} y1={PAD_TOP + geometry.innerH}
              x2={WIDTH - PAD_RIGHT} y2={PAD_TOP + geometry.innerH}
              className="admin-chart-axis"
            />

            <path d={geometry.areaPath} className="admin-chart-area" />
            <path d={geometry.linePath} className="admin-chart-line" />

            {hovered && (
              <>
                <line
                  x1={hovered.x} y1={PAD_TOP} x2={hovered.x} y2={PAD_TOP + geometry.innerH}
                  className="admin-chart-crosshair"
                />
                <circle cx={hovered.x} cy={hovered.y} r="4.5" className="admin-chart-dot" />
              </>
            )}
          </svg>

          {hovered && (
            <div
              className="admin-chart-tooltip"
              style={{
                left: `${(hovered.x / WIDTH) * 100}%`,
                top: `${(hovered.y / HEIGHT) * 100}%`,
              }}
            >
              <strong>{hovered.count}</strong>
              <span>{hovered.date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
