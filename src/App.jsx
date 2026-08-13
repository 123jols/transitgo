import "./App.css";
import HomePage from "./pages/HomePage";
import AiChat from "./components/AiChat";
import ThemeProvider from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <HomePage />
      <AiChat />
    </ThemeProvider>
  );
}