"use client";

import { useRef, useState } from "react";
import {
  KEYS,
  MACRO_META,
  MIN_PERCENT,
  type Split,
} from "@/lib/macros";
import styles from "./MacroPie.module.css";

// Drawing constants (SVG units; the SVG scales to fit its container)
const SIZE = 240;
const C = SIZE / 2;
const R = 84; // radius of the ring's centre line
const RING = 36; // ring thickness
const GAP = 0.004; // tiny gap between slices, in turns

// A point on the ring. `t` is a position in "turns": 0 = top, 0.25 = right, 0.5 = bottom (clockwise).
function point(t: number, r: number) {
  const a = t * 2 * Math.PI;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}
function arcPath(t0: number, t1: number) {
  const s = point(t0, R);
  const e = point(t1, R);
  const large = t1 - t0 > 0.5 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`;
}
const mod1 = (x: number) => ((x % 1) + 1) % 1;
const wrap = (x: number) => x - Math.round(x); // shortest signed distance on a circle, -0.5..0.5

export default function MacroPie({
  value,
  onChange,
  calories,
  disabled = false,

}: {
  value: Split;
  onChange: (next: Split) => void;
  calories: number; // shown in the middle + used for the gram estimates
  disabled?: boolean; // read-only: handles are hidden
}) {
  // `rot` is where the first slice starts. It only exists so dragging the boundary at the start of a
  // slice can visibly rotate the whole pie — the percentages themselves live in `value`.
  const [rot, setRot] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    i: number;
    last: number;
    accum: number;
    base: Split;
    baseRot: number;
  } | null>(null);

  // Where each slice starts, going clockwise from `rot`
  const starts: number[] = [];
  let acc = rot;
  KEYS.forEach((k) => {
    starts.push(acc);
    acc += value[k] / 100;
  });

  // Boundary i sits at the START of slice i, so it separates slice (i-1) from slice i.
  // Moving it grows one neighbour and shrinks the other by the same amount; the third slice is untouched.
  function applyShift(i: number, base: Split, baseRot: number, dPct: number) {
    const before = KEYS[(i + 2) % 3];
    const after = KEYS[i];
    const d = Math.min(
      base[after] - MIN_PERCENT,
      Math.max(MIN_PERCENT - base[before], dPct),
    );
    onChange({ ...base, [before]: base[before] + d, [after]: base[after] - d });
    if (i === 0) setRot(mod1(baseRot + d / 100));
  }

  // Pointer angle around the pie's centre, in turns clockwise from the top.
  function angleOf(e: React.PointerEvent) {
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    return mod1(Math.atan2(dx, -dy) / (2 * Math.PI));
  }

  function onDown(i: number, e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { i, last: angleOf(e), accum: 0, base: value, baseRot: rot };
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const a = angleOf(e);
    // add up small movements so a long drag never "jumps" when the angle wraps past the top
    d.accum += wrap(a - d.last);
    d.last = a;
    const before = KEYS[(d.i + 2) % 3];
    const after = KEYS[d.i];
    const lo = (MIN_PERCENT - d.base[before]) / 100;
    const hi = (d.base[after] - MIN_PERCENT) / 100;
    d.accum = Math.min(hi, Math.max(lo, d.accum));
    applyShift(d.i, d.base, d.baseRot, Math.round(d.accum * 100));
  }
  function onUp() {
    drag.current = null;
  }

  // Keyboard: focus a handle, then arrow keys nudge it 1%.
  function onKey(i: number, e: React.KeyboardEvent) {
    let step = 0;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") step = 1;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") step = -1;
    if (!step) return;
    e.preventDefault();
    applyShift(i, value, rot, step);
  }

  const gramsFor = (k: (typeof KEYS)[number]) =>
    Math.round((calories * value[k]) / 100 / MACRO_META[k].kcalPerGram);

  return (
    <div className={styles.wrap}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={styles.svg}
        role="group"
        aria-label="Macro split"
      >
        {/* the three coloured slices */}
        {KEYS.map((k, i) => (
          <path
            key={k}
            d={arcPath(starts[i] + GAP, starts[i] + value[k] / 100 - GAP)}
            fill="none"
            stroke={MACRO_META[k].color}
            strokeWidth={RING}
          />
        ))}

        {/* percent label in the middle of each slice */}
        {KEYS.map((k, i) => {
          const p = point(starts[i] + value[k] / 200, R);
          return (
            <text
              key={k}
              x={p.x}
              y={p.y}
              className={styles.sliceLabel}
              fill={MACRO_META[k].textColor}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {value[k]}%
            </text>
          );
        })}

        {/* calories in the centre */}
        <text x={C} y={C - 6} className={styles.centerValue} textAnchor="middle">
          {calories}
        </text>
        <text x={C} y={C + 18} className={styles.centerUnit} textAnchor="middle">
          kcal
        </text>

        {/* three drag handles, one on each boundary */}
        {KEYS.map((_, i) => {
          if (disabled) return null;
          const p = point(starts[i], R);
          const before = KEYS[(i + 2) % 3];
          const after = KEYS[i];
          return (
            <g
              key={i}
              className={styles.handle}
              tabIndex={0}
              role="slider"
              aria-label={`Move share between ${MACRO_META[before].label} and ${MACRO_META[after].label}`}
              aria-valuemin={MIN_PERCENT}
              aria-valuemax={100 - 2 * MIN_PERCENT}
              aria-valuenow={value[after]}
              onPointerDown={(e) => onDown(i, e)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onKeyDown={(e) => onKey(i, e)}
            >
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                className={styles.handleDot}
              />
            </g>
          );
        })}
      </svg>

      <ul className={styles.legend}>
        {KEYS.map((k) => (
          <li key={k} className={styles.legendRow}>
            <span
              className={styles.dot}
              style={{ background: MACRO_META[k].color }}
            />
            <span className={styles.name}>{MACRO_META[k].label}</span>
            <span className={styles.pct}>{value[k]}%</span>
            <span className={styles.grams}>≈ {gramsFor(k)}g</span>
          </li>
        ))}
      </ul>
    </div>
  );
}