"use client";

import { useState } from "react";

import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoutModal from "@/components/auth/logoutModal";


const SidebarUserSection = ({ collapsed }: { collapsed: boolean }) => {
  const { data: session, status } = useSession();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  if (status !== "authenticated" || !session.user) {
    return (
      <div className="p-4 border-t border-gray-300 dark:border-gray-700">
        <Button
          onClick={() => signIn("google", { callbackUrl: "/chat" })}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto p-4 border-t border-gray-300 dark:border-gray-700 flex flex-col items-center gap-3">
      {collapsed ? (
        <>
          {/* Collapsed: only avatar + logout icon */}
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name || "User"}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600" />
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            <LogOut size={18} className="text-gray-700 dark:text-gray-300" />
          </button>
        </>
      ) : (
        <>
          <Button
            size="sm"
            className="w-full bg-[#173dfd] text-white hover:bg-blue-600"
            onClick={() => setShowLogoutModal(true)}
          >
            Log out
          </Button>

          <div className="flex items-center gap-3 w-full">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={40}
                height={40}
                className="rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {session.user.email}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Logout modal */}
      <LogoutModal open={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </div>
  );
};

export default SidebarUserSection;
