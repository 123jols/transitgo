import { createContext, useContext, useState } from "react";
import { translations } from "../data/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(
    localStorage.getItem("transitgo-lang") || "en"
  );

  function changeLang(newLang) {
    setLang(newLang);
    localStorage.setItem("transitgo-lang", newLang);
  }

  const t = translations[lang] || translations.en;

  return (
    <LanguageContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}