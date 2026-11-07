import { motion } from "motion/react";
import { positionName } from "./store";

/* The result board, as on the broadcast stage: one number plate per digit,
   flipping in left to right. It replaces the drums once the number is
   complete, because the iPad itself is the screen guests watch — the plates
   are sized to read from across the room, the cup balls are not. */
export function ResultBoard({ value, digits, reduced }: { value: string; digits: number; reduced: boolean }) {
  const v = value.padStart(digits, "0").slice(-digits);
  return (
    <motion.div
      className="board"
      style={{ ["--n" as string]: digits, ["--half" as string]: Math.ceil(digits / 2) }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      aria-hidden
    >
      <div className="board-panel">
        {v.split("").map((d, i) => (
          <div className="board-slot" key={i}>
            <motion.span
              className="board-plate"
              initial={reduced ? false : { rotateX: -90, opacity: 0 }}
              animate={{ rotateX: 0, opacity: 1 }}
              transition={{ delay: 0.12 + i * 0.12, type: "spring", stiffness: 240, damping: 17 }}
            >
              {d}
            </motion.span>
            <span className="board-label">{positionName(i, digits)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
