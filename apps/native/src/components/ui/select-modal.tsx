import { type Icon, IconCheck } from "@tabler/icons-react-native";
import { Modal, Pressable, View } from "react-native";
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
  selection: string;
  /** Available options */
  options: SelectModalOption[];
  /** Whether the modal is open */
  open: boolean;
  /** Called when the modal is opened or closed */
  onOpenChange: (open: boolean) => void;
  /** Called when an option is selected */
  onSelect: (value: string) => void;
}

export function SelectModal({
  label,
  icon: Icon,
  selection,
  options,
  open,
  onOpenChange,
  onSelect,
}: SelectModalProps) {
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const primaryColor = useCSSVariable("--color-primary") as string;

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={() => onOpenChange(false)}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-black/60"
        onPress={() => onOpenChange(false)}
      >
        <Pressable
          className="bg-card mx-8 w-full max-w-sm overflow-hidden rounded-2xl"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="border-border/50 flex-row items-center border-b px-5 py-4">
            {Icon && <ScaledIcon icon={Icon} size={20} color={mutedFgColor} />}
            <Text className="text-foreground ml-1.5 text-base font-medium">{label}</Text>
          </View>
          {options.map((option) => {
            const isSelected = option.value === selection;
            return (
              <Pressable
                key={option.value}
                className="active:bg-primary/5 flex-row items-center px-5 py-3.5"
                onPress={() => {
                  onOpenChange(false);
                  onSelect(option.value);
                }}
              >
                <Text
                  className={`flex-1 text-base ${isSelected ? "text-primary font-medium" : "text-foreground"}`}
                >
                  {option.label}
                </Text>
                {isSelected && <IconCheck size={18} color={primaryColor} strokeWidth={2} />}
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
