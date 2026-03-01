"use client";

import {
  IconLogout,
  IconSettings,
  IconShieldLock,
  IconUser,
  IconUserPlus,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { signOut, useSession } from "@/lib/auth/client";

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 24 },
  },
};

export default function SettingsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [toggling, setToggling] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setRegistrationOpen(data.registrationOpen);
      }
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (session.user.role === "admin") {
      fetchSettings();
    } else {
      setLoadingSettings(false);
    }
  }, [session, isPending, router, fetchSettings]);

  async function handleToggleRegistration(checked: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationOpen: checked }),
      });
      if (res.ok) {
        setRegistrationOpen(checked);
      }
    } finally {
      setToggling(false);
    }
  }

  if (isPending || loadingSettings) {
    return <div className="min-h-[60vh]" />;
  }

  if (!session?.user) return null;

  const memberSince = new Date(session.user.createdAt).toLocaleDateString(
    undefined,
    { year: "numeric", month: "long" },
  );
  const initial = session.user.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <motion.div
      className="mx-auto max-w-2xl space-y-8"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.15 } },
      }}
    >
      <motion.div variants={sectionVariants}>
        <div className="flex items-center gap-2">
          <IconSettings size={20} className="text-primary" />
          <h1 className="font-display text-3xl tracking-tight">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Account section */}
      <motion.div variants={sectionVariants}>
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
              <CardTitle>{session.user.name}</CardTitle>
              <CardDescription>{session.user.email}</CardDescription>
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
      </motion.div>

      {/* Administration section — admin only */}
      {isAdmin && (
        <motion.div variants={sectionVariants}>
          <div className="mb-3 flex items-center gap-2">
            <IconShieldLock size={16} className="text-muted-foreground" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Administration
            </h2>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Admin
            </span>
          </div>
          <Card className="border-l-2 border-l-primary/30">
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <IconUserPlus size={16} className="text-primary" />
                  </div>
                  <div>
                    <CardTitle>Open registration</CardTitle>
                    <CardDescription>
                      Allow new users to create accounts. Useful for adding
                      household members.
                    </CardDescription>
                  </div>
                </div>
                <Switch
                  checked={registrationOpen}
                  onCheckedChange={handleToggleRegistration}
                  disabled={toggling}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
