import { Hero } from "./_components/Hero";
import { HomeContent } from "./_components/HomeContent";
import { AuthedHeader } from "./_components/AuthedHeader";
import { Sidebar } from "./_components/Sidebar";
import { SidebarProvider } from "./_components/SidebarContext";
import { auth } from "../server/auth";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    // Authenticated home page with sidebar and content
    return (
      <SidebarProvider>
        <AuthedHeader />
        <Sidebar />
        <div className="pl-14 sm:pl-14">
          <HomeContent />
        </div>
      </SidebarProvider>
    );
  }

  // Public welcome page
  return (
    <main>
      <Hero />
    </main>
  );
}
