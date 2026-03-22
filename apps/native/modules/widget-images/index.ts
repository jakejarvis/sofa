import { Platform } from "react-native";

function getModule() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./src/WidgetImagesModule").default;
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
