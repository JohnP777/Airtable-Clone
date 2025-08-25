"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { api } from "An/trpc/react";

interface BaseContextMenuProps {
  baseId: string;
  currentName: string;
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
}

export function BaseContextMenu({ baseId, currentName, isOpen, onClose, position }: BaseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const utils = api.useUtils();
  const deleteMutation = api.base.delete.useMutation({
    onSuccess: () => {
      utils.base.getRecent.invalidate();
      onClose();
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
      deleteMutation.mutate({ id: baseId });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 min-w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button
        onClick={handleDelete}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-gray-100"
      >
        <Image src="/9.PNG" alt="Delete" width={16} height={16} />
        <span>Delete</span>
      </button>
    </div>
  );
} 