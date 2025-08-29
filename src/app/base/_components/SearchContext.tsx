"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useView } from "./ViewContext";

interface SearchResult {
  type: "field" | "cell";
  rowId?: string;
  columnId: string;
  value: string;
  columnName: string;
}

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;
  currentResultIndex: number;
  setCurrentResultIndex: (index: number) => void;
  isSearchActive: boolean;
  setIsSearchActive: (active: boolean) => void;
  clearSearch: () => void;
  nextResult: () => void;
  previousResult: () => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const { currentView, updateView } = useView();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Sync with current view's search settings
  useEffect(() => {
    if (currentView) {
      setSearchTerm(currentView.searchTerm);
      setSearchResults(currentView.searchResults);
      setCurrentResultIndex(currentView.currentResultIndex);
      setIsSearchActive(currentView.isSearchActive);
    }
  }, [currentView?.id]);

  // Update view when search settings change
  useEffect(() => {
    if (currentView) {
      updateView(currentView.id, { 
        searchTerm, 
        searchResults, 
        currentResultIndex, 
        isSearchActive 
      });
    }
  }, [searchTerm, searchResults, currentResultIndex, isSearchActive, currentView?.id]);

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setCurrentResultIndex(0);
    setIsSearchActive(false);
  };

  const nextResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prev) => (prev + 1) % searchResults.length);
    }
  };

  const previousResult = () => {
    if (searchResults.length > 0) {
      setCurrentResultIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  return (
    <SearchContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        searchResults,
        setSearchResults,
        currentResultIndex,
        setCurrentResultIndex,
        isSearchActive,
        setIsSearchActive,
        clearSearch,
        nextResult,
        previousResult,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
}
