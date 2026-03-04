"use client";

import { IconLogout, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/lib/auth/client";

export function AccountSection({
  user,
}: {
  user: { name: string; email: string; createdAt: string; role?: string };
}) {
  const router = useRouter();

  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });
  const initial = user.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <IconUser className="size-4 text-muted-foreground" />
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
      </div>
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-lg text-primary">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle>
              {user.name}
              {user.role === "admin" && (
                <span className="ml-2 inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 align-middle text-[10px] font-medium text-primary">
                  Admin
                </span>
              )}
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <p className="mt-0.5 text-xs text-muted-foreground/60">
              Member since {memberSince}
            </p>
          </div>
          <Button
            variant="destructive"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
          >
            <IconLogout />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
