"use client";

import { useState } from "react";
import AddToBoardModal from "./AddToBoardModal";
import styles from "./Boards.module.css";

export default function AddToBoardButton({
  mealId,
  boards,
  memberOf,
}: {
  mealId: string;
  boards: { id: string; name: string }[];
  memberOf: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={styles.addButton} onClick={() => setOpen(true)}>
        Add to board
      </button>
      {open && (
        <AddToBoardModal
          mealId={mealId}
          boards={boards}
          memberOf={memberOf}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}