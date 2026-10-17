import Link from "next/link";
import styles from "./SortBar.module.css";

// What the Saved Meals page can be sorted by.
export const SORTS = [
  { key: "calories", label: "Calories" },
  { key: "protein", label: "Protein" },
  { key: "fat", label: "Fat" },
  { key: "carbs", label: "Carbs" },
] as const;

export type SortKey = (typeof SORTS)[number]["key"];
export type SortDir = "asc" | "desc";

type Props = {
  basePath: string;
  q: string;
  sort: SortKey | null; // null = newest first
  dir: SortDir;
};

// Server component: every chip is just a link, so the sort lives in the URL
// (?sort=protein&dir=desc) and survives a refresh.
export default function SortBar({ basePath, q, sort, dir }: Props) {
  function href(nextSort: SortKey | null, nextDir: SortDir) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (nextSort) {
      params.set("sort", nextSort);
      params.set("dir", nextDir);
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  return (
    <div className={styles.bar}>
      <span className={styles.label}>Sort by</span>

      <Link
        href={href(null, "desc")}
        replace
        scroll={false}
        className={`${styles.chip} ${sort === null ? styles.active : ""}`}
      >
        Newest
      </Link>

      {SORTS.map((s) => {
        const isActive = sort === s.key;
        // Clicking the active chip flips the direction.
        // First click on a macro = highest first.
        const nextDir: SortDir = isActive && dir === "desc" ? "asc" : "desc";
        return (
          <Link
            key={s.key}
            href={href(s.key, nextDir)}
            replace
            scroll={false}
            className={`${styles.chip} ${isActive ? styles.active : ""}`}
          >
            {s.label}
            {isActive && (
              <span className={styles.arrow}>{dir === "desc" ? "↓" : "↑"}</span>
            )}
          </Link>
        );
      })}

      {(q || sort) && (
        <Link
          href={basePath}
          replace
          scroll={false}
          className={styles.clear}
        >
          Clear
        </Link>
      )}
    </div>
  );
}