import { motion } from "motion/react";
import { useLang, Lang } from "./wedding-context";

export function LangToggle() {
  const { lang, setLang } = useLang();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.8, duration: 0.7 }}
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        background: "rgba(253,250,245,0.85)",
        backdropFilter: "blur(12px)",
        borderRadius: 100,
        padding: 4,
        gap: 2,
        boxShadow: "0 4px 20px rgba(61,34,21,0.12)",
        border: "1px solid rgba(138,112,48,0.2)",
      }}
    >
      {(["EN", "TH"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          style={{
            position: "relative",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "6px 16px",
            borderRadius: 100,
            fontFamily: "'TT Interphases', sans-serif",
            fontSize: "0.72rem",
            fontWeight: 500,
            letterSpacing: "0.12em",
            color: lang === l ? "#FFF8EE" : "rgba(58,44,24,0.55)",
            transition: "color 0.3s",
            zIndex: 1,
          }}
        >
          {lang === l && (
            <motion.div
              layoutId="lang-pill"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, #8A7030, #6B5520)",
                borderRadius: 100,
                zIndex: -1,
                boxShadow: "0 2px 8px rgba(138,112,48,0.3)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          {l}
        </button>
      ))}
    </motion.div>
  );
}
