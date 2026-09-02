import "./App.css";
import HomePage from "./pages/HomePage";
import AiChat from "./components/AiChat";
import ThemeProvider from "./components/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <HomePage />
        <AiChat />
      </ThemeProvider>
    </AuthProvider>
  );
}