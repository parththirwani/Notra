import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section id="cta" className="border-y bg-gray-50/50">
      <div className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          {/* Main CTA heading */}
          <h2 className="mt-4 font-display text-3xl tracking-tight text-black md:text-4xl">
            Ready to study
            <span className="relative mx-2">
              <span className="text-blue-600">smarter?</span>
              <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 opacity-60" />
            </span>
          </h2>
          
          {/* Supporting text */}
          <p className="mt-4 text-gray-600 leading-relaxed">
            Join thousands of STEM students who've transformed their study routine. 
            Create your first subject room and start generating practice materials in under 60 seconds.
          </p>
          
          {/* Value props */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1 w-1 rounded-full bg-blue-600" />
              <span>Setup in 60 seconds</span>
            </div>
          </div>
          
          {/* CTA buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="group bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 px-8"
            >
              Create your first room
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-gray-300 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 px-8"
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;