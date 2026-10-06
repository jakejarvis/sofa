import { useLingui } from "@lingui/react/macro";
import { Pressable, View } from "react-native";

import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";

export function LoadMoreFooter({
  isFetchingNextPage,
  isFetchNextPageError,
  onRetry,
}: {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onRetry: () => void;
}) {
  const { t } = useLingui();

  if (isFetchingNextPage) {
    return (
      <View className="items-center py-4">
        <Spinner />
      </View>
    );
  }
  if (isFetchNextPageError) {
    return (
      <View className="flex-row items-center justify-center gap-3 py-4">
        <Text className="text-muted-foreground text-sm">{t`Couldn't load more`}</Text>
        <Pressable onPress={onRetry}>
          <Text className="text-primary font-sans text-sm font-medium">{t`Retry`}</Text>
        </Pressable>
      </View>
    );
  }
  return null;
}
