"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, FolderOpenDot, FileText, BrainCircuit } from "lucide-react";

const steps = [
  {
    icon: FolderOpenDot,
    title: "Create a subject room",
    desc: "Name it (e.g., Linear Algebra), set goals, and choose difficulty.",
    panel: {
      heading: "Subject Rooms",
      sub: "Organize your STEM focus with objectives",
      bullets: ["Custom goals", "Topic scoping", "Prereq tagging"],
    },
  },
  {
    icon: FileText,
    title: "Upload notes & problem sets",
    desc: "PDFs, slides, articles — parsed for structure, defs, and theorems.",
    panel: {
      heading: "Knowledge Ingestion",
      sub: "Semantic parsing of your material",
      bullets: ["Equation-aware", "Section summaries", "Citations"],
    },
  },
  {
    icon: BrainCircuit,
    title: "Chat to synthesize",
    desc: "Ask for proofs, derivations, or step-by-step solutions with sources.",
    panel: {
      heading: "Reasoning Chat",
      sub: "Derivations and proofs on demand",
      bullets: ["LaTeX formatting", "Cited steps", "Concept graph"],
    },
  },
  {
    icon: CheckCircle2,
    title: "Generate evaluations",
    desc: "Flashcards, MCQs, and a 3-hour mock exam — with solutions.",
    panel: {
      heading: "Assess & Master",
      sub: "Auto-generated practice and exams",
      bullets: ["Flashcards", "MCQ pools", "3-hour exam"],
    },
  },
] as const;

export default function HowItWorksShowcase() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActive(idx);
          }
        });
      },
      { threshold: 0.6, rootMargin: "-10% 0px -10% 0px" }
    );

    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const ActiveIcon = useMemo(() => steps[active].icon, [active]);

  return (
    <section id="how-it-works" className="relative border-t border-b bg-white">
      {/* Heading */}
      <div className="container mx-auto px-4 py-16 md:py-20 text-center max-w-2xl">
        <h2 className="font-display text-3xl tracking-tight md:text-4xl text-black">
          How it works
        </h2>
        <p className="mt-3 text-gray-600">
          Four steps. Infinite understanding.
        </p>
      </div>

      {/* Scroll-driven Showcase */}
      <div className="container mx-auto grid grid-cols-1 gap-10 px-4 pb-20 md:pb-28 lg:grid-cols-12">
        {/* Left: Steps list */}
        <ol className="lg:col-span-5 space-y-16">
          {steps.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              data-index={i}
              className="min-h-[60vh] flex flex-col justify-center"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-md transition-all duration-300 ${
                    i === active 
                      ? "bg-blue-50 ring-1 ring-blue-200 shadow-sm shadow-blue-200/50" 
                      : "bg-gray-100"
                  }`}
                >
                  <s.icon className={`h-5 w-5 ${i === active ? 'text-blue-600' : 'text-gray-500'}`} />
                </div>
                <span className={`text-sm ${i === active ? 'text-blue-600' : 'text-gray-500'}`}>
                  Step {i + 1}
                </span>
              </div>
              <h3 className={`mt-3 font-display text-2xl tracking-tight transition-colors duration-300 ${
                i === active ? 'text-black' : 'text-gray-600'
              }`}>
                {s.title}
              </h3>
              <p className={`mt-2 text-gray-600 transition-colors duration-300`}>
                {s.desc}
              </p>
            </li>
          ))}
        </ol>

        {/* Right: Sticky panel */}
        <div className="lg:col-span-7">
          <div className="sticky top-24">
            <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
              {/* Subtle blue glow border */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-100/50 via-transparent to-blue-100/30 opacity-60" />
              
              {/* Animated content */}
              <div className="relative h-[56vh] md:h-[60vh]">
                {steps.map((s, i) => (
                  <article
                    key={s.title}
                    className={`absolute inset-0 p-6 md:p-10 transition-all duration-500 ${
                      i === active
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    aria-hidden={i !== active}
                  >
                    <header className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 ring-1 ring-blue-200">
                        <s.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium tracking-tight text-black">
                          {s.panel.heading}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {s.panel.sub}
                        </p>
                      </div>
                    </header>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {s.panel.bullets.map((b) => (
                        <div
                          key={b}
                          className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 backdrop-blur-sm hover:bg-blue-50/50 hover:border-blue-200 transition-all duration-200 group"
                        >
                          <p className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {b}
                          </p>
                        </div>
                      ))}
                    </div>

                    <footer className="mt-8 flex items-center gap-3 text-sm text-gray-600">
                      <div className="flex h-4 w-4 items-center justify-center">
                        <ActiveIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <span>{steps[active].title}</span>
                    </footer>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}