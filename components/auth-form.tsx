"use client";

import { IconKey } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SofaLogo } from "@/components/sofa-logo";
import { authClient, signIn, signUp } from "@/lib/auth/client";

export interface AuthConfig {
  oidcEnabled: boolean;
  oidcProviderName: string | null;
  passwordLoginDisabled: boolean;
  registrationOpen?: boolean;
}

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function AuthForm({
  mode,
  authConfig,
}: {
  mode: "login" | "register";
  authConfig?: AuthConfig;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);

  const isRegister = mode === "register";
  const showOidc = authConfig?.oidcEnabled ?? false;
  const showPasswordForm = !(authConfig?.passwordLoginDisabled ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const result = await signUp.email({ name, email, password });
        if (result.error) {
          setError(result.error.message ?? "Registration failed");
          return;
        }
      } else {
        const result = await signIn.email({ email, password });
        if (result.error) {
          setError(result.error.message ?? "Login failed");
          return;
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleOidcLogin() {
    setError("");
    setOidcLoading(true);
    try {
      await authClient.signIn.oauth2({
        providerId: "oidc",
        callbackURL: "/dashboard",
      });
    } catch {
      setError("Failed to start SSO login");
      setOidcLoading(false);
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Subtle glow behind card */}
      <div className="absolute -inset-4 rounded-2xl bg-primary/3 blur-2xl" />

      <motion.div
        className="relative space-y-8 rounded-xl border border-border/50 bg-card/80 p-8 backdrop-blur-sm"
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
      >
        <div className="space-y-2 text-center">
          <Link href="/" className="inline-flex justify-center text-primary">
            <SofaLogo className="size-9" />
          </Link>
          <h1 className="text-lg font-medium text-balance">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Start tracking your watches" : "Sign in to continue"}
          </p>
        </div>

        {showOidc && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            <motion.button
              type="button"
              onClick={handleOidcLogin}
              disabled={oidcLoading}
              variants={fieldVariants}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-background/50 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            >
              <IconKey aria-hidden={true} className="size-4" />
              {oidcLoading
                ? "Redirecting\u2026"
                : `Sign in with ${authConfig?.oidcProviderName || "SSO"}`}
            </motion.button>
          </motion.div>
        )}

        {showOidc && showPasswordForm && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>
        )}

        {showPasswordForm && (
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {isRegister && (
              <motion.div variants={fieldVariants} className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                >
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Your name\u2026"
                />
              </motion.div>
            )}

            <motion.div variants={fieldVariants} className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="wwhite@graymatter.biz"
              />
            </motion.div>

            <motion.div variants={fieldVariants} className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Min 8 characters\u2026"
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              variants={fieldVariants}
              whileTap={{ scale: 0.98 }}
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground transition-shadow hover:shadow-lg hover:shadow-primary/20 disabled:pointer-events-none disabled:opacity-50"
            >
              {loading
                ? "Loading\u2026"
                : isRegister
                  ? "Create account"
                  : "Sign in"}
            </motion.button>
          </motion.form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {showPasswordForm &&
          (isRegister || authConfig?.registrationOpen !== false) && (
            <p className="text-center text-sm text-muted-foreground">
              {isRegister ? (
                <>
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Sign in
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Register
                  </Link>
                </>
              )}
            </p>
          )}
      </motion.div>
    </div>
  );
}
