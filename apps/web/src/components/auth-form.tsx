import { Trans } from "@lingui/react/macro";
import { IconKey } from "@tabler/icons-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SofaLogo } from "@/components/sofa-logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, signIn, signUp } from "@/lib/auth/client";

export interface AuthConfig {
  oidcEnabled: boolean;
  oidcProviderName: string | null;
  passwordLoginDisabled: boolean;
  registrationOpen?: boolean;
}

const authInputClass =
  "h-11 rounded-lg border-border/50 bg-background/50 px-4 py-0 placeholder:text-muted-foreground/50 focus-visible:border-primary/40 focus-visible:ring-ring md:text-sm";

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
  const navigate = useNavigate();
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
      void navigate({ to: "/dashboard" });
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
    } finally {
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
          <Link to="/" className="inline-flex justify-center text-primary">
            <SofaLogo className="size-9" />
          </Link>
          <h1 className="text-balance font-medium text-lg">
            {isRegister ? (
              <Trans>Create your account</Trans>
            ) : (
              <Trans>Welcome back</Trans>
            )}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isRegister ? (
              <Trans>Start tracking your watches</Trans>
            ) : (
              <Trans>Sign in to continue</Trans>
            )}
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
            <motion.div variants={fieldVariants}>
              <Button
                type="button"
                variant="outline"
                onClick={handleOidcLogin}
                disabled={oidcLoading}
                className="h-11 w-full gap-2 rounded-lg border-border/50 bg-background/50 text-sm hover:bg-accent hover:text-foreground"
              >
                <IconKey aria-hidden={true} className="size-4" />
                {oidcLoading ? (
                  <Trans>Redirecting…</Trans>
                ) : (
                  <Trans>
                    Sign in with {authConfig?.oidcProviderName || "SSO"}
                  </Trans>
                )}
              </Button>
            </motion.div>
          </motion.div>
        )}

        {showOidc && showPasswordForm && (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-muted-foreground text-xs">
              <Trans>or</Trans>
            </span>
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
                <Label
                  htmlFor="name"
                  className="text-muted-foreground uppercase tracking-wider"
                >
                  <Trans>Name</Trans>
                </Label>
                <Input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={authInputClass}
                  placeholder="Your name…"
                />
              </motion.div>
            )}

            <motion.div variants={fieldVariants} className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-muted-foreground uppercase tracking-wider"
              >
                <Trans>Email</Trans>
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
                placeholder="wwhite@graymatter.biz"
              />
            </motion.div>

            <motion.div variants={fieldVariants} className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-muted-foreground uppercase tracking-wider"
              >
                <Trans>Password</Trans>
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={authInputClass}
                placeholder="Min 8 characters…"
              />
            </motion.div>

            <motion.div variants={fieldVariants}>
              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-lg text-sm hover:shadow-lg hover:shadow-primary/20"
              >
                {loading ? (
                  <Trans>Loading…</Trans>
                ) : isRegister ? (
                  <Trans>Create account</Trans>
                ) : (
                  <Trans>Sign in</Trans>
                )}
              </Button>
            </motion.div>
          </motion.form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Alert variant="destructive" className="bg-destructive/10">
                <AlertDescription className="text-destructive text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {showPasswordForm &&
          (isRegister || authConfig?.registrationOpen !== false) && (
            <p className="text-center text-muted-foreground text-sm">
              {isRegister ? (
                <>
                  <Trans>Already have an account?</Trans>{" "}
                  <Link
                    to="/login"
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <Trans>Sign in</Trans>
                  </Link>
                </>
              ) : (
                <>
                  <Trans>Don&apos;t have an account?</Trans>{" "}
                  <Link
                    to="/register"
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <Trans>Register</Trans>
                  </Link>
                </>
              )}
            </p>
          )}
      </motion.div>
    </div>
  );
}
