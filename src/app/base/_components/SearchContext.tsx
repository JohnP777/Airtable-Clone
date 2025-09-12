"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useTableContext } from "./TableContext";
import { useView } from "./ViewContext";

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (open: boolean) => void;
  closeDropdown: () => void;
  isSearching: boolean;
  setIsSearching: (searching: boolean) => void;
  searchResults: {
    cellCount: number;
    recordCount: number;
  } | null;
  setSearchResults: (results: { cellCount: number; recordCount: number } | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ cellCount: number; recordCount: number } | null>(null);
  const { selectedTableId } = useTableContext();
  const { currentViewId } = useView();

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults(null);
    setIsSearching(false);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Reset search and close dropdown when switching tables or views
  useEffect(() => {
    setSearchTerm("");
    setIsDropdownOpen(false);
    setSearchResults(null);
    setIsSearching(false);
  }, [selectedTableId, currentViewId]);

  return (
    <SearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        clearSearch,
        isDropdownOpen,
        setIsDropdownOpen,
        closeDropdown,
        isSearching,
        setIsSearching,
        searchResults,
        setSearchResults,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

