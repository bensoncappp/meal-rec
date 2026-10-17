// The cuisine chips shown on Home. Add/remove names here and the chip row updates itself.
export const CUISINES = [
  "Western",
  "Japanese",
  "Korean",
  "Chinese",
  "Indian",
  "Thai",
  "Malaysian",
  "Mexican",
  "Mediterranean",
];

// Makes typed cuisines match the chip names ("japanese" -> "Japanese").
// A cuisine with no chip (e.g. "vietnamese") just gets title-cased and still works.
export function canonicalCuisine(name: string) {
  const t = name.trim();
  const hit = CUISINES.find((c) => c.toLowerCase() === t.toLowerCase());
  return hit ?? t.replace(/\b\w/g, (ch) => ch.toUpperCase());
}