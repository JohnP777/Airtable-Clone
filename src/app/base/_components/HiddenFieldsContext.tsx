"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface HiddenFieldsContextType {
  hiddenFields: Set<string>;
  setHiddenFields: (fields: Set<string>) => void;
  hideField: (fieldId: string) => void;
  showField: (fieldId: string) => void;
  hideAllFields: (fieldIds: string[]) => void;
  showAllFields: () => void;
  isFieldHidden: (fieldId: string) => boolean;
}

const HiddenFieldsContext = createContext<HiddenFieldsContextType | undefined>(undefined);

export function useHiddenFields() {
  const context = useContext(HiddenFieldsContext);
  if (context === undefined) {
    throw new Error("useHiddenFields must be used within a HiddenFieldsProvider");
  }
  return context;
}

interface HiddenFieldsProviderProps {
  children: ReactNode;
}

export function HiddenFieldsProvider({ children }: HiddenFieldsProviderProps) {
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());

  const hideField = (fieldId: string) => {
    setHiddenFields(prev => new Set([...prev, fieldId]));
  };

  const showField = (fieldId: string) => {
    setHiddenFields(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldId);
      return newSet;
    });
  };

  const hideAllFields = (fieldIds: string[]) => {
    setHiddenFields(new Set(fieldIds));
  };

  const showAllFields = () => {
    setHiddenFields(new Set());
  };

  const isFieldHidden = (fieldId: string) => {
    return hiddenFields.has(fieldId);
  };

  const value: HiddenFieldsContextType = {
    hiddenFields,
    setHiddenFields,
    hideField,
    showField,
    hideAllFields,
    showAllFields,
    isFieldHidden,
  };

  return (
    <HiddenFieldsContext.Provider value={value}>
      {children}
    </HiddenFieldsContext.Provider>
  );
}
