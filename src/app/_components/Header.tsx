"use client";

import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="w-full bg-[#f8f4ec] border-b-2 border-[#ebeee6]">
      <div className="mx-auto flex w-full items-center justify-between px-6 py-3">
        <div className="flex items-center gap-7">
          <Link href="#" aria-label="Home" className="flex items-center">
            <Image src="/airtablelogo.jpg" alt="Airtable" width={136} height={32} priority />
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-gray-900">
            <button className="transition-colors hover:text-blue-600">Platform &gt;</button>
            <button className="transition-colors hover:text-blue-600">Solutions &gt;</button>
            <button className="transition-colors hover:text-blue-600">Resources &gt;</button>
            <button className="transition-colors hover:text-blue-600">Enterprise</button>
            <button className="transition-colors hover:text-blue-600">Pricing</button>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="rounded-lg border border-black bg-[#f8f4ec] px-4 py-2 text-sm font-semibold text-black transition-colors hover:text-blue-600">Book Demo</button>
          <button className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800">Sign up for free</button>
          <button className="text-sm font-semibold text-gray-900 transition-colors hover:text-blue-600">Log in</button>
        </div>
      </div>
    </header>
  );
} 