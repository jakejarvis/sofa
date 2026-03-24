import { type Icon, IconCheck } from "@tabler/icons-react-native";
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { Text } from "@/components/ui/text";

import { ScaledIcon } from "./scaled-icon";

export interface SelectModalOption {
  value: string;
  label: string;
}

export interface SelectModalProps {
  /** Label displayed on the trigger row */
  label: string;
  /** Icon displayed in the modal title */
  icon?: Icon;
  /** Currently selected value */
  selection: string | string[];
  /** Available options */
  options: SelectModalOption[];
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is opened or closed */
  onOpenChange: (open: boolean) => void;
  /** Called when an option is selected */
  onSelect: (value: string) => void;
  /** When true, tapping an option toggles it without closing the modal */
  multiSelect?: boolean;
  /** Optional clear button label — shown in the header when provided */
  clearLabel?: string;
  /** Called when the clear button is pressed */
  onClear?: () => void;
}

export function SelectModal({
  label,
  icon: Icon,
  selection,
  options,
  open,
  onOpenChange,
  onSelect,
  multiSelect,
  clearLabel,
  onClear,
}: SelectModalProps) {
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;
  const { top: safeTop, bottom: safeBottom } = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const maxCardHeight = screenHeight - safeTop - safeBottom - 64;

  const isSelected = (value: string) =>
    Array.isArray(selection) ? selection.includes(value) : selection === value;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60"
        style={{ paddingTop: safeTop + 16, paddingBottom: safeBottom + 16 }}
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className="bg-card mx-8 w-full max-w-sm overflow-hidden rounded-2xl"
          style={{ maxHeight: maxCardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="border-border/50 flex-row items-center border-b p-4">
            {Icon && <ScaledIcon icon={Icon} size={20} color={mutedFgColor} />}
            <Text className="text-foreground ml-1.5 flex-1 text-base font-medium">{label}</Text>
            {clearLabel && onClear && (
              <Pressable
                onPress={() => {
                  onClear();
                  onOpenChange(false);
                }}
                hitSlop={8}
              >
                <Text className="text-muted-foreground text-sm">{clearLabel}</Text>
              </Pressable>
            )}
          </View>
          <ScrollView bounces={false}>
            {options.map((option) => {
              const selected = isSelected(option.value);
              return (
                <Pressable
                  key={option.value}
                  className="active:bg-primary/5 flex-row items-center px-5 py-3.5"
                  onPress={() => {
                    onSelect(option.value);
                    if (!multiSelect) onOpenChange(false);
                  }}
                >
                  <Text
                    className={`flex-1 text-base ${selected ? "text-primary font-medium" : "text-foreground"}`}
                  >
                    {option.label}
                  </Text>
                  {selected && <IconCheck size={18} color={primaryColor} strokeWidth={2} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
