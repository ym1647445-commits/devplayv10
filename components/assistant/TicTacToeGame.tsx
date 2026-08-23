"use client";

import { RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AssistantMood } from "./visualAssistantEvents";
import styles from "./TicTacToeGame.module.css";

type Mark = "X" | "O" | null;
type Winner = "X" | "O" | "draw" | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

function getWinner(board: Mark[]): Winner {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function findMove(board: Mark[], mark: Exclude<Mark, null>): number | null {
  for (const index of board.keys()) {
    if (board[index]) continue;
    const next = [...board];
    next[index] = mark;
    if (getWinner(next) === mark) return index;
  }
  return null;
}

function chooseRobotMove(board: Mark[]): number | null {
  const winning = findMove(board, "O");
  if (winning !== null) return winning;
  const blocking = findMove(board, "X");
  if (blocking !== null) return blocking;
  if (!board[4]) return 4;
  const free = board.map((cell, index) => cell ? -1 : index).filter((index) => index >= 0);
  return free.length ? free[Math.floor(Math.random() * free.length)] : null;
}

export function TicTacToeGame({
  onClose,
  onResult,
}: {
  onClose: () => void;
  onResult: (mood: AssistantMood) => void;
}) {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [winner, setWinner] = useState<Winner>(null);
  const [thinking, setThinking] = useState(false);
  const robotTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (robotTimerRef.current) window.clearTimeout(robotTimerRef.current);
  }, []);

  function announce(result: Winner) {
    setWinner(result);
    if (result === "X") onResult("sulk");
    else if (result === "O") onResult("celebrate");
    else if (result === "draw") onResult("confused");
  }

  function play(index: number) {
    if (board[index] || winner || thinking) return;
    const afterCustomer = [...board];
    afterCustomer[index] = "X";
    setBoard(afterCustomer);
    const customerResult = getWinner(afterCustomer);
    if (customerResult) {
      announce(customerResult);
      return;
    }

    setThinking(true);
    robotTimerRef.current = window.setTimeout(() => {
      const move = chooseRobotMove(afterCustomer);
      const afterRobot = [...afterCustomer];
      if (move !== null) afterRobot[move] = "O";
      setBoard(afterRobot);
      setThinking(false);
      const robotResult = getWinner(afterRobot);
      if (robotResult) announce(robotResult);
    }, 650);
  }

  function restart() {
    if (robotTimerRef.current) window.clearTimeout(robotTimerRef.current);
    setBoard(Array(9).fill(null));
    setWinner(null);
    setThinking(false);
  }

  const resultText = winner === "X"
    ? "كسبتيني! هزعل ثانيتين بس… ماتش حلو جدًا 😤💜"
    : winner === "O"
      ? "الروبوت كسب الجولة! لعبك كان حلو—نلعب واحدة كمان؟ 🎉"
      : winner === "draw"
        ? "تعادل محترم! واضح إننا قد بعض بالظبط 🤝"
        : thinking
          ? "الروبوت بيفكّر في الحركة…"
          : "دورك: اختاري مربعًا وحطي X";

  return createPortal(
    <div className={styles.backdrop} role="presentation">
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="assistant-game-title">
        <header>
          <div><small>العميل ضد الروبوت</small><h2 id="assistant-game-title">لعبة X و O</h2></div>
          <button type="button" onClick={onClose} aria-label="إغلاق اللعبة"><X size={18} /></button>
        </header>
        <div className={styles.players}><span><b>X</b> أنت</span><strong>VS</strong><span><b>O</b> Dev</span></div>
        <div className={styles.board} aria-label="لوحة لعبة X و O">
          {board.map((cell, index) => (
            <button
              type="button"
              key={index}
              onClick={() => play(index)}
              disabled={Boolean(cell) || Boolean(winner) || thinking}
              aria-label={`المربع ${index + 1}${cell ? `: ${cell}` : ""}`}
              data-mark={cell ?? "empty"}
            >
              {cell}
            </button>
          ))}
        </div>
        <p className={styles.status} data-result={winner ?? "playing"}>{resultText}</p>
        {winner && <button type="button" className={styles.restart} onClick={restart}><RotateCcw size={16} /> جولة جديدة</button>}
        <small className={styles.note}>لعبة خفيفة للمرح فقط—المكسب والخسارة بين أصحاب.</small>
      </section>
    </div>,
    document.body,
  );
}