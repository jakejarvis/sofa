import type { Icon } from "@tabler/icons-react-native";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { View } from "react-native";

import { SectionHeader } from "@/components/ui/section-header";
import { Text } from "@/components/ui/text";

function flattenChildren(node: ReactNode): ReactNode[] {
  const result: ReactNode[] = [];
  Children.forEach(node, (child) => {
    if (isValidElement(child) && child.type === Fragment) {
      result.push(...flattenChildren((child.props as { children?: ReactNode }).children));
    } else if (child != null && child !== false) {
      result.push(child);
    }
  });
  return result;
}

export function SettingsSection({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon?: Icon;
  badge?: string;
  children: ReactNode;
}) {
  const items = flattenChildren(children);

  return (
    <View className="mb-6">
      <View className="flex-row items-center gap-2">
        <SectionHeader title={title} icon={icon} />
        {badge ? (
          <View className="bg-primary/10 mb-2.5 rounded-full px-2 py-0.5">
            <Text
              maxFontSizeMultiplier={1.0}
              className="text-primary font-sans text-xs font-medium"
            >
              {badge}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        className="bg-card rounded-xl border border-white/[0.06] px-3"
        style={{ borderCurve: "continuous" }}
      >
        {items.map((child, i) => {
          const key =
            isValidElement(child) && child.key != null ? String(child.key) : `settings-item-${i}`;

          return (
            <Fragment key={key}>
              {i > 0 && <View className="border-border border-t" style={{ borderTopWidth: 0.5 }} />}
              {child}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}
