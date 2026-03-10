import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/auth/session";
import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";
import { getUserCount, isRegistrationOpen } from "@/lib/services/settings";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  if (getUserCount() === 0) {
    redirect("/register");
  }

  const oidcEnabled = isOidcConfigured();

  return (
    <AuthForm
      mode="login"
      authConfig={{
        oidcEnabled,
        oidcProviderName: oidcEnabled ? getOidcProviderName() : null,
        passwordLoginDisabled: isPasswordLoginDisabled(),
        registrationOpen: isRegistrationOpen(),
      }}
    />
  );
}
