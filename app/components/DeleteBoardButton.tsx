"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Boards.module.css";

export default function DeleteBoardButton({
  boardId,
  boardName,
}: {
  boardId: string;
  boardName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete the board "${boardName}"? Your saved meals are not deleted.`,
      )
    )
      return;

    setBusy(true);
    const res = await fetch(`/api/boards/${boardId}`, { method: "DELETE" });

    if (res.ok) {
      router.push("/boards");
      router.refresh();
    } else {
      setBusy(false);
      window.alert("Couldn't delete the board. Try again.");
    }
  }

  return (
    <button className={styles.deleteBoard} onClick={handleDelete} disabled={busy}>
      {busy ? "Deleting…" : "Delete board"}
    </button>
  );
}