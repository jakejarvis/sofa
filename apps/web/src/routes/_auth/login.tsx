import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthForm } from "@/components/auth-form";
import { authClient } from "@/lib/auth/client";
import { client } from "@/lib/orpc/client";

export const Route = createFileRoute("/_auth/login")({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (session) throw redirect({ to: "/dashboard" });

    const authConfig = await client.system.authConfig({});
    if (authConfig.userCount === 0) throw redirect({ to: "/register" });

    return { authConfig };
  },
  component: LoginPage,
});

function LoginPage() {
  const { authConfig } = Route.useRouteContext();
  return (
    <AuthForm
      mode="login"
      authConfig={{
        oidcEnabled: authConfig.oidcEnabled,
        oidcProviderName: authConfig.oidcProviderName,
        passwordLoginDisabled: authConfig.passwordLoginDisabled,
        registrationOpen: authConfig.registrationOpen,
      }}
    />
  );
}
