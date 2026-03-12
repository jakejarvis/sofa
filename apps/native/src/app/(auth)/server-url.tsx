import { useRouter } from "expo-router";
import { ServerUrlForm } from "@/components/server-url-form";
import { setServerUrl } from "@/lib/server-url";

export default function AuthServerUrlScreen() {
  const { replace } = useRouter();

  return (
    <ServerUrlForm
      onConnected={(url) => {
        setServerUrl(url);
        replace("/(auth)/login");
      }}
    />
  );
}
