"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "../../trpc/react";

interface BaseCardProps {
  base: {
    id: string;
    name: string;
    lastOpened: Date;
  };
  onContextMenu: (e: React.MouseEvent, baseId: string, baseName: string) => void;
}

export function BaseCard({ base, onContextMenu }: BaseCardProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(base.name);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const utils = api.useUtils();
  const updateLastOpenedMutation = api.base.updateLastOpened.useMutation({
    onSuccess: () => {
      void utils.base.getRecent.invalidate();
    },
  });

  const renameMutation = api.base.rename.useMutation({
    onSuccess: () => {
      void utils.base.getRecent.invalidate();
      setIsRenaming(false);
    },
  });



  const handleCardClick = () => {
    if (!isRenaming) {
      void updateLastOpenedMutation.mutate({ id: base.id });
      router.push(`/base/${base.id}`);
    }
  };

  const handleRename = () => {
    if (newName.trim() && newName.trim() !== base.name) {
      void renameMutation.mutate({ id: base.id, name: newName.trim() });
    } else {
      setIsRenaming(false);
      setNewName(base.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
      setNewName(base.name);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRenaming(true);
  };

  return (
    <div
      className="group relative rounded-lg border border-gray-200 bg-white py-5 px-4 min-h-24 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-semibold text-lg"
          style={{ 
            backgroundColor: `hsl(${base.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 360}, 70%, 50%)` 
          }}
        >
          {base.name.substring(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRename}
              className="w-full text-xs font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
              placeholder="Enter name..."
            />
          ) : (
            <h3 
              className="text-xs font-semibold text-gray-900 truncate"
              onDoubleClick={handleDoubleClick}
            >
              {base.name}
            </h3>
          )}
          <p className="mt-2 text-xs text-gray-500">
            {(() => {
              const openedAt = new Date(base.lastOpened).getTime();
              const diffMs = Date.now() - openedAt;
              const minutes = Math.floor(diffMs / (1000 * 60));
              const hours = Math.floor(diffMs / (1000 * 60 * 60));
              const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

              if (minutes < 5) return "Opened just now";
              if (minutes < 60) return `Opened ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
              if (hours < 24) return `Opened ${hours} hour${hours !== 1 ? 's' : ''} ago`;
              return `Opened ${days} day${days !== 1 ? 's' : ''} ago`;
            })()}
          </p>
        </div>
      </div>
      
      {/* Hover buttons */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
          onClick={(e) => {
            e.stopPropagation();
            // Star functionality - for now, do nothing
          }}
        >
          <Image src="/6.PNG" alt="Star" width={20} height={20} />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded hover:bg-gray-100"
          onClick={(e) => onContextMenu(e, base.id, base.name)}
        >
          <Image src="/7.PNG" alt="More options" width={20} height={20} />
        </button>
      </div>
    </div>
  );
} 