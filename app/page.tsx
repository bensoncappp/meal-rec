"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import MealCard from "./components/MealCard";
import CalorieSlider from "./components/CalorieSlider";
import MacroPie from "./components/MacroPie";
import CuisineChips from "./components/CuisineChips";
import { canonicalCuisine } from "@/lib/cuisines";
import { supabase } from "@/lib/supabase";
import {
  createEntry,
  getControls,
  getEntry,
  getLastKey,
  loadFromSession,
  persist,
  setControls,
  type HomeEntry,
  type HomeMeal,
} from "@/lib/homeCache";
import {
  DEFAULT_CALORIES,
  DEFAULT_SPLIT,
  clampCalories,
  mergeSplit,
  type Split,
} from "@/lib/macros";
import styles from "./page.module.css";

// Preloads one image URL and resolves once it's loaded (or failed) — so each card only appears
// once its picture is ready, instead of popping in half-loaded.
function preloadImage(url: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function HomeInner() {
  // The search bar lives in the TopBar, which puts the query in the URL (?q=...).
  const searchParams = useSearchParams();
  const q = searchParams.get("q");
  const key = searchParams.toString();
  const lastKey = useRef<string | null>(null); // stops dev StrictMode running the search twice
  const controlsReady = useRef(false);

  // Coming back to Home by clicking around: the cache is already in memory, so we can start from it.
  // (After a full refresh the memory is empty at this point, which matches the server-rendered
  // page — the sessionStorage copy is loaded in the effect below instead.)
  const initialKey = q ? key : getLastKey();
  const initialEntry = initialKey ? getEntry(initialKey) : undefined;

  const [entry, setEntry] = useState<HomeEntry | undefined>(initialEntry);
  const [meals, setMeals] = useState<HomeMeal[]>(
    () => (initialEntry ? [...initialEntry.meals] : []),
  );
  const [loading, setLoading] = useState(!!initialEntry?.pending);
  const [error, setError] = useState(initialEntry?.error ?? "");
  const [rev, setRev] = useState(0); // bumped when cards are corrected, so they remount with the fixed state

  // The targets the user dials in with the slider + pie. These are the product defaults
  // (700 kcal per meal, 50% carbs / 30% protein / 20% fat) — they live in lib/macros.ts,
  // applied in code, not trusted to the AI, so they're consistent every time.
  const [calorieTarget, setCalorieTarget] = useState(
    () => getControls()?.calorieTarget ?? DEFAULT_CALORIES,
  );
  const [split, setSplit] = useState<Split>(
    () => getControls()?.split ?? DEFAULT_SPLIT,
  );
  const [cuisines, setCuisines] = useState<string[]>(
    () => getControls()?.cuisines ?? [],
  ); // lit-up chips. Empty = no preference = the AI varies the cuisines itself.
  const [resetCount, setResetCount] = useState(0); // bumping this remounts the pie (resets its rotation)

  // Remember the controls every time they change. The very first run is skipped: at that moment
  // the states still hold defaults, and we mustn't overwrite what's saved from before a refresh.
  useEffect(() => {
    if (!controlsReady.current) {
      controlsReady.current = true;
      return;
    }
    setControls({ calorieTarget, split, cuisines });
  }, [calorieTarget, split, cuisines]);

  useEffect(() => {
    if (lastKey.current === key) return;
    const firstRun = lastKey.current === null;
    lastKey.current = key;

    // First run after a (re)load: pull the sessionStorage copy into memory and restore the controls.
    if (firstRun) {
      loadFromSession();
      const c = getControls();
      if (c) {
        setCalorieTarget(c.calorieTarget);
        setSplit(c.split);
        setCuisines(c.cuisines);
      }
    }

    if (q) {
      const hit = getEntry(key);
      if (hit) show(hit); // same search as before (Back button, or a refresh) -> no new AI call
      else handleGenerate(q);
    } else {
      const last = getLastKey();
      const hit = last ? getEntry(last) : undefined;
      if (hit) show(hit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // The cache remembers "this card is saved / on a board". But you may have removed that meal on
  // another page since. So when cached results come back, check the database and fix any card
  // whose meal is gone or whose saved flag has changed — otherwise it would say "Saved" for
  // something that no longer exists.
  async function reconcile(hit: HomeEntry) {
    const cards = Object.values(hit.cards);
    const ids = cards.map((c) => c.mealId).filter(Boolean) as string[];
    if (ids.length === 0) return;

    const { data, error } = await supabase
      .from("meals")
      .select("id, is_saved")
      .in("id", ids);
    if (error || !data) return; // can't check right now -> leave the cards as they are

    const live = new Map<string, boolean>(data.map((m) => [m.id, m.is_saved]));
    let changed = false;
    for (const c of cards) {
      if (!c.mealId) continue;
      if (!live.has(c.mealId)) {
        c.mealId = null; // the meal was removed elsewhere
        c.saved = false;
        changed = true;
      } else if (live.get(c.mealId) !== c.saved) {
        c.saved = live.get(c.mealId)!;
        changed = true;
      }
    }
    if (changed) {
      persist();
      setRev((r) => r + 1);
    }
  }

  // Puts a cached search on screen. If it was still generating when we left, wait for it to finish.
  function show(hit: HomeEntry) {
    setEntry(hit);
    setMeals([...hit.meals]);
    setError(hit.error);
    if (hit.pending) {
      setLoading(true);
      hit.pending.finally(() => {
        setMeals([...hit.meals]);
        setError(hit.error);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    reconcile(hit);
  }

  function resetTargets() {
    setCalorieTarget(DEFAULT_CALORIES);
    setSplit(DEFAULT_SPLIT);
    setResetCount((c) => c + 1);
  }

  function handleGenerate(query: string) {
    // The latest controls live in the cache (after a refresh they're restored there a moment
    // before React re-renders), so read them from there, falling back to the current state.
    const base = getControls() ?? { calorieTarget, split, cuisines };

    // This search gets its own cache entry. Results are written into the entry as they arrive,
    // so even if you navigate away mid-generation they still land in the cache.
    const current = createEntry(key);
    setEntry(current);
    setMeals([]);
    setError("");
    setLoading(true);

    const run = (async () => {
      try {
        // Step 1 — understand what the user typed
        const parseRes = await fetch("/api/parse-query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const parsed = await parseRes.json();
        if (!parseRes.ok)
          throw new Error(parsed.error ?? "Couldn't read that search");

        // Step 2 — "typed words win": anything the user actually typed overrides the sliders/chips,
        // and the controls then jump to match. Anything they didn't type keeps its current value.
        const calories =
          typeof parsed.calorieTarget === "number"
            ? clampCalories(parsed.calorieTarget)
            : base.calorieTarget;
        const mergedSplit = mergeSplit(base.split, {
          carbs: parsed.carbPercent,
          protein: parsed.proteinPercent,
          fat: parsed.fatPercent,
        });
        const typedCuisines: string[] = Array.isArray(parsed.cuisinePreferences)
          ? parsed.cuisinePreferences
              .filter((c: unknown) => typeof c === "string" && c.trim())
              .map(canonicalCuisine)
          : [];
        const cuisinesToUse =
          typedCuisines.length > 0 ? typedCuisines : base.cuisines;

        setCalorieTarget(calories);
        setSplit(mergedSplit);
        setCuisines(cuisinesToUse);
        // also straight into the cache, in case this page was left while the search ran
        setControls({
          calorieTarget: calories,
          split: mergedSplit,
          cuisines: cuisinesToUse,
        });

        const resolved = {
          calorieTarget: calories,
          protein: mergedSplit.protein,
          fat: mergedSplit.fat,
          carbs: mergedSplit.carbs,
          cuisinePreferences: cuisinesToUse,
          // what the user actually asked to see (e.g. "prawn") + other preferences (e.g. "spicy").
          mustInclude: parsed.mustInclude ?? [],
          notes: parsed.notes ?? null,
        };

        // Step 3 — generate
        const res = await fetch("/api/generate-meal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resolved),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Generation failed");

        for (const meal of data.meals ?? []) {
          if (meal.imageUrl) await preloadImage(meal.imageUrl);
          current.meals.push(meal);
          setMeals([...current.meals]);
          persist();
        }
        current.complete = true; // only a fully finished search is restored after a refresh
      } catch (err: any) {
        current.error = err.message ?? "Something went wrong. Try again.";
        setError(current.error);
      } finally {
        current.pending = null;
        setLoading(false);
        persist();
      }
    })();

    current.pending = run;
  }

  // Nothing to show yet: no results, not loading, no error -> show the "results go here" placeholder
  const showEmpty = !loading && !error && meals.length === 0;

  return (
    <div className={styles.layout}>
      <div className={styles.results}>
        <CuisineChips selected={cuisines} onChange={setCuisines} />

        {showEmpty && (
          <div className={styles.empty}>
            <span className={styles.emptyEmoji}>🍽️</span>
            <p className={styles.emptyText}>Your results will be displayed here</p>
          </div>
        )}

        {loading && meals.length === 0 && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Generating meals</p>
          </div>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.scrollArea}>
          {meals.map((meal, i) => (
            <MealCard
              key={`${entry?.id}-${i}-${rev}`}
              meal={meal}
              initial={entry?.cards[i]}
              onStateChange={(s) => {
                if (entry) {
                  entry.cards[i] = s;
                  persist(); // so saved / on-board state + macro tweaks survive a refresh
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* targets panel sits on the right-hand side */}
      <aside className={styles.panel}>
        <h2 className={styles.panelTitle}>Your targets</h2>

        <CalorieSlider value={calorieTarget} onChange={setCalorieTarget} />

        <MacroPie
          key={resetCount}
          value={split}
          onChange={setSplit}
          calories={calorieTarget}
        />

        <div className={styles.panelFooter}>
          <button className={styles.resetButton} onClick={resetTargets}>
            Reset
          </button>
          <span className={styles.hint}>Applies to your next search</span>
        </div>
      </aside>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}