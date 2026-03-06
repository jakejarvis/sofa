import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import { SetupForm } from "./_components/setup-form";

export default async function SetupPage() {
  await connection();
  if (isTmdbConfigured()) redirect("/");
  return <SetupForm />;
}
