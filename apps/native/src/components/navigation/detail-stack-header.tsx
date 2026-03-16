import { Stack } from "expo-router";

export function DetailStackHeader({ title }: { title?: string }) {
  return (
    <>
      <Stack.Header transparent blurEffect="none" style={{ color: "white" }} />
      <Stack.Screen.BackButton
        displayMode="minimal"
        withMenu={process.env.EXPO_OS === "ios"}
      />
      {title ? <Stack.Screen.Title>{title}</Stack.Screen.Title> : null}
    </>
  );
}
