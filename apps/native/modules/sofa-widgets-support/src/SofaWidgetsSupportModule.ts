import { requireNativeModule } from "expo";

type SofaWidgetsSupportModuleType = {
  downloadWidgetImage(url: string, key: string): Promise<string | null>;
  copyBundledAsset(assetUri: string, key: string): Promise<string | null>;
  clearWidgetImages(): Promise<void>;
  pruneWidgetImages(maxAgeSeconds: number): Promise<void>;
};

export default requireNativeModule<SofaWidgetsSupportModuleType>("SofaWidgetsSupport");
