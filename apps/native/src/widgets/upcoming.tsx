import { HStack, Image, Rectangle, Text, VStack, ZStack } from "@expo/ui/swift-ui";
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
  resizable,
  widgetAccentedRenderingMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";

export type UpcomingProps = {
  titleId: string;
  titleName: string;
  imageFilePath: string;
  iconFilePath: string;
  /** Localized "Today", "Tomorrow" or a short date. */
  dateLabel: string;
  /** Localized "S2 E3", "S2 · 8 episodes", "Movie" or "TV". */
  episodeLabel: string;
  /** Localized empty-state text, shown when `titleName` is empty. */
  emptyLabel: string;
};

const UpcomingWidget = (props: UpcomingProps, _env: WidgetEnvironment) => {
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
          {props.emptyLabel}
        </Text>
      </VStack>
    );
  }

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
        <HStack spacing={4}>
          <Text
            modifiers={[
              font({ weight: "medium", size: 11 }),
              foregroundStyle("#e4a532"),
              lineLimit(1),
            ]}
          >
            {props.dateLabel}
          </Text>
          <Text
            modifiers={[font({ size: 11 }), foregroundStyle("rgba(255,255,255,0.5)"), lineLimit(1)]}
          >
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
