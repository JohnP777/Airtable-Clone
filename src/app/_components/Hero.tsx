import React from "react";

export function Hero() {
  return (
    <section className="w-full bg-transparent">
      <div className="mx-auto flex min-h-[56vh] max-w-[1120px] flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-2xl">
          <h1 className="font-normal text-[30px] leading-tight text-gray-900 md:text-[38px]">
            From idea to app in an instant
          </h1>
          <h2 className="font-normal mt-2 text-[30px] leading-tight text-gray-900 md:mt-3 md:text-[38px]">
            Build with AI that means business
          </h2>
        </div>

        <div className="mt-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl md:p-6">
          <p className="text-base text-gray-900">
            Build an app to plan, publish, and analyze content across social channels
          </p>

          <div className="mt-5 flex items-center justify-between">
            <button className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-xs font-medium text-gray-900 shadow-sm transition-colors hover:bg-gray-50">
              New Suggestion
            </button>
            <button className="rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800">
              Build it now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
} 