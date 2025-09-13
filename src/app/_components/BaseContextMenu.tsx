"use client";

import React, { useRef, useEffect } from "react";
import Image from "next/image";
import { api } from "../../trpc/react";

interface BaseContextMenuProps {
  baseId: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  onRename?: () => void;
}

export function BaseContextMenu({ baseId, isOpen, onClose, position, onRename }: BaseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();
  const deleteMutation = api.base.delete.useMutation({
    onMutate: async ({ id }) => {
      // Optimistically update the base list to remove the base
      const currentData = utils.base.getRecent.getData({ limit: 10 });
      if (currentData) {
        const updatedBases = currentData.filter(b => b.id !== id);
        utils.base.getRecent.setData({ limit: 10 }, updatedBases);
      }
      onClose();
    },
    onSettled: (data) => {
      console.log("Base deleted successfully:", data);
      void utils.base.getRecent.invalidate();
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this base?")) {
      void deleteMutation.mutate({ id: baseId });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-56 rounded-lg border border-gray-200 bg-white py-2 px-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button
        onClick={() => {
          onRename?.();
          onClose();
        }}
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
        <span>Rename</span>
      </button>
      
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <span>Duplicate</span>
      </button>
      
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17L17 7"/>
          <path d="M7 7h10v10"/>
        </svg>
        <span>Move</span>
      </button>
      
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <span>Go to workspace</span>
      </button>
      
      <button
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span>Customize appearance</span>
      </button>
      
      <div className="border-t border-gray-200 my-1 mx-3"></div>
      
      <button
        onClick={handleDelete}
        disabled={deleteMutation.isPending}
        className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
        <span>{deleteMutation.isPending ? "Deleting..." : "Delete"}</span>
      </button>
    </div>
  );
} 