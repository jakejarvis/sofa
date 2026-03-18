import { useLingui } from "@lingui/react/macro";
import { Stack, useRouter } from "expo-router";
import { View } from "react-native";

export function ModalStackHeader() {
  const { dismissAll } = useRouter();
  const { t } = useLingui();
  return (
    <>
      <Stack.Header transparent blurEffect="none" />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={() => dismissAll()}>
          <Stack.Toolbar.Icon sf="xmark" />
          <Stack.Toolbar.Label>{t`Close`}</Stack.Toolbar.Label>
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Screen.Title asChild>
        <View />
      </Stack.Screen.Title>
    </>
  );
}
