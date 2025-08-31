"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface SidebarHeaderProps {
  onNewSubject: () => void;
  onCollapse: () => void;
  collapsed: boolean;
}

const SidebarHeader = ({ onNewSubject, onCollapse, collapsed }: SidebarHeaderProps) => {
  return (
    <div className="p-4 border-b border-gray-300 dark:border-gray-700">
      {/* First row: Logo and Collapse button */}
      <div className="flex items-center justify-between mb-3">
        {/* Logo */}
        <div className="relative group w-10 h-10">
          <Image
            src="/small-logo.png"
            alt="App Logo"
            fill
            className={`object-contain transition-opacity duration-200 ${
              collapsed ? "opacity-100 group-hover:opacity-0" : "opacity-100"
            }`}
          />
          {collapsed && (
            <button
              onClick={onCollapse}
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gray-200 dark:bg-gray-700 rounded-full"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Collapse button (visible when expanded) */}
        {!collapsed && (
          <button
            onClick={onCollapse}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Second row: New Chat button (only when expanded) */}
      {!collapsed && (
        <Button
          onClick={onNewSubject}
          className="w-full justify-start gap-3 bg-[#173dfd] text-white hover:bg-blue-600"
        >
          <Plus size={18} />
          New Chat
        </Button>
      )}
    </div>
  );
};

export default SidebarHeader;