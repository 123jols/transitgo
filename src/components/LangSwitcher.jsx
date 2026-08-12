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
            padding: "4px 9px",
            borderRadius: 4,
            border: "1px solid",
            borderColor: lang === l.id
              ? "rgba(226,165,58,0.5)"
              : "rgba(255,255,255,0.12)",
            background: lang === l.id
              ? "rgba(226,165,58,0.15)"
              : "rgba(255,255,255,0.05)",
            color: lang === l.id
              ? "#e2a53a"
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