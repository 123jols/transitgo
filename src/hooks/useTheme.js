import { createContext, useContext } from "react";

export const ThemeContext = createContext(null);

export default function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
