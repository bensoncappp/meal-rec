export type Macros = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
};

// A board's totals are never stored — they're summed from its meals every time they're read,
// so they can't go stale if a meal changes or gets removed from the board.
export function sumMacros(meals: Macros[]): Macros {
  return meals.reduce(
    (total, m) => ({
      calories: total.calories + Number(m.calories ?? 0),
      protein: total.protein + Number(m.protein ?? 0),
      fat: total.fat + Number(m.fat ?? 0),
      carbs: total.carbs + Number(m.carbs ?? 0),
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 },
  );
}