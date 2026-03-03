import { AuthForm } from "@/components/auth-form";
import {
  getOidcProviderName,
  isOidcConfigured,
  isPasswordLoginDisabled,
} from "@/lib/config";

export default function LoginPage() {
  const oidcEnabled = isOidcConfigured();

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <AuthForm
        mode="login"
        authConfig={{
          oidcEnabled,
          oidcProviderName: oidcEnabled ? getOidcProviderName() : null,
          passwordLoginDisabled: isPasswordLoginDisabled(),
        }}
      />
    </div>
  );
}
