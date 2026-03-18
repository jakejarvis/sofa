import { Image as ExpoImage, type ImageProps } from "expo-image";
import { useResolveClassNames } from "uniwind";

import { resolveUrl } from "@/lib/server";

export function Image({
  source,
  className,
  thumbHash,
  ...props
}: ImageProps & { className?: string; thumbHash?: string | null }) {
  const resolved =
    source && typeof source === "object" && "uri" in source && source.uri
      ? { ...source, uri: resolveUrl(source.uri) ?? undefined }
      : source;

  const style = useResolveClassNames(className ?? "");

  return (
    <ExpoImage
      source={resolved}
      placeholder={thumbHash ? { thumbhash: thumbHash } : undefined}
      style={[style, props.style]}
      {...props}
    />
  );
}
