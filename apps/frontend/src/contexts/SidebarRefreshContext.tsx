'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SidebarRefreshContextValue {
  /** Increments each time a sidebar refresh is requested. */
  refreshKey: number;
  /** Call this after any action that should update the sidebar (create, edit, delete). */
  triggerSidebarRefresh: () => void;
}

const SidebarRefreshContext = createContext<SidebarRefreshContextValue>({
  refreshKey: 0,
  triggerSidebarRefresh: () => {},
});

export function SidebarRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerSidebarRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <SidebarRefreshContext.Provider value={{ refreshKey, triggerSidebarRefresh }}>
      {children}
    </SidebarRefreshContext.Provider>
  );
}

export function useSidebarRefresh() {
  return useContext(SidebarRefreshContext);
}
