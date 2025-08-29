"use client"
import { useEffect } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Subjects from "@/components/landing/Subjects";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  useEffect(() => {
    document.title = "Notra — AI Study Rooms for STEM";
    const desc = "Create subject rooms, chat with your notes, and auto‑generate flashcards, MCQs, and 3‑hour exams for STEM.";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", desc);

    // Dynamic canonical tag
    const existing = document.querySelector('link[rel="canonical"]');
    const link = existing || document.createElement("link");
    link.setAttribute("rel", "canonical");
    link.setAttribute("href", window.location.origin + "/");
    if (!existing) document.head.appendChild(link);
  }, []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Notra (Note Ultra)",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description:
      "Create STEM subject rooms, chat with notes, and generate flashcards, MCQs, and full‑length exams.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Subjects />
        <CTA />
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;