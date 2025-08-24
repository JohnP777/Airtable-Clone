import Link from "next/link";

export default async function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            From idea to app in an instant
          </h1>
          <h2 className="text-4xl font-bold text-gray-900">
            Build with AI that means business
          </h2>
        </div>
        
        <button className="rounded-lg bg-black px-8 py-4 text-xl font-semibold text-white hover:bg-gray-800 transition-colors">
          Build it now
        </button>
      </div>
    </main>
  );
}
