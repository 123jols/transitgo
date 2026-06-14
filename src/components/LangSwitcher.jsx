import { useLang } from "../context/LanguageContext";
import { languages } from "../data/translations";

export default function LangSwitcher() {
  const { lang, changeLang } = useLang();

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {languages.map((l) => (
        <button
          key={l.id}
          onClick={() => changeLang(l.id)}
          style={{
            padding: "4px 10px",
            borderRadius: 20,
            border: "0.5px solid",
            borderColor: lang === l.id
              ? "rgba(100,181,246,0.5)"
              : "rgba(255,255,255,0.12)",
            background: lang === l.id
              ? "rgba(100,181,246,0.15)"
              : "rgba(255,255,255,0.05)",
            color: lang === l.id
              ? "#64b5f6"
              : "rgba(255,255,255,0.5)",
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
}