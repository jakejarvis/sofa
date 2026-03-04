import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { auth } from "@/lib/auth/server";
import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";
import { getUserCount, isRegistrationOpen } from "@/lib/services/settings";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");

  if (getUserCount() === 0) {
    redirect("/register");
  }

  const oidcEnabled = isOidcConfigured();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <AuthForm
        mode="login"
        authConfig={{
          oidcEnabled,
          oidcProviderName: oidcEnabled ? getOidcProviderName() : null,
          passwordLoginDisabled: isPasswordLoginDisabled(),
          registrationOpen: isRegistrationOpen(),
        }}
      />
    </div>
  );
}
