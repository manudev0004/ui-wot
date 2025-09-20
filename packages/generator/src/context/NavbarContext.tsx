import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

type NavbarContent = {
  info?: React.ReactNode;
  actions?: React.ReactNode;
};

type NavbarContextType = {
  content: NavbarContent;
  setContent: (content: NavbarContent) => void;
  clear: () => void;
};

const NavbarContext = createContext<NavbarContextType | undefined>(undefined);

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [content, setContentState] = useState<NavbarContent>({});

  // Stable callbacks so consumers' effects don't retrigger on every update
  const setContent = useCallback((next: NavbarContent) => {
    setContentState(next);
  }, []);

  const clear = useCallback(() => {
    setContentState({});
  }, []);

  const api = useMemo<NavbarContextType>(() => ({
    content,
    setContent,
    clear,
  }), [content, setContent, clear]);

  return (
    <NavbarContext.Provider value={api}>{children}</NavbarContext.Provider>
  );
}

export function useNavbar() {
  const ctx = useContext(NavbarContext);
  if (!ctx) throw new Error('useNavbar must be used within a NavbarProvider');
  return ctx;
}
