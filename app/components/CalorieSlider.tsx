"use client";

import {
  CALORIE_STEP,
  MAX_CALORIES,
  MIN_CALORIES,
} from "@/lib/macros";
import styles from "./CalorieSlider.module.css";

export default function CalorieSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  // How far along the track the thumb is — the CSS uses this to colour the filled part green.
  const fill = ((value - MIN_CALORIES) / (MAX_CALORIES - MIN_CALORIES)) * 100;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Calories per meal</span>
        <span>
          <span className={styles.value}>{value}</span>
          <span className={styles.unit}>kcal</span>
        </span>
      </div>

      <input
        type="range"
        className={styles.range}
        min={MIN_CALORIES}
        max={MAX_CALORIES}
        step={CALORIE_STEP}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--fill": `${fill}%` } as React.CSSProperties}
        aria-label="Calories per meal"
      />

      <div className={styles.scale}>
        <span>{MIN_CALORIES}</span>
        <span>{MAX_CALORIES}</span>
      </div>
    </div>
  );
}