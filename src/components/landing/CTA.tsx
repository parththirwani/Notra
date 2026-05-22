"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { SignInModal } from "@/components/auth/signinModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const CTA = () => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const { status } = useSession();
  const router = useRouter();

  const handlePrimaryAction = () => {
    if (status === "authenticated") {
      router.push("/chat");
    } else {
      setShowSignInModal(true);
    }
  };

  const handleSecondaryAction = () => {
    if (status === "authenticated") {
      router.push("/dashboard"); // Changed to /dashboard for clarity
    } else {
      setShowSignInModal(true);
    }
  };

  const isLoading = status === "loading";

  return (
    <>
      <section id="cta" className="relative border-y bg-gradient-to-b from-gray-50 to-white overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />

        <div className="container mx-auto px-4 py-20 md:py-24 relative">
          <div className="mx-auto max-w-2xl text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 mb-6">
              <Sparkles className="h-4 w-4" />
              Now in Beta
            </div>

            {/* Main Heading */}
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tighter text-black leading-[1.1]">
              Study{" "}
              <span className="relative inline-block">
                smarter
                <div className="absolute -bottom-1 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 rounded opacity-75" />
              </span>
              , not harder
            </h2>

            {/* Supporting text */}
            <p className="mt-6 text-lg text-gray-600 max-w-lg mx-auto leading-relaxed">
              Join thousands of STEM students creating personalized practice materials, 
              solving doubts instantly, and mastering concepts faster.
            </p>

            {/* Trust signals */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>No credit card needed</span>
              </div>
              <div>Free forever plan</div>
              <div>Setup in &lt; 60 seconds</div>
            </div>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={handlePrimaryAction}
                disabled={isLoading}
                className="group relative h-14 px-8 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 rounded-xl"
              >
                {isLoading ? (
                  "Loading..."
                ) : status === "authenticated" ? (
                  "Go to Chat"
                ) : (
                  "Create your first room"
                )}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={handleSecondaryAction}
                disabled={isLoading}
                className="h-14 px-8 text-base font-medium border-2 hover:bg-gray-50 transition-colors rounded-xl"
              >
                {status === "authenticated" ? "Go to Dashboard" : "Sign in"}
              </Button>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              14-day free access to all features • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <SignInModal open={showSignInModal} onOpenChange={setShowSignInModal} />
    </>
  );
};

export default CTA;
