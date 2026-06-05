"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Brain, Zap, Upload, Play } from "lucide-react";
import { SignInModal } from "@/components/auth/signinModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 25 });
  const [isHoveringDemo, setIsHoveringDemo] = useState(false);
  const { status } = useSession();
  const router = useRouter();

  // Enhanced mouse tracking with smoothing
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number;
    let targetX = 50;
    let targetY = 25;
    let currentX = 50;
    let currentY = 25;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      el.style.setProperty("--cursor-x", `${currentX}%`);
      el.style.setProperty("--cursor-y", `${currentY}%`);

      rafId = requestAnimationFrame(animate);
    };

    el.addEventListener("mousemove", onMove);
    animate();

    return () => {
      el.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  const handleStartStudying = () => {
    if (status === "authenticated") {
      router.push("/chat");
    } else {
      setShowSignInModal(true);
    }
  };

  // Fake demo interaction
  const handleDemoClick = () => {
    setIsHoveringDemo(true);
    setTimeout(() => setIsHoveringDemo(false), 2500);
  };

  return (
    <>
      <section
        ref={ref}
        className="relative overflow-hidden border-b bg-white min-h-[90vh] flex items-center"
      >
        {/* Dynamic background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-indigo-50/20" />
          
          {/* Main cursor-following glow */}
          <div
            className="absolute w-[600px] h-[600px] bg-gradient-to-br from-blue-400/30 to-indigo-500/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
            style={{
              left: 'var(--cursor-x, 50%)',
              top: 'var(--cursor-y, 35%)',
            }}
          />
          
          {/* Secondary accent glow */}
          <div
            className="absolute w-96 h-96 bg-violet-300/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
            style={{
              left: 'var(--cursor-x, 50%)',
              top: 'var(--cursor-y, 35%)',
              transform: 'translate(-30%, -70%)',
              opacity: 0.6,
            }}
          />
        </div>

        <div className="container relative mx-auto px-4 py-20 md:py-28 lg:py-32">
          <div className="mx-auto max-w-5xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 tracking-wider uppercase mb-6">
              <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              Notra — Notes Ultra
            </div>

            {/* Main heading */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-[1.1] tracking-tighter text-black">
              Turn your STEM notes into{" "}
              <span className="relative inline-block text-blue-600">
                intelligent study rooms
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded" />
              </span>
            </h1>

            {/* Subtitle with typing-like highlight */}
            <p className="mt-8 text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Upload notes, PDFs, images — then <span className="font-semibold text-blue-700">chat with them</span>, generate flashcards, practice problems, and complete exams instantly.
            </p>

            {/* Interactive Demo Preview */}
            <div 
              onClick={handleDemoClick}
              onMouseEnter={() => setIsHoveringDemo(true)}
              onMouseLeave={() => setIsHoveringDemo(false)}
              className="mt-12 mx-auto max-w-2xl group relative cursor-pointer"
            >
              <div className="bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden relative">
                {/* Demo header */}
                <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <span>Linear Algebra • Chapter 4</span>
                    <div className="w-px h-3 bg-gray-700" />
                    <span className="text-emerald-400">• Live</span>
                  </div>
                </div>

                {/* Demo content area */}
                <div className="p-8 bg-gradient-to-br from-zinc-50 to-white min-h-[260px] flex flex-col items-center justify-center relative overflow-hidden">
                  {isHoveringDemo ? (
                    <div className="text-center space-y-4 animate-in fade-in">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <Brain className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">AI Study Assistant</p>
                        <p className="text-sm text-gray-500">“Explain eigenvalues with an example”</p>
                      </div>
                      <div className="text-xs bg-white px-4 py-2 rounded-xl border text-left max-w-xs mx-auto">
                        Eigenvalues represent scaling factors... 
                        <span className="text-blue-600 font-medium">Let me show you a visual.</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <Upload className="w-10 h-10 mb-2 transition-transform group-hover:scale-110" />
                        <p className="font-medium">Click to simulate upload + AI chat</p>
                        <p className="text-sm">Watch how Notra turns notes into interactive study</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Demo footer */}
                <div className="border-t px-6 py-4 flex items-center justify-between text-sm text-gray-500 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" /> 12 flashcards
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Play className="w-4 h-4 text-blue-500" /> 3 practice sets
                    </div>
                  </div>
                  <span className="text-blue-600 font-medium group-hover:underline">Try it →</span>
                </div>
              </div>

              {/* Hover glow ring */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-[2.5rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
            </div>

            {/* Feature highlights */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                { icon: BookOpen, label: "Any format", desc: "PDFs, images, handwritten" },
                { icon: Brain, label: "Smart Chat", desc: "Talk to your notes" },
                { icon: Zap, label: "Instant Exams", desc: "Custom practice & tests" },
              ].map((feature, i) => (
                <div 
                  key={i}
                  className="group p-6 bg-white border border-gray-100 hover:border-blue-200 rounded-2xl transition-all hover:shadow-md hover:-translate-y-1"
                >
                  <feature.icon className="w-9 h-9 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold mb-1">{feature.label}</div>
                  <p className="text-sm text-gray-500">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={handleStartStudying}
                disabled={status === "loading"}
                className="group bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-600/40 transition-all duration-300 text-lg px-10 py-7 rounded-2xl"
              >
                {status === "loading" 
                  ? "Loading..." 
                  : status === "authenticated" 
                    ? "Continue to Chat" 
                    : "Start studying for free"}
                <ArrowRight className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <a href="#how-it-works" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 text-gray-700 transition-all text-lg px-10 py-7 rounded-2xl"
                >
                  See how it works
                </Button>
              </a>
            </div>

            <p className="mt-6 text-xs text-gray-500">No credit card required • Free tier available</p>
          </div>
        </div>
      </section>

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </>
  );
};

export default Hero;
