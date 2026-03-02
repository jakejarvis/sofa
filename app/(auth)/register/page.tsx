"use client";

import { IconLock } from "@tabler/icons-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    fetch("/api/registration/status")
      .then((res) => res.json())
      .then((data) => setRegistrationOpen(data.registrationOpen))
      .catch(() => setRegistrationOpen(false));
  }, []);

  if (registrationOpen === null) {
    return <div className="flex min-h-[80vh] items-center justify-center" />;
  }

  if (!registrationOpen) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-2xl bg-primary/3 blur-2xl" />
          <motion.div
            className="relative space-y-6 rounded-xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur-sm"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: "spring" as const,
              stiffness: 200,
              damping: 20,
            }}
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconLock size={24} className="text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-xl tracking-tight">
                Registration Closed
              </h1>
              <p className="text-sm text-muted-foreground">
                New accounts are not being accepted right now. Contact the admin
                if you need access.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-all hover:shadow-md hover:shadow-primary/20"
            >
              Sign in instead
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <AuthForm mode="register" />
    </div>
  );
}
