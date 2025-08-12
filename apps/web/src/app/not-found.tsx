"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error("404 Error: User attempted to access:", pathname);
  }, [pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center px-6">
        {/* Glitchy large 404 */}
        <h1 className="text-[8rem] font-extrabold leading-none tracking-tight">
          404
        </h1>
        {/* Tagline */}
        <p className="mt-4 text-lg text-gray-400">
          The page <span className="font-mono">{pathname}</span> does not exist.
        </p>
        {/* Button */}
        <a
          href="/"
          className="mt-8 inline-block rounded-lg border border-white px-6 py-3 text-sm font-semibold transition hover:bg-white hover:text-black"
        >
          Return Home
        </a>
      </div>
    </main>
  );
}
