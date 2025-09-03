"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useView } from "./ViewContext";

type Ctx = {
  isFieldHidden: (id: string) => boolean;
  toggleFieldHidden: (id: string) => void;
  setHiddenFields: (ids: string[]) => void;
  hiddenFieldIds: string[];
};

const HiddenFieldsContext = createContext<Ctx | null>(null);

export function useHiddenFields() {
  const v = useContext(HiddenFieldsContext);
  if (!v) throw new Error("useHiddenFields must be used within HiddenFieldsProvider");
  return v;
}

interface HiddenFieldsProviderProps {
  children: React.ReactNode;
}

export function HiddenFieldsProvider({ children }: HiddenFieldsProviderProps) {
  const { currentViewId } = useView();
  const [byView, setByView] = useState<Record<string, Set<string>>>({});

  const setHiddenFields = useCallback((ids: string[]) => {
    if (!currentViewId) return;
    setByView(prev => ({ ...prev, [currentViewId!]: new Set(ids) }));
  }, [currentViewId]);

  const toggleFieldHidden = useCallback((id: string) => {
    if (!currentViewId) return;
    setByView(prev => {
      const set = new Set(prev[currentViewId!] ?? []);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...prev, [currentViewId!]: set };
    });
  }, [currentViewId]);

  const hiddenSet = useMemo(() => {
    if (!currentViewId) return new Set<string>();
    return byView[currentViewId] ?? new Set<string>();
  }, [byView, currentViewId]);
  
  const isFieldHidden = useCallback((id: string) => hiddenSet.has(id), [hiddenSet]);
  const hiddenFieldIds = useMemo(() => Array.from(hiddenSet), [hiddenSet]);

  const value = useMemo(
    () => ({ isFieldHidden, toggleFieldHidden, setHiddenFields, hiddenFieldIds }),
    [isFieldHidden, toggleFieldHidden, setHiddenFields, hiddenFieldIds]
  );

  return <HiddenFieldsContext.Provider value={value}>{children}</HiddenFieldsContext.Provider>;
}
