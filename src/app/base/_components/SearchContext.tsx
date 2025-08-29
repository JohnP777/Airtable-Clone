"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearchActive, setIsSearchActive] = useState(false);

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
