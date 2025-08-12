import NextAuth, { DefaultSession } from "next-auth";

// Extend Session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string; // <-- Add id here
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}
