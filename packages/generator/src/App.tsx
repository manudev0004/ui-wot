import { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { defineCustomElements } from "@thingweb/ui-wot-components/loader";
import { AppProvider, useAppContext } from "./context/AppContext";
import { wotService } from "./services/wotService";
import { HomePage } from "./pages/HomePage";
import { TDInputPage } from "./pages/TDInputPage";
import { AffordanceSelectionPage } from "./pages/AffordanceSelectionPage";
import { ComponentCanvasPage } from "./pages/ComponentCanvasPage";

function AppContent() {
  const { state } = useAppContext();

  useEffect(() => {
    // Initialize Stencil components
    defineCustomElements();
    
    // Initialize WoT service
    wotService.start().catch(console.error);

    // Cleanup on unmount
    return () => {
      wotService.stop().catch(console.error);
    };
  }, []);

  const renderCurrentView = () => {
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
  };

  return (
    <div className="App">
      {renderCurrentView()}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
}

export default App;
