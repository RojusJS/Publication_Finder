import HomePage from "./pages/homePage";
import { LanguageProvider } from "./components/language";

function App() {
  return (
    <LanguageProvider>
      <HomePage />
    </LanguageProvider>
  );
}

export default App;
