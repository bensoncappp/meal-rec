"use client";

import { CUISINES } from "@/lib/cuisines";
import styles from "./CuisineChips.module.css";

export default function CuisineChips({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  // A typed cuisine with no preset chip (e.g. "Vietnamese") still shows up, lit, so it can be turned off.
  const options = [...CUISINES, ...selected.filter((c) => !CUISINES.includes(c))];

  function toggle(c: string) {
    onChange(selected.includes(c) ? selected.filter((x) => x !== c) : [...selected, c]);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.label}>Cuisine</span>
        {selected.length > 0 ? (
          <button className={styles.clear} onClick={() => onChange([])}>
            Clear
          </button>
        ) : (
          <span className={styles.hint}>Pick any, or none for variety</span>
        )}
      </div>

      <div className={styles.chips}>
        {options.map((c) => {
          const on = selected.includes(c);
          return (
            <button
              key={c}
              type="button"
              className={`${styles.chip} ${on ? styles.on : ""}`}
              aria-pressed={on}
              onClick={() => toggle(c)}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}