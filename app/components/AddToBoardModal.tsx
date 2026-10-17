"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TEMP_USER_ID } from "@/lib/constants";
import styles from "./AddToBoardModal.module.css";

type Board = { id: string; name: string };

export default function AddToBoardModal({
  mealId,
  getMealId,
  boards: initialBoards,
  memberOf,
  onClose,
}: {
  mealId?: string; // when the meal already exists in the database
  getMealId?: () => Promise<string | null>; // when it might not exist yet: called at the moment of adding
  boards: Board[];
  memberOf: string[]; // ids of boards this meal is already in
  onClose: () => void;
}) {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>(initialBoards);
  const [added, setAdded] = useState<string[]>(memberOf);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  const visible = boards.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function addToBoard(boardId: string) {
    setBusyId(boardId);
    setError("");

    const id = getMealId ? await getMealId() : (mealId ?? null);
    if (!id) {
      setError("Something went wrong. Try again.");
      setBusyId(null);
      return;
    }

    const res = await fetch("/api/board-meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardId, mealId: id }),
    });

    // 409 = it was already in that board, which is fine — show it as added.
    if (res.ok || res.status === 409) {
      setAdded((prev) => (prev.includes(boardId) ? prev : [...prev, boardId]));
    } else {
      setError("Something went wrong. Try again.");
    }
    setBusyId(null);
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setBusyId("new");
    setError("");

    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: TEMP_USER_ID, name: newName }),
    });

    if (!res.ok) {
      setError("Couldn't create the board.");
      setBusyId(null);
      return;
    }

    const { board } = await res.json();
    setBoards((prev) => [board, ...prev]);
    setNewName("");
    setCreating(false);
    await addToBoard(board.id); // creating a board also adds the meal to it
  }

  // Refresh on close so the page behind the modal picks up the changes.
  function handleClose() {
    router.refresh();
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Choose board</h2>

        <input
          className={styles.search}
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className={styles.list}>
          {visible.length === 0 && (
            <p className={styles.empty}>
              {boards.length === 0 ? "No boards yet — create one below." : "No boards match."}
            </p>
          )}
          {visible.map((b) => (
            <div key={b.id} className={styles.row}>
              <span className={styles.boardName}>{b.name}</span>
              {added.includes(b.id) ? (
                <span className={styles.addedLabel}>Added ✓</span>
              ) : (
                <button
                  className={styles.addBtn}
                  onClick={() => addToBoard(b.id)}
                  disabled={busyId === b.id}
                >
                  {busyId === b.id ? "Adding…" : "Add"}
                </button>
              )}
            </div>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footer}>
          {creating ? (
            <div className={styles.createForm}>
              <input
                autoFocus
                className={styles.createInput}
                placeholder="Board name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
              />
              <button
                className={styles.addBtn}
                onClick={createAndAdd}
                disabled={busyId === "new"}
              >
                Create
              </button>
            </div>
          ) : (
            <button className={styles.createRow} onClick={() => setCreating(true)}>
              <span className={styles.plus}>+</span>
              Create board
            </button>
          )}
        </div>
      </div>
    </div>
  );
}