import { useEffect } from "react";
import { AppProvider, useAppContext } from "./context/AppContext";
import { HomePage } from "./pages/HomePage";
import { TDInputPage } from "./pages/TDInputPage";
import { AffordanceSelectionPage } from "./pages/AffordanceSelectionPage";
import { ComponentCanvasPage } from "./pages/ComponentCanvasPage";
import { wotService } from "./services/wotService";
import "./App.css";

function AppContent() {
  const { state } = useAppContext();

  useEffect(() => {
    // Initialize WoT service
    wotService.start();
  }, []);

  switch (state.currentView) {
    case 'home':
      return <HomePage />;
    case 'td-input':
      return <TDInputPage />;
    case 'affordance-selection':
      return <AffordanceSelectionPage />;
    case 'component-canvas':
      return <ComponentCanvasPage />;
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
