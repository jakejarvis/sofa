import { memo } from "react";
import { View } from "react-native";

export const HORIZONTAL_LIST_GAP = 12;
export const HORIZONTAL_LIST_EDGE_INSET = 16;
export const horizontalListStyle = { overflow: "visible" as const };
export const horizontalListContentStyle = {
  paddingHorizontal: HORIZONTAL_LIST_EDGE_INSET,
};

export const HorizontalListSeparator = memo(function HorizontalListSeparator() {
  return <View style={{ width: HORIZONTAL_LIST_GAP }} />;
});
