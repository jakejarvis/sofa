import { useLingui } from "@lingui/react/macro";

import { TabStack } from "@/components/navigation/tab-stack";

export default function SearchLayout() {
  const { t } = useLingui();
  return <TabStack title={t`Search`} />;
}
