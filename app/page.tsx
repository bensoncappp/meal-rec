"use client";

import { useState } from "react";

export default function Home() {
  const [calorieTarget, setCalorieTarget] = useState(600);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/generate-meal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calorieTarget,
        protein: 30,
        fat: 25,
        carbs: 45,
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Meal Prep Generator — Test</h1>

      <input
        type="number"
        value={calorieTarget}
        onChange={(e) => setCalorieTarget(Number(e.target.value))}
      />
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? "Generating..." : "Generate Meal"}
      </button>

      {result && (
        <pre style={{ marginTop: 20, background: "#f4f4f4", padding: 16 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
