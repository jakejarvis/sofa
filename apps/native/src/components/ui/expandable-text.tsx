import { useLingui } from "@lingui/react/macro";
import { useCallback, useRef, useState } from "react";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";
import { Platform, Pressable, View } from "react-native";
import { Text } from "@/components/ui/text";

export function ExpandableText({
  text,
  maxLines = 3,
  actionColor,
}: {
  text: string;
  maxLines?: number;
  actionColor?: string;
}) {
  const { t } = useLingui();
  const prevTextRef = useRef(text);
  let expanded: boolean;
  let needsTruncation: boolean;
  const [expandedState, setExpanded] = useState(false);
  const [needsTruncationState, setNeedsTruncation] = useState(false);

  if (prevTextRef.current !== text) {
    prevTextRef.current = text;
    setExpanded(false);
    setNeedsTruncation(false);
    expanded = false;
    needsTruncation = false;
  } else {
    expanded = expandedState;
    needsTruncation = needsTruncationState;
  }

  const onMeasureLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      setNeedsTruncation(e.nativeEvent.lines.length > maxLines);
    },
    [maxLines],
  );

  return (
    <View>
      {/* Hidden text without numberOfLines to measure true line count */}
      <Text
        onTextLayout={onMeasureLayout}
        className="pointer-events-none absolute text-sm leading-relaxed opacity-0"
      >
        {text}
      </Text>
      {/* selectable on Android uses EditText internally, which ignores numberOfLines and scrolls instead */}
      <Text
        selectable={Platform.OS === "ios"}
        numberOfLines={expanded ? undefined : maxLines}
        className="text-foreground text-sm leading-relaxed"
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          accessibilityRole="button"
          accessibilityLabel={expanded ? t`Show less` : t`Show more`}
          className="mt-1"
        >
          <Text
            className="font-medium font-sans text-primary text-sm"
            style={actionColor ? { color: actionColor } : undefined}
          >
            {expanded ? t`Show less` : t`Show more`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
