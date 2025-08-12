import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const Header = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo with blue accent */}
        <a href="#" className="flex items-center gap-2">
          <span className="font-display text-xl tracking-tight text-blue-500">Notra</span>
          <span className="sr-only">Notra (Note Ultra)</span>
        </a>

        {/* Nav links with blue hover */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-blue-500 story-link">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-blue-500 story-link">How it works</a>
          <a href="#subjects" className="text-sm text-muted-foreground hover:text-blue-500 story-link">Subjects</a>
          <a href="#cta" className="text-sm text-muted-foreground hover:text-blue-500 story-link">Get started</a>
        </div>

        {/* Buttons with blue primary */}
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden md:inline-flex hover:border-blue-500 hover:text-blue-500">Sign in</Button>
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">Start free</Button>
          <button className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5 text-blue-500" />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Header;
