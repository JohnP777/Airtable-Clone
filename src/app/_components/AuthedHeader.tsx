"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { useSidebar } from "./SidebarContext";
import { ProfileDropdown } from "./ProfileDropdown";

export function AuthedHeader() {
  const { isPinnedOpen, setPinnedOpen } = useSidebar();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isProfileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
      <div className="mx-auto flex w-full h-14 items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="relative group z-50">
            <button
              aria-label="Expand sidebar"
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 cursor-pointer"
              onClick={() => setPinnedOpen(!isPinnedOpen)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="pointer-events-none absolute left-1/2 top-9 -translate-x-1/2 transform rounded bg-black px-2 py-1 text-xs text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100">
              Expand sidebar
            </div>
          </div>

          <Link href="/" aria-label="Home">
            <Image src="/logo2.PNG" alt="Airtable" width={112} height={24} priority />
          </Link>
        </div>

        <div className="flex-1 px-4">
          <div className="flex w-[22.5rem] items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm ml-[calc(50%-11rem)]">
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span className="select-none text-xs text-gray-500">Search...</span>
            <span className="ml-auto text-xs text-gray-500">ctrl K</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
            <Image src="/questionmark.png" alt="Help" width={16} height={16} />
            <span>Help</span>
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-gray-100" aria-label="Notifications">
            <Image src="/bell.png" alt="Notifications" width={18} height={18} />
          </button>
          <div className="relative" ref={dropdownRef}>
            <button 
              className={`flex h-9 w-9 items-center justify-center rounded hover:bg-gray-100 ${
                isProfileDropdownOpen ? 'bg-gray-100' : ''
              }`}
              aria-label="Profile"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            >
              <Image src="/profile.svg" alt="Profile" width={26} height={26} />
            </button>
            <ProfileDropdown 
              isOpen={isProfileDropdownOpen} 
              onClose={() => setIsProfileDropdownOpen(false)} 
            />
          </div>
        </div>
      </div>
    </header>
  );
} 