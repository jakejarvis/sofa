"use client";

import { IconLogout, IconUser } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
        <IconUser aria-hidden={true} className="size-4 text-muted-foreground" />
        <h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
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
                <Badge className="ml-2 rounded-md border-0 bg-primary/10 align-middle text-primary">
                  Admin
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
            <p className="mt-0.5 text-muted-foreground/60 text-xs">
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
            <IconLogout aria-hidden={true} />
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
