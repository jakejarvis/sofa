"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SofaLogo } from "@/components/sofa-logo";
import { signIn, signUp } from "@/lib/auth/client";

const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

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
            <SofaLogo size={36} />
          </Link>
          <h1 className="text-lg font-medium">
            {isRegister ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Start tracking your watches" : "Sign in to continue"}
          </p>
        </div>

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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
                placeholder="Your name"
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-11 w-full rounded-lg border border-border/50 bg-background/50 px-4 text-sm transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              placeholder="Min 8 characters"
            />
          </motion.div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={loading}
            variants={fieldVariants}
            whileTap={{ scale: 0.98 }}
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground transition-all hover:shadow-lg hover:shadow-primary/20 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Loading..." : isRegister ? "Create account" : "Sign in"}
          </motion.button>
        </motion.form>

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
      </motion.div>
    </div>
  );
}
