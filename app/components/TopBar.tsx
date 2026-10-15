"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./TopBar.module.css";

// Placeholder text per page, matching the design.
const PLACEHOLDERS: Record<string, string> = {
  "/": "Type in your cravings",
  "/saved-meals": "Search your saved meals",
  "/boards": "Search your boards",
};

export default function TopBar() {
  // Placeholder state — swap for real session data once Google OAuth is wired up.
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [text, setText] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim();
    // Only the Home page searches for now. Saved meals / boards search comes later.
    if (pathname !== "/" || !q) return;
    // `t` makes the URL unique so searching the same words again regenerates.
    router.push(`/?q=${encodeURIComponent(q)}&t=${Date.now()}`);
  }

  return (
    <header className={styles.topbar}>
      <form className={styles.search} onSubmit={handleSearch}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDERS[pathname] ?? "Search"}
          className={styles.searchInput}
        />
      </form>

      <div className={styles.authArea}>
        {isSignedIn ? (
          <div className={styles.profileWrap}>
            <button
              className={styles.profileButton}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
            >
              <span className={styles.avatar}>B</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => {
                    setIsSignedIn(false);
                    setMenuOpen(false);
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className={styles.signInButton}
            onClick={() => setIsSignedIn(true)}
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}