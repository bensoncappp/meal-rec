// Shared numbers + split math for the calorie slider and the macro pie.
// Pure functions only (no React), so the per-meal pie in Step B can reuse all of it.

export type Macro = "carbs" | "protein" | "fat";
export type Split = Record<Macro, number>; // whole percents, always sum to 100

// Order matters: the pie draws slices clockwise in this order.
export const KEYS: Macro[] = ["carbs", "protein", "fat"];

export const MACRO_META: Record<
  Macro,
  { label: string; color: string; textColor: string; kcalPerGram: number }
> = {
  carbs: { label: "Carbs", color: "#e8c75a", textColor: "#1f2a24", kcalPerGram: 4 },
  protein: { label: "Protein", color: "#2d4a3a", textColor: "#ffffff", kcalPerGram: 4 },
  fat: { label: "Fat", color: "#f4a261", textColor: "#1f2a24", kcalPerGram: 9 },
};

export const MIN_CALORIES = 300;
export const MAX_CALORIES = 3000;
export const CALORIE_STEP = 10;
export const DEFAULT_CALORIES = 700; // per meal

export const DEFAULT_SPLIT: Split = { carbs: 50, protein: 30, fat: 20 };
export const MIN_PERCENT = 5; // no slice can shrink below this

export function clampCalories(n: number) {
  const snapped = Math.round(n / CALORIE_STEP) * CALORIE_STEP;
  return Math.min(MAX_CALORIES, Math.max(MIN_CALORIES, snapped));
}

// Turns any three positive numbers into whole percents that add up to EXACTLY 100
// (largest-remainder method, so rounding never leaves you at 99 or 101).
export function toWholePercents(raw: Split): Split {
  const total = KEYS.reduce((s, k) => s + raw[k], 0) || 1;
  const parts = KEYS.map((k) => {
    const v = (raw[k] / total) * 100;
    return { k, base: Math.floor(v), rem: v - Math.floor(v) };
  });
  let left = 100 - parts.reduce((s, p) => s + p.base, 0);
  parts.sort((a, b) => b.rem - a.rem);
  for (const p of parts) {
    if (left <= 0) break;
    p.base += 1;
    left -= 1;
  }
  const out: Split = { carbs: 0, protein: 0, fat: 0 };
  parts.forEach((p) => (out[p.k] = p.base));
  return out;
}

// If any slice ended up under the minimum, lift it and take the difference from the biggest slice.
export function enforceMin(s: Split): Split {
  const out = { ...s };
  for (const k of KEYS) {
    if (out[k] < MIN_PERCENT) {
      const need = MIN_PERCENT - out[k];
      out[k] = MIN_PERCENT;
      const biggest = KEYS.filter((x) => x !== k).sort((a, b) => out[b] - out[a])[0];
      out[biggest] -= need;
    }
  }
  return out;
}

// "Typed words win": values the user typed override the sliders; anything they didn't type keeps
// the slider's current share. e.g. typed protein 40 -> protein = 40, carbs/fat split the other 60
// in the same proportion they had before.
export function mergeSplit(
  current: Split,
  typed: Partial<Record<Macro, number | null | undefined>>,
): Split {
  const given = KEYS.filter((k) => typeof typed[k] === "number" && (typed[k] as number) > 0);
  if (given.length === 0) return current;

  const raw: Split = { ...current };
  if (given.length === 3) {
    KEYS.forEach((k) => (raw[k] = typed[k] as number));
    return enforceMin(toWholePercents(raw));
  }

  const givenSum = given.reduce((s, k) => s + (typed[k] as number), 0);
  const others = KEYS.filter((k) => !given.includes(k));
  const remaining = Math.max(100 - givenSum, MIN_PERCENT * others.length);
  const othersSum = others.reduce((s, k) => s + current[k], 0) || 1;

  given.forEach((k) => (raw[k] = typed[k] as number));
  others.forEach((k) => (raw[k] = (remaining * current[k]) / othersSum));
  return enforceMin(toWholePercents(raw));
}