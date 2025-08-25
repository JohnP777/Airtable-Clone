import { Hero } from "An/app/_components/Hero";
import { HomeContent } from "An/app/_components/HomeContent";
import { auth } from "An/server/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    // Authenticated home page with sidebar and content
    return <HomeContent />;
  }

  // Public welcome page
  return (
    <main>
      <Hero />
    </main>
  );
}
