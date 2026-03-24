import { HStack, Image, Spacer, Text, VStack, ZStack } from "@expo/ui/swift-ui";
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
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

  if (!props.titleName) {
    return (
      <VStack
        modifiers={[
          frame({ width: 155, height: 155 }),
          background("#101010"),
          padding({ all: 16 }),
        ]}
      >
        {props.iconFilePath ? (
          <Image
            uiImage={props.iconFilePath}
            modifiers={[frame({ width: 40, height: 40 }), cornerRadius(8)]}
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

  const progress = props.totalEpisodes > 0 ? props.watchedEpisodes / props.totalEpisodes : 0;
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
      modifiers={[frame({ width: 155, height: 155 }), widgetURL(`sofa://title/${props.titleId}`)]}
    >
      {/* Background image or dark fallback */}
      {props.imageFilePath ? (
        <Image uiImage={props.imageFilePath} modifiers={[frame({ width: 155, height: 155 })]} />
      ) : (
        <Spacer modifiers={[frame({ width: 155, height: 155 }), background("#1a1a1a")]} />
      )}

      {/* Dark overlay for text readability */}
      <Spacer modifiers={[frame({ width: 155, height: 155 }), background("rgba(0,0,0,0.45)")]} />

      {/* Text overlay at bottom */}
      <VStack
        alignment="leading"
        spacing={2}
        modifiers={[padding({ all: 12 }), frame({ width: 155 })]}
      >
        {episodeLabel && (
          <HStack spacing={4}>
            <Text
              modifiers={[
                font({ weight: "medium", size: 11 }),
                foregroundStyle("rgba(255,255,255,0.7)"),
              ]}
            >
              {episodeLabel}
            </Text>
            {progressLabel && (
              <Text modifiers={[font({ size: 11 }), foregroundStyle("rgba(255,255,255,0.5)")]}>
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
          <ZStack modifiers={[frame({ width: 131, height: 3 }), padding({ top: 2 })]}>
            <Spacer
              modifiers={[
                frame({ width: 131, height: 3 }),
                cornerRadius(1.5),
                background("rgba(255,255,255,0.15)"),
              ]}
            />
            <Spacer
              modifiers={[
                frame({ width: Math.max(3, Math.round(131 * progress)), height: 3 }),
                cornerRadius(1.5),
                background("#3b82f6"),
              ]}
            />
          </ZStack>
        )}
      </VStack>
    </ZStack>
  );
};

export default createWidget("ContinueWatching", ContinueWatchingWidget);
