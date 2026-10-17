import {
  DEFAULT_SPLIT,
  KEYS,
  MACRO_META,
  enforceMin,
  toWholePercents,
  type Macro,
  type Split,
} from "./macros";
import { sumMacros } from "./totals";

export type Item = {
  food: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

// An ingredient can be scaled between 0.25x and 3x of what the AI gave. Beyond that a "meal"
// stops being believable (e.g. 600g of oil), so we stop and tell the user it's the closest possible.
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;

// Calories each macro contributes in one ingredient (protein/carbs = 4 per gram, fat = 9 per gram).
function macroKcal(i: Item): Record<Macro, number> {
  return {
    carbs: Number(i.carbs ?? 0) * MACRO_META.carbs.kcalPerGram,
    protein: Number(i.protein ?? 0) * MACRO_META.protein.kcalPerGram,
    fat: Number(i.fat ?? 0) * MACRO_META.fat.kcalPerGram,
  };
}

// The meal's real split as whole percents (share of calories), summing to exactly 100.
function rawSplit(items: Item[]): Split {
  const t: Split = { carbs: 0, protein: 0, fat: 0 };
  items.forEach((i) => {
    const k = macroKcal(i);
    KEYS.forEach((m) => (t[m] += k[m]));
  });
  if (t.carbs + t.protein + t.fat <= 0) return DEFAULT_SPLIT;
  return toWholePercents(t);
}

// What the pie should show for a meal nobody has touched yet.
export function splitOfItems(items: Item[]): Split {
  return enforceMin(rawSplit(items));
}

// Re-portions the ingredients so the meal's calorie split moves toward `target`,
// keeping the TOTAL calories about the same (the "share of calories, kcal fixed" model).
//
// How: repeatedly nudge every ingredient toward whichever macros are under/over target, weighted by
// how much of that ingredient's calories come from each macro. Chicken (mostly protein) mainly
// reacts to the protein target, rice (mostly carbs) to the carb target, oil to the fat target,
// and mixed foods like salmon get a blend. Repeats until the three shares line up (or it gives up).
export function rebalance(items: Item[], target: Split) {
  const base = items.map(macroKcal);
  const total = base.reduce((s, b) => s + b.carbs + b.protein + b.fat, 0);
  if (total <= 0) {
    return { items, totals: sumMacros(items), limited: false };
  }

  const goal: Record<Macro, number> = {
    carbs: (total * target.carbs) / 100,
    protein: (total * target.protein) / 100,
    fat: (total * target.fat) / 100,
  };

  // each ingredient's share of its own calories per macro
  const weight = base.map((b) => {
    const sum = b.carbs + b.protein + b.fat;
    return {
      carbs: sum ? b.carbs / sum : 0,
      protein: sum ? b.protein / sum : 0,
      fat: sum ? b.fat / sum : 0,
    };
  });

  let scale = items.map(() => 1);
  for (let iter = 0; iter < 200; iter++) {
    const now: Record<Macro, number> = { carbs: 0, protein: 0, fat: 0 };
    scale.forEach((s, i) => KEYS.forEach((m) => (now[m] += s * base[i][m])));

    const worstGap = Math.max(...KEYS.map((m) => Math.abs(now[m] - goal[m]))) / total;
    if (worstGap < 0.002) break;

    const ratio: Record<Macro, number> = { carbs: 1, protein: 1, fat: 1 };
    KEYS.forEach((m) => {
      if (now[m] > 0) ratio[m] = goal[m] / now[m];
    });

    scale = scale.map((s, i) => {
      let f = 1;
      KEYS.forEach((m) => (f *= Math.pow(ratio[m], weight[i][m])));
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * f));
    });
  }

  // Apply the scale to grams, and scale each ingredient's macros by the same amount.
  const next: Item[] = items.map((it, i) => {
    if (!it.grams || it.grams <= 0) return it;
    const grams = Math.max(1, Math.round(it.grams * scale[i]));
    const f = grams / it.grams;
    const r1 = (n: number) => Math.round(Number(n ?? 0) * f * 10) / 10;
    return {
      ...it,
      grams,
      calories: Math.round(Number(it.calories ?? 0) * f),
      protein: r1(it.protein),
      fat: r1(it.fat),
      carbs: r1(it.carbs),
    };
  });

  // "limited" = even at the scale caps, the meal can't reach the target (e.g. a meal with no carb food).
  const actual = rawSplit(next);
  const limited = KEYS.some((m) => Math.abs(actual[m] - target[m]) > 2);

  return { items: next, totals: sumMacros(next), limited };
}