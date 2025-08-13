import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { ArrowRight, BookOpen, Brain, Zap } from "lucide-react";

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--cursor-x", `${x}px`);
      el.style.setProperty("--cursor-y", `${y}px`);
    };

    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={ref}
      className="relative overflow-hidden border-b bg-white"
    >
      {/* Subtle blue glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-transparent" />
        <div
          className="absolute top-1/4 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"
          style={{
            left: 'var(--cursor-x, 50%)',
            top: 'var(--cursor-y, 25%)',
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease-out'
          }}
        />

      </div>

      <div className="container relative mx-auto px-4 py-24 md:py-28 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 tracking-wider uppercase">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Notra — Note Ultra
          </div>

          {/* Main heading - one line */}
          <h1 className="mt-6 font-display text-4xl leading-tight tracking-tight text-black md:text-5xl lg:text-6xl">
            Transform STEM notes into <span className="relative"><span className="text-blue-600">smart study sessions</span><div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 opacity-60" /></span>
          </h1>

          {/* Subtitle - two lines */}
          <p className="mt-6 text-lg text-gray-600 md:text-xl max-w-2xl mx-auto leading-relaxed">
            Create AI study rooms for any STEM subject. Upload materials, chat with notes, and generate flashcards, practice problems, and full exams.
          </p>

          {/* Feature highlights */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Upload any format</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-600" />
              <span>AI-powered chat</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span>Instant exam generation</span>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="group bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 px-8"
            >
              Start studying for free
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <a href="#how-it-works">
              <Button
                size="lg"
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 px-8"
              >
                See how it works
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;