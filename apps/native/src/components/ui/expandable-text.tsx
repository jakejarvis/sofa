import { useCallback, useRef, useState } from "react";
import type { NativeSyntheticEvent, TextLayoutEventData } from "react-native";
import { Pressable, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";

export function ExpandableText({
  text,
  maxLines = 3,
}: {
  text: string;
  maxLines?: number;
}) {
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

  const onTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      setNeedsTruncation(e.nativeEvent.lines.length > maxLines);
    },
    [maxLines],
  );

  return (
    <View>
      <Text
        selectable
        numberOfLines={expanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
        style={{
          fontSize: 14,
          lineHeight: 22,
          color: colors.foreground,
        }}
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable onPress={() => setExpanded(!expanded)} className="mt-1">
          <Text
            style={{
              fontSize: 13,
              color: colors.primary,
              fontFamily: fonts.sansMedium,
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
