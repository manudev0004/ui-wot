import { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { HomePage } from './pages/HomePage';
import { TDInputPage } from './pages/TDInputPage';
import { AffordanceSelectionPage } from './pages/AffordanceSelectionPage';
import { ComponentCanvasPage } from './pages/ComponentCanvasPage';
import './styles/theme.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useAppContext as useCtx } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { NavbarProvider } from './context/NavbarContext';

function RouterSync() {
  const { dispatch } = useCtx();
  const location = useLocation();

  useEffect(() => {
    const pathToView = (path: string) => {
      if (path === '/' || path === '') return 'home';
      if (path.startsWith('/td-input')) return 'td-input';
      if (path.startsWith('/affordances')) return 'affordance-selection';
      if (path.startsWith('/components')) return 'component-canvas';
      return 'home';
    };

    const newView = pathToView(location.pathname);
    dispatch({ type: 'SET_VIEW', payload: newView });
  }, [location.pathname, dispatch]);

  return (
    <div className="min-h-screen">
      <NavbarProvider>
        {location.pathname !== '/' && <Navbar />}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/td-input" element={<TDInputPage />} />
            <Route path="/affordances" element={<AffordanceSelectionPage />} />
            <Route path="/components/*" element={<ComponentCanvasPage />} />
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
        <BrowserRouter>
          <RouterSync />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
