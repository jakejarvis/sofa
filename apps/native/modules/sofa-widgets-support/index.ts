import { Platform } from "react-native";

function getModule() {
  return require("./src/SofaWidgetsSupportModule").default;
}

export async function downloadWidgetImage(url: string, key: string): Promise<string | null> {
  if (Platform.OS !== "ios") return null;
  return getModule().downloadWidgetImage(url, key);
}

export async function copyBundledAsset(assetName: string, key: string): Promise<string | null> {
  if (Platform.OS !== "ios") return null;
  return getModule().copyBundledAsset(assetName, key);
}

export async function clearWidgetImages(): Promise<void> {
  if (Platform.OS !== "ios") return;
  return getModule().clearWidgetImages();
}
