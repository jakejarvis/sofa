import { useRouter } from "expo-router";
import { ServerUrlForm } from "@/components/server-url-form";
import { authClient } from "@/lib/auth-client";
import { setServerUrl } from "@/lib/server-url";

export default function ChangeServerUrlScreen() {
  const { back } = useRouter();
  const { data: session } = authClient.useSession();

  return (
    <ServerUrlForm
      onConnected={async (url) => {
        if (session) {
          await authClient.signOut().catch(() => {});
        }
        setServerUrl(url);
        if (!session) {
          back();
        }
      }}
    />
  );
}
