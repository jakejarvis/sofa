import { redirect } from "next/navigation";
import { isTmdbConfigured } from "@/lib/config";
import { SetupForm } from "./_components/setup-form";

export default function SetupPage() {
  if (isTmdbConfigured()) redirect("/");
  return <SetupForm />;
}
