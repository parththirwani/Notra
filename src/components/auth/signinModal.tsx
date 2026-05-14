"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";

interface SignInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInModal({ open, onOpenChange }: SignInModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md rounded-2xl shadow-lg border border-gray-200"
        style={{
          backgroundColor: "#ffffff",
          color: "#111827",
          colorScheme: "light",
        }}
      >
        <DialogHeader className="flex flex-col items-center gap-2">
          <div className="relative h-36 w-28">
            <Image
              src="/big-logo.png"
              alt="Notra Logo"
              fill
              className="object-contain"
            />
          </div>
          <DialogTitle className="text-center text-xl font-semibold" style={{ color: "#111827" }}>
            Welcome back
          </DialogTitle>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            Sign in to continue with Notra
          </p>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#ffffff",
              color: "#111827",
              borderColor: "#d1d5db",
            }}
            onClick={() => signIn("google", { callbackUrl: "/chat" })}
          >
            <FcGoogle size={20} />
            Continue with Google
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}