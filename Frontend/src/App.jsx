import HomePage from "./pages/homePage";
import { LanguageProvider } from "./components/language";
import { ToastProvider } from "./components/toastContext";

function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <HomePage />
      </ToastProvider>
    </LanguageProvider>
  );
}

export default App;