import { useLingui } from "@lingui/react/macro";

import { TabStack } from "@/components/navigation/tab-stack";

export default function SettingsLayout() {
  const { t } = useLingui();
  return <TabStack title={t`Settings`} />;
}
