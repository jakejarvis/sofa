import { useLingui } from "@lingui/react/macro";
import { IconArrowsSort } from "@tabler/icons-react-native";
import { Pressable } from "react-native";
import { useCSSVariable } from "uniwind";
import * as DropdownMenu from "zeego/dropdown-menu";

import { ScaledIcon } from "@/components/ui/scaled-icon";
import * as Haptics from "@/utils/haptics";

type SortBy = "added_at" | "title" | "release_date" | "user_rating" | "vote_average" | "popularity";
type SortDirection = "asc" | "desc";

interface SortOption {
  sortBy: SortBy;
  sortDirection: SortDirection;
  label: string;
}

interface SortMenuProps {
  sortBy: SortBy;
  sortDirection: SortDirection;
  onSortChange: (sortBy: SortBy, sortDirection: SortDirection) => void;
}

export function SortMenu({ sortBy, sortDirection, onSortChange }: SortMenuProps) {
  const { t } = useLingui();
  const foregroundColor = useCSSVariable("--color-foreground") as string;

  const sortOptions: SortOption[] = [
    { sortBy: "added_at", sortDirection: "desc", label: t`Date Added` },
    { sortBy: "title", sortDirection: "asc", label: t`Title A-Z` },
    { sortBy: "title", sortDirection: "desc", label: t`Title Z-A` },
    { sortBy: "release_date", sortDirection: "desc", label: t`Release Date` },
    { sortBy: "user_rating", sortDirection: "desc", label: t`User Rating` },
    { sortBy: "vote_average", sortDirection: "desc", label: t`TMDB Rating` },
    { sortBy: "popularity", sortDirection: "desc", label: t`Popularity` },
  ];

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Pressable
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          accessibilityRole="button"
          accessibilityLabel={t`Sort`}
          hitSlop={8}
        >
          <ScaledIcon icon={IconArrowsSort} size={22} color={foregroundColor} />
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {sortOptions.map((option) => {
          const isSelected = option.sortBy === sortBy && option.sortDirection === sortDirection;
          return (
            <DropdownMenu.CheckboxItem
              key={`${option.sortBy}-${option.sortDirection}`}
              value={isSelected ? "on" : "off"}
              onValueChange={() => onSortChange(option.sortBy, option.sortDirection)}
            >
              <DropdownMenu.ItemIndicator />
              <DropdownMenu.ItemTitle>{option.label}</DropdownMenu.ItemTitle>
            </DropdownMenu.CheckboxItem>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
