import { useQuery } from "@tanstack/react-query";

import { NativeTabBar } from "@/components/navigation/native-tab-bar";
import { orpc } from "@/lib/orpc";
import { authClient } from "@/lib/server";

export const unstable_settings = {
  initialRouteName: "(home)",
};

export default function TabLayout() {
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === "admin";

  const updateCheck = useQuery({
    ...orpc.admin.updateCheck.queryOptions(),
    enabled: isAdmin,
    staleTime: 10 * 60 * 1000,
  });

  const showSettingsBadge = !!updateCheck.data?.updateCheck?.updateAvailable;

  return <NativeTabBar showSettingsBadge={showSettingsBadge} />;
}
