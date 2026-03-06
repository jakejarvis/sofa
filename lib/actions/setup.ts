"use server";

import { isTmdbConfigured } from "@/lib/config";

export async function checkTmdbConfigured() {
  return isTmdbConfigured();
}
