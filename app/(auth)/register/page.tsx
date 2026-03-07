import { IconLock } from "@tabler/icons-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth/server";
import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";
import { isRegistrationOpen } from "@/lib/services/settings";

export default async function RegisterPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  if (!isRegistrationOpen()) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="relative mx-auto w-full max-w-sm">
          <div className="absolute -inset-4 rounded-2xl bg-primary/3 blur-2xl" />
          <div className="relative space-y-6 rounded-xl border border-border/50 bg-card/80 p-8 text-center backdrop-blur-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <IconLock aria-hidden={true} className="size-6 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-balance font-display text-xl tracking-tight">
                Registration Closed
              </h1>
              <p className="text-muted-foreground text-sm">
                New accounts are not being accepted right now. Contact the admin
                if you need access.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-lg bg-primary px-6 font-medium text-primary-foreground text-sm transition-all hover:shadow-md hover:shadow-primary/20"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const oidcEnabled = isOidcConfigured();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <AuthForm
        mode="register"
        authConfig={{
          oidcEnabled,
          oidcProviderName: oidcEnabled ? getOidcProviderName() : null,
          passwordLoginDisabled: isPasswordLoginDisabled(),
        }}
      />
    </div>
  );
}
