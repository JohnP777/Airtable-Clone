"use client";

import React, { useState, useEffect, useRef } from "react";
import { api } from "../../../trpc/react";
import { useTableContext } from "./TableContext";
import { useHiddenFields } from "./HiddenFieldsContext";
import { useView } from "./ViewContext";

interface HideFieldsButtonProps {
  tableId: string;
}

export function HideFieldsButton({ tableId }: HideFieldsButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isFieldHidden, toggleFieldHidden, setHiddenFields, hiddenFieldIds } = useHiddenFields();
  const { currentViewId } = useView();

  // Get table data to show available columns - use paginated version with minimal data
  const { data: tableData } = api.table.getTableDataPaginated.useQuery(
    { 
      tableId,
      viewId: currentViewId ?? undefined,
      page: 0,
      pageSize: 1, // Only need 1 row to get table structure
      sortRules: [],
      filterRules: []
    },
    { enabled: !!tableId }
  );

  // Filter fields based on search term
  const filteredFields = tableData?.table?.columns?.filter(column => 
    column.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  // Get all fields except the primary field (first column)
  const fieldsToShow = filteredFields.slice(1); // Skip the first column (primary field)

  const handleFieldToggle = (columnId: string) => {
    toggleFieldHidden(columnId);
  };

  const handleHideAll = () => {
    const allFieldIds = fieldsToShow.map(field => field.id);
    setHiddenFields(allFieldIds);
  };

  const handleShowAll = () => {
    setHiddenFields([]);
  };

  const handleButtonClick = () => {
    setShowDropdown(!showDropdown);
    if (!showDropdown) {
      // Focus the search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDropdown(false);
      setSearchTerm("");
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleButtonClick}
        className={`px-3 py-1 text-xs rounded border shadow-sm ${
          showDropdown 
            ? "bg-blue-500 text-white border-blue-500" 
            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
        }`}
      >
        Hide fields
      </button>
      
             {showDropdown && (
         <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg z-50">
           <div className="p-3">
             {/* Search Input */}
             <div className="mb-2">
               <div className="relative">
                 <input
                   ref={searchInputRef}
                   type="text"
                   placeholder="Find a field"
                   value={searchTerm}
                   onChange={handleSearchChange}
                   onKeyDown={handleKeyDown}
                   className="w-full pl-2 pr-2 py-1 text-xs border-b border-gray-300 focus:outline-none focus:border-gray-400"
                 />
                 <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                   <svg className="h-3 w-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                   </svg>
                 </div>
               </div>
             </div>

                         {/* Field List */}
             <div className="space-y-0 mb-2">
               {fieldsToShow.map((field) => (
                 <div key={field.id} className="flex items-center justify-between py-1 px-1 hover:bg-gray-50">
                   <div className="flex items-center space-x-2">
                     {/* Toggle Switch */}
                     <label className="flex items-center cursor-pointer">
                       <div className="relative">
                         <input
                           type="checkbox"
                           className="sr-only"
                           checked={!isFieldHidden(field.id)}
                           onChange={() => handleFieldToggle(field.id)}
                         />
                         <div
                           className={`block w-8 h-5 rounded-full transition-colors duration-200 ease-in-out ${
                             !isFieldHidden(field.id) ? "bg-green-500" : "bg-gray-300"
                           }`}
                         ></div>
                         <div
                           className={`dot absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform duration-200 ease-in-out ${
                             !isFieldHidden(field.id) ? "translate-x-full" : ""
                           }`}
                         ></div>
                       </div>
                     </label>
                     
                     {/* Field Icon */}
                     <span className="text-xs text-gray-600 font-medium">#</span>
                     
                     {/* Field Name */}
                     <span className="text-xs text-gray-700">{field.name}</span>
                   </div>
                   
                   {/* Context Menu Dots */}
                   <div className="text-gray-400">
                     <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                       <path d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                     </svg>
                   </div>
                 </div>
               ))}
               
               {fieldsToShow.length === 0 && (
                 <div className="text-xs text-gray-500 text-center py-1">
                   No fields found
                 </div>
               )}
             </div>

                         {/* Action Buttons */}
             <div className="flex space-x-2">
               <button
                 onClick={handleHideAll}
                 className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
               >
                 Hide all
               </button>
               <button
                 onClick={handleShowAll}
                 className="flex-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
               >
                 Show all
               </button>
             </div>
          </div>
        </div>
      )}
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
