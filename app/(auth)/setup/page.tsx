import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isTmdbConfigured } from "@/lib/config";
import { SetupForm } from "./_components/setup-form";

export default function SetupPage() {
  return <SetupContent />;
}

async function SetupContent() {
  await connection();
  if (isTmdbConfigured()) redirect("/");
  return <SetupForm />;
}
