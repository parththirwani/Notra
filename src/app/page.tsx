import LandingPage from "../components/landing";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  let session = null;
    session = await auth();
  
  if (session) {
    redirect("/chat");
  }
  
  return <LandingPage />;
}