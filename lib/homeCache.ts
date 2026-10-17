// Cache for the Home page: results, per-card state (database id, saved flag, macro tweaks) and the controls.
//
// Two layers:
//  - a plain in-memory Map  -> fast, used while you click around the app
//  - a copy in sessionStorage -> lets it survive a page refresh
// sessionStorage belongs to ONE browser tab: closing the tab clears it, another tab can't see it.

import type { Split } from "./macros";

export type HomeMeal = {
  name?: string;
  cuisine?: string;
  items: {
    food: string;
    grams: number;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  }[];
  totals: { calories: number; protein: number; fat: number; carbs: number };
  imageUrl?: string | null;
};

// Per-card state that would otherwise be lost when the card unmounts.
//  - mealId: the meal's row in the database (exists once it's saved OR put on a board)
//  - saved: whether it's in Saved Meals (independent of boards)
// Remembering these is what stops a restored card from creating a duplicate row.
export type CardState = {
  mealId: string | null;
  saved: boolean;
  split: Split | null;
};

// One entry = one search (identified by its URL query string)
export type HomeEntry = {
  id: number;
  meals: HomeMeal[];
  cards: Record<number, CardState>;
  pending: Promise<void> | null; // set while the meals are still being generated (memory only)
  error: string;
  complete: boolean; // true once the search finished successfully
};

// The slider / pie / chips, so they're still where you left them
export type HomeControls = {
  calorieTarget: number;
  split: Split;
  cuisines: string[];
};

const STORAGE_KEY = "prep:home:v2"; // v2: cards now store { mealId, saved, split }
const MAX_ENTRIES = 10; // keep the last 10 searches, drop the oldest after that

const entries = new Map<string, HomeEntry>();
let lastKey: string | null = null;
let nextId = 1;
let controls: HomeControls | null = null;
let loaded = false;

// Copies whatever is in sessionStorage into memory. Runs once per page load, and must run
// AFTER the first render (in an effect), otherwise the restored data wouldn't match the
// server-rendered HTML and React would complain (hydration mismatch).
export function loadFromSession() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);

    for (const [key, e] of data.entries ?? []) {
      // a search that was cut off by the refresh can't be resumed -> drop it, it'll just re-run
      if (!e.complete) continue;
      if (entries.has(key)) continue;
      entries.set(key, { ...e, pending: null });
    }
    if (data.lastKey && entries.has(data.lastKey)) lastKey = data.lastKey;
    nextId = Math.max(nextId, data.nextId ?? 1);
    if (!controls && data.controls) controls = data.controls;
  } catch {
    // storage blocked / corrupted -> just start fresh
  }
}

// Writes the current cache to sessionStorage. Called after anything changes.
export function persist() {
  if (typeof window === "undefined") return;
  loadFromSession(); // never overwrite storage before we've read it
  try {
    const data = {
      entries: [...entries.entries()].map(([key, e]) => [
        key,
        {
          id: e.id,
          meals: e.meals,
          cards: e.cards,
          error: e.error,
          complete: e.complete,
        },
      ]),
      lastKey,
      nextId,
      controls,
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage full / blocked -> the in-memory copy still works
  }
}

export function createEntry(key: string): HomeEntry {
  loadFromSession();
  const entry: HomeEntry = {
    id: nextId++,
    meals: [],
    cards: {},
    pending: null,
    error: "",
    complete: false,
  };
  entries.delete(key);
  entries.set(key, entry);
  lastKey = key;
  if (entries.size > MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }
  persist();
  return entry;
}

export function getEntry(key: string) {
  return entries.get(key);
}
export function getLastKey() {
  return lastKey;
}
export function getControls() {
  return controls;
}
export function setControls(c: HomeControls) {
  controls = c;
  persist();
}
