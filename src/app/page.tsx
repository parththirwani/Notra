import LandingPage from "../components/landing";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  let session = null;

  try {
    session = await auth();
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes("Invalid Compact JWE") &&
      !error.message.includes("Dynamic server usage")
    ) {
      console.error("Auth error:", error);
    }
  }

  if (session) {
    redirect("/chat");
  }

  return <LandingPage />;
}