import { Image as ExpoImage, type ImageProps } from "expo-image";
import { useResolveClassNames } from "uniwind";
import { resolveUrl } from "@/lib/server-url";

export function Image({
  source,
  className,
  ...props
}: ImageProps & { className?: string }) {
  const resolved =
    source && typeof source === "object" && "uri" in source && source.uri
      ? { ...source, uri: resolveUrl(source.uri) ?? undefined }
      : source;

  const style = useResolveClassNames(className ?? "");

  return (
    <ExpoImage source={resolved} style={[style, props.style]} {...props} />
  );
}
