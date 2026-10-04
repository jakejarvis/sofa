import { HStack, Image, ProgressView, Rectangle, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  aspectRatio,
  clipped,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  progressViewStyle,
  resizable,
  tint,
  widgetAccentedRenderingMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type ContinueWatchingProps = {
  titleId: string;
  titleName: string;
  imageFilePath: string;
  iconFilePath: string;
  seasonNumber?: number;
  episodeNumber?: number;
  watchedEpisodes: number;
  totalEpisodes: number;
  isMovie: boolean;
};

const ContinueWatchingWidget = (props: ContinueWatchingProps, _env: WidgetEnvironment) => {
  "widget";

  // This function is serialized and run inside the widget extension's own JS runtime, so
  // everything it uses must be defined in here.
  const fill = { minWidth: 0, maxWidth: Infinity, minHeight: 0, maxHeight: Infinity };

  if (!props.titleName) {
    return (
      <VStack spacing={8} modifiers={[frame(fill), containerBackground("#101010", "widget")]}>
        {props.iconFilePath ? (
          <Image
            uiImage={props.iconFilePath}
            modifiers={[resizable(), frame({ width: 40, height: 40 }), cornerRadius(8)]}
          />
        ) : (
          <Image systemName="play.tv" color="#FFFFFF" size={40} />
        )}
        <Text
          modifiers={[
            font({ weight: "medium", size: 13 }),
            foregroundStyle("rgba(255,255,255,0.7)"),
          ]}
        >
          Nothing to watch
        </Text>
      </VStack>
    );
  }

  const progress = Math.min(
    1,
    Math.max(0, props.totalEpisodes > 0 ? props.watchedEpisodes / props.totalEpisodes : 0),
  );
  const episodeLabel =
    !props.isMovie && props.seasonNumber != null
      ? `S${props.seasonNumber} · E${props.episodeNumber}`
      : null;
  const progressLabel =
    !props.isMovie && props.totalEpisodes > 0
      ? `${props.watchedEpisodes} of ${props.totalEpisodes}`
      : null;

  return (
    <ZStack
      alignment="bottomLeading"
      modifiers={[
        frame(fill),
        containerBackground("#101010", "widget"),
        widgetURL(`sofa://title/${props.titleId}`),
      ]}
    >
      {/* Full-bleed artwork; the container background shows through when there is none */}
      {props.imageFilePath ? (
        <Image
          uiImage={props.imageFilePath}
          modifiers={[
            resizable(),
            widgetAccentedRenderingMode("desaturated"),
            aspectRatio({ contentMode: "fill" }),
            frame(fill),
            clipped(),
          ]}
        />
      ) : null}

      {/* Gradient scrim for text readability */}
      <Rectangle
        modifiers={[
          foregroundStyle({
            type: "linearGradient",
            colors: ["rgba(0,0,0,0)", "rgba(0,0,0,0.85)"],
            startPoint: { x: 0.5, y: 0.2 },
            endPoint: { x: 0.5, y: 1 },
          }),
        ]}
      />

      {/* Text overlay at bottom */}
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[frame({ maxWidth: Infinity, alignment: "leading" }), padding({ all: 14 })]}
      >
        {episodeLabel && (
          <HStack spacing={4}>
            <Text
              modifiers={[
                font({ weight: "medium", size: 11 }),
                foregroundStyle("rgba(255,255,255,0.7)"),
                lineLimit(1),
              ]}
            >
              {episodeLabel}
            </Text>
            {progressLabel && (
              <Text
                modifiers={[
                  font({ size: 11 }),
                  foregroundStyle("rgba(255,255,255,0.5)"),
                  lineLimit(1),
                ]}
              >
                {progressLabel}
              </Text>
            )}
          </HStack>
        )}
        <Text
          modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle("#FFFFFF"), lineLimit(2)]}
        >
          {props.titleName}
        </Text>
        {/* Progress bar for TV shows */}
        {!props.isMovie && props.totalEpisodes > 0 && (
          <ProgressView
            value={progress}
            modifiers={[progressViewStyle("linear"), tint("#3b82f6"), padding({ top: 4 })]}
          />
        )}
      </VStack>
    </ZStack>
  );
};

export default createWidget("ContinueWatching", ContinueWatchingWidget);
