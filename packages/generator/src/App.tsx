import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { HomePage } from './pages/HomePage';
import { TDInputPage } from './pages/TDInputPage';
import { AffordanceSelectionPage } from './pages/AffordanceSelectionPage';
import { ComponentCanvasPage } from './pages/ComponentCanvasPage';
import './styles/theme.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { NavbarProvider } from './context/NavbarContext';

function RouterSync() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <NavbarProvider>
        {location.pathname !== '/' && <Navbar />}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/td-input" element={<TDInputPage />} />
            <Route path="/affordances" element={<AffordanceSelectionPage />} />
            <Route path="/components" element={<ComponentCanvasPage />} />
            {/* fallback to home */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </main>
      </NavbarProvider>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <RouterSync />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
