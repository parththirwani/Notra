import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { auth } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Notra",
  description: "Notra: AI STEM Learning Platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  
  try {
    session = await auth();
  } catch (error: any) {
    // Silently ignore old cookie errors - they're harmless
    if (!error.message?.includes('Invalid Compact JWE')) {
      console.error("Auth error:", error);
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}