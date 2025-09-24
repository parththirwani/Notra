"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { SignInModal } from "../auth/signinModal";


const Header = () => {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="relative h-36 w-28">
            <Image
              src="/big-logo.png"
              alt="Notra Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="sr-only">Notra (Notes Ultra)</span>
        </a>

        {/* Nav links */}
        <div className="hidden items-center gap-6 md:flex">
          <a href="#features" className="text-sm text-muted-foreground hover:text-blue-500">Features</a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-blue-500">How it works</a>
          <a href="#subjects" className="text-sm text-muted-foreground hover:text-blue-500">Subjects</a>
          <a href="#cta" className="text-sm text-muted-foreground hover:text-blue-500">Get started</a>
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <Button variant="outline" disabled>Loading...</Button>
          ) : session ? (
            <Button
              variant="outline"
              className="hidden md:inline-flex hover:border-red-500 hover:text-red-500"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Log out
            </Button>
          ) : (
            <Button
              variant="outline"
              className="hidden md:inline-flex hover:border-blue-500 hover:text-blue-500"
              onClick={() => setOpen(true)}
            >
              Sign in
            </Button>
          )}

          <Button className="bg-blue-500 hover:bg-blue-600 text-white">Upgrade</Button>

          <button className="md:hidden" aria-label="Open menu">
            <Menu className="h-5 w-5 text-blue-500" />
          </button>
        </div>
      </nav>

      {/* Sign in modal */}
      <SignInModal open={open} onOpenChange={setOpen} />
    </header>
  );
};

export default Header;
