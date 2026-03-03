"use client";

import { IconLogout, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
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
        <IconUser size={16} className="text-muted-foreground" />
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
        </CardContent>
        <CardContent className="pt-0">
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 px-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <IconLogout size={14} />
            Sign out
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
