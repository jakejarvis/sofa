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

export type UpcomingProps = {
  titleId: string;
  titleName: string;
  imageFilePath: string;
  iconFilePath: string;
  titleType: "movie" | "tv";
  seasonNumber?: number;
  episodeNumber?: number;
  episodeCount: number;
  dateLabel: string;
  episodeLabel: string;
};

const UpcomingWidget = (props: UpcomingProps, _env: WidgetEnvironment) => {
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
          Nothing upcoming
        </Text>
      </VStack>
    );
  }

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
        <HStack spacing={4}>
          <Text modifiers={[font({ weight: "medium", size: 11 }), foregroundStyle("#e4a532")]}>
            {props.dateLabel}
          </Text>
          <Text modifiers={[font({ size: 11 }), foregroundStyle("rgba(255,255,255,0.5)")]}>
            · {props.episodeLabel}
          </Text>
        </HStack>
        <Text
          modifiers={[font({ weight: "bold", size: 15 }), foregroundStyle("#FFFFFF"), lineLimit(2)]}
        >
          {props.titleName}
        </Text>
      </VStack>
    </ZStack>
  );
};

export default createWidget("Upcoming", UpcomingWidget);
