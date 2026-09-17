"use client";

import { useState } from "react";
import styles from "./TopBar.module.css";

export default function TopBar() {
  // Placeholder state — swap for real session data once Google OAuth is wired up.
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className={styles.topbar}>
      <div />
      <div className={styles.authArea}>
        {isSignedIn ? (
          <div className={styles.profileWrap}>
            <button
              className={styles.avatar}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
            >
              B
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
