import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/session";
import { client } from "@/lib/orpc/client";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  const authConfig = await client.system.authConfig({});

  if (authConfig.userCount === 0) {
    redirect("/register");
  }

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
