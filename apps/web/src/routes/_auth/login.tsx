import { createFileRoute, redirect } from "@tanstack/react-router";

import { AuthForm } from "@/components/auth-form";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/_auth/login")({
  beforeLoad: async () => {
    const publicInfo = await client.system.publicInfo({});
    if (publicInfo.userCount === 0) throw redirect({ to: "/register" });

    return { publicInfo };
  },
  head: () => ({ meta: [{ title: "Sign in — Sofa" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { publicInfo } = Route.useRouteContext();
  return (
    <AuthForm
      mode="login"
      authConfig={{
        oidcEnabled: publicInfo.oidcEnabled,
        oidcProviderName: publicInfo.oidcProviderName,
        passwordLoginDisabled: publicInfo.passwordLoginDisabled,
        registrationOpen: publicInfo.registrationOpen,
      }}
    />
  );
}
