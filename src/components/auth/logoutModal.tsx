"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { signOut } from "next-auth/react";

interface LogoutModalProps {
  open: boolean;
  onClose: () => void;
}

const LogoutModal = ({ open, onClose }: LogoutModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Logout</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Are you sure you want to log out?
        </p>
        <DialogFooter className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-[#173dfd] text-white hover:bg-blue-600"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LogoutModal;
