import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { serverClient } from "@/lib/orpc/client.server";
import { PersonDetailClient } from "./_components/person-detail-client";

const getCachedPerson = cache((id: string) =>
  serverClient.people.detail({ id }),
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const { person } = await getCachedPerson(id);
    return {
      title: `${person.name} — Sofa`,
      description: person.biography?.slice(0, 160),
    };
  } catch {
    return { title: "Not Found — Sofa" };
  }
}

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const data = await getCachedPerson(id);
    return <PersonDetailClient id={id} initialData={data} />;
  } catch {
    notFound();
  }
}
