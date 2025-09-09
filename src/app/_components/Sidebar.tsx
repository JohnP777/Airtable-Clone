"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSidebar } from "./SidebarContext";
import { useRouter } from "next/navigation";
import { api } from "../../trpc/react";

 

export function Sidebar() {
  const { isPinnedOpen } = useSidebar();
  const [isHovering, setIsHovering] = useState(false);
  const router = useRouter();

  const utils = api.useUtils();
  const createBaseMutation = api.base.create.useMutation({
    onSuccess: (base) => {
      void utils.base.getRecent.invalidate();
      router.push(`/base/${base.id}`);
    },
  });

  const isOpen = isPinnedOpen || isHovering;

  return (
    <aside
      className={`${isOpen ? "w-75" : "w-12"} fixed left-0 top-14 bottom-0 z-40 border-r-2 border-gray-200 bg-white/80 backdrop-blur-sm transition-all duration-200`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      aria-label="Sidebar"
    >
      {!isOpen && (
        <div className="flex h-full flex-col items-center justify-between pt-4 pb-1">
          {/* Top icon stack */}
          <div className="flex flex-col items-center gap-3">
            <button aria-label="A" className="rounded p-1 hover:bg-gray-100">
              <Image src="/a.PNG" alt="A" width={22} height={22} />
            </button>
            <button aria-label="B" className="rounded p-1 hover:bg-gray-100">
              <Image src="/b.PNG" alt="B" width={22} height={22} />
            </button>
            <button aria-label="C" className="rounded p-1 hover:bg-gray-100">
              <Image src="/c.PNG" alt="C" width={22} height={22} />
            </button>
            <button aria-label="D" className="rounded p-1 hover:bg-gray-100">
              <Image src="/d.PNG" alt="D" width={24} height={24} />
            </button>
            {/* Short divider */}
            <div className="my-1 h-px w-6 bg-gray-200" />
          </div>

          {/* Bottom icon stack */}
          <div className="flex flex-col items-center gap-2">
            {/* Short divider above E */}
            <div className="mb-1 h-px w-6 bg-gray-200" />
            <button aria-label="E" className="rounded p-1 hover:bg-gray-100">
              <Image src="/e.PNG" alt="E" width={18} height={18} />
            </button>
            <button aria-label="F" className="rounded p-1 hover:bg-gray-100">
              <Image src="/f.PNG" alt="F" width={18} height={18} />
            </button>
            <button aria-label="G" className="rounded p-1 hover:bg-gray-100">
              <Image src="/g.PNG" alt="G" width={18} height={18} />
            </button>
            <button aria-label="Add" className="mb-1 rounded-md p-1 border border-gray-300 hover:bg-gray-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      )}
              {isOpen && (
          <div className="flex h-full flex-col justify-between py-2">
            {/* Top section - main navigation */}
            <div className="px-3 space-y-1">
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100">
                <Image src="/a.PNG" alt="Home" width={22} height={22} />
                <span className="text-base font-medium text-gray-900">Home</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100">
                <Image src="/b.PNG" alt="Starred" width={22} height={22} />
                <span className="text-base text-gray-900">Starred</span>
                <span className="ml-auto text-gray-400">›</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100">
                <Image src="/c.PNG" alt="Shared" width={22} height={22} />
                <span className="text-base text-gray-900">Shared</span>
              </button>
              <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100">
                <Image src="/d.PNG" alt="Workspaces" width={24} height={24} />
                <span className="text-base text-gray-900">Workspaces</span>
                <span className="ml-auto flex items-center gap-3 text-gray-400">
                  <span>+</span>
                  <span>›</span>
                </span>
              </button>
            </div>

            {/* Middle divider */}
            <div className="my-4 h-px w-[85%] mx-3 bg-gray-200" />

            {/* Bottom section - positioned to align with collapsed sidebar icons */}
            <div className="flex-1 flex flex-col justify-end pb-1">
              <div className="px-3 space-y-0.5">
                <div className="border-t border-gray-200 my-1 mx-3"></div>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100">
                  <Image src="/e.PNG" alt="Templates and apps" width={18} height={18} />
                  <span className="text-xs text-gray-900 whitespace-nowrap">Templates and apps</span>
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100">
                  <Image src="/f.PNG" alt="Marketplace" width={18} height={18} />
                  <span className="text-xs text-gray-900">Marketplace</span>
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-gray-100">
                  {/* Download icon replacing g.png */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <path d="M7 10l5 5 5-5"/>
                    <path d="M12 15V3"/>
                  </svg>
                  <span className="text-xs text-gray-900">Import</span>
                </button>
              </div>
            </div>

            {/* Create button pinned to bottom */}
            <div className="p-3">
              <button onClick={() => void createBaseMutation.mutate({})} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50" disabled={createBaseMutation.isPending}>
                <span>+</span>
                {createBaseMutation.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}
    </aside>
  );
} 