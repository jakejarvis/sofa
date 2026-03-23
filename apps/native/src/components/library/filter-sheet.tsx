import { useLingui } from "@lingui/react/macro";
import { IconAdjustmentsHorizontal, IconStarFilled, IconTag } from "@tabler/icons-react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCSSVariable } from "uniwind";

import { Button, ButtonLabel } from "@/components/ui/button";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { SelectModal } from "@/components/ui/select-modal";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { orpc } from "@/lib/orpc";
import * as Haptics from "@/utils/haptics";

export interface LibraryFilters {
  statuses?: string[];
  type?: string;
  genreId?: number;
  ratingMin?: number;
  ratingMax?: number;
  yearMin?: number;
  yearMax?: number;
  contentRating?: string;
  availableToStream?: boolean;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: LibraryFilters;
  onApply: (filters: LibraryFilters) => void;
}

const DECADES = [
  { label: "2020s", yearMin: 2020, yearMax: 2029 },
  { label: "2010s", yearMin: 2010, yearMax: 2019 },
  { label: "2000s", yearMin: 2000, yearMax: 2009 },
  { label: "90s", yearMin: 1990, yearMax: 1999 },
  { label: "80s", yearMin: 1980, yearMax: 1989 },
] as const;

const CONTENT_RATINGS = [
  "G",
  "PG",
  "PG-13",
  "R",
  "NC-17",
  "TV-Y",
  "TV-Y7",
  "TV-G",
  "TV-PG",
  "TV-14",
  "TV-MA",
];

function Chip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      className={`rounded-full px-3 py-1.5 ${isSelected ? "bg-primary" : "bg-secondary"}`}
    >
      <Text
        className={`font-sans text-xs font-medium ${isSelected ? "text-primary-foreground" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
      {children}
    </Text>
  );
}

function RatingStar({ filled, onPress }: { filled: boolean; onPress: () => void }) {
  const primaryColor = useCSSVariable("--color-primary") as string;
  const mutedColor = useCSSVariable("--color-muted-foreground") as string;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      hitSlop={4}
      accessibilityRole="button"
    >
      <ScaledIcon icon={IconStarFilled} size={24} color={filled ? primaryColor : mutedColor} />
    </Pressable>
  );
}

export function FilterSheet({ open, onOpenChange, filters, onApply }: FilterSheetProps) {
  const { t } = useLingui();
  const mutedFgColor = useCSSVariable("--color-muted-foreground") as string;
  const { bottom: safeBottom } = useSafeAreaInsets();

  // Local draft state — reset from applied filters when sheet opens.
  // Uses React's "adjusting state during render" pattern (react.dev/learn/
  // you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)
  // to avoid useEffect + setState cascade.
  const [local, setLocal] = useState<LibraryFilters>(() => ({ ...filters }));
  const [prevOpen, setPrevOpen] = useState(open);
  if (open && !prevOpen) {
    setLocal({ ...filters });
  }
  if (open !== prevOpen) {
    setPrevOpen(open);
  }

  const handleClose = () => onOpenChange(false);

  // Genre modal
  const [genreModalOpen, setGenreModalOpen] = useState(false);
  // Content rating modal
  const [contentRatingModalOpen, setContentRatingModalOpen] = useState(false);

  const { data: genreData } = useQuery(orpc.library.genres.queryOptions());

  const genreOptions = useMemo(
    () => [
      { value: "", label: t`All genres` },
      ...(genreData?.genres.map((g) => ({ value: String(g.id), label: g.name })) ?? []),
    ],
    [genreData, t],
  );

  const contentRatingOptions = useMemo(
    () => [{ value: "", label: t`All` }, ...CONTENT_RATINGS.map((r) => ({ value: r, label: r }))],
    [t],
  );

  const statuses = useMemo(
    () => [
      { value: "in_watchlist", label: t`Watchlist` },
      { value: "watching", label: t`Watching` },
      { value: "caught_up", label: t`Caught Up` },
      { value: "completed", label: t`Completed` },
    ],
    [t],
  );

  const types = useMemo(
    () => [
      { value: undefined as string | undefined, label: t`All` },
      { value: "movie" as string | undefined, label: t`Movie` },
      { value: "tv" as string | undefined, label: t`TV` },
    ],
    [t],
  );

  function toggleStatus(status: string) {
    const current = local.statuses ?? [];
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setLocal((prev) => ({ ...prev, statuses: next.length > 0 ? next : undefined }));
  }

  const activeDecade = DECADES.find(
    (d) => local.yearMin === d.yearMin && local.yearMax === d.yearMax,
  );

  function selectDecade(decade: (typeof DECADES)[number]) {
    if (activeDecade === decade) {
      setLocal((prev) => ({ ...prev, yearMin: undefined, yearMax: undefined }));
    } else {
      setLocal((prev) => ({ ...prev, yearMin: decade.yearMin, yearMax: decade.yearMax }));
    }
  }

  function clearAll() {
    setLocal({});
  }

  function applyFilters() {
    onApply(local);
    onOpenChange(false);
  }

  const selectedGenreLabel =
    genreData?.genres.find((g) => g.id === local.genreId)?.name ?? t`All genres`;

  return (
    <>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => handleClose()}
      >
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => handleClose()}>
          <Pressable
            className="bg-card max-h-[85%] rounded-t-2xl"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="border-border/50 flex-row items-center border-b px-5 py-4">
              <ScaledIcon icon={IconAdjustmentsHorizontal} size={20} color={mutedFgColor} />
              <Text className="text-foreground ml-2 text-base font-medium">{t`Filters`}</Text>
            </View>

            <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false} bounces={false}>
              <View className="gap-5 pb-4">
                {/* Status */}
                <View>
                  <SectionLabel>{t`Status`}</SectionLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {statuses.map((s) => (
                      <Chip
                        key={s.value}
                        label={s.label}
                        isSelected={(local.statuses ?? []).includes(s.value)}
                        onPress={() => toggleStatus(s.value)}
                      />
                    ))}
                  </View>
                </View>

                {/* Type */}
                <View>
                  <SectionLabel>{t`Type`}</SectionLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {types.map((typ) => (
                      <Chip
                        key={typ.value ?? "all"}
                        label={typ.label}
                        isSelected={local.type === typ.value}
                        onPress={() => setLocal((prev) => ({ ...prev, type: typ.value }))}
                      />
                    ))}
                  </View>
                </View>

                {/* Genre */}
                <View>
                  <SectionLabel>{t`Genre`}</SectionLabel>
                  <Pressable
                    onPress={() => setGenreModalOpen(true)}
                    className="bg-secondary flex-row items-center rounded-xl px-4 py-3"
                  >
                    <ScaledIcon icon={IconTag} size={16} color={mutedFgColor} />
                    <Text className="text-foreground ml-2 flex-1 text-sm">
                      {selectedGenreLabel}
                    </Text>
                    <Text className="text-muted-foreground text-xs">{"\u203A"}</Text>
                  </Pressable>
                </View>

                {/* Rating */}
                <View>
                  <SectionLabel>{t`Rating`}</SectionLabel>
                  <View className="gap-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-muted-foreground w-8 text-xs">{t`Min`}</Text>
                      <View className="flex-row gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <RatingStar
                            key={`min-${star}`}
                            filled={star <= (local.ratingMin ?? 0)}
                            onPress={() =>
                              setLocal((prev) => ({
                                ...prev,
                                ratingMin: prev.ratingMin === star ? undefined : star,
                              }))
                            }
                          />
                        ))}
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-muted-foreground w-8 text-xs">{t`Max`}</Text>
                      <View className="flex-row gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <RatingStar
                            key={`max-${star}`}
                            filled={star <= (local.ratingMax ?? 0)}
                            onPress={() =>
                              setLocal((prev) => ({
                                ...prev,
                                ratingMax: prev.ratingMax === star ? undefined : star,
                              }))
                            }
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Year */}
                <View>
                  <SectionLabel>{t`Year`}</SectionLabel>
                  <View className="flex-row flex-wrap gap-2">
                    {DECADES.map((decade) => (
                      <Chip
                        key={decade.label}
                        label={decade.label}
                        isSelected={activeDecade === decade}
                        onPress={() => selectDecade(decade)}
                      />
                    ))}
                  </View>
                </View>

                {/* Content Rating */}
                <View>
                  <SectionLabel>{t`Content Rating`}</SectionLabel>
                  <Pressable
                    onPress={() => setContentRatingModalOpen(true)}
                    className="bg-secondary flex-row items-center rounded-xl px-4 py-3"
                  >
                    <Text className="text-foreground flex-1 text-sm">
                      {local.contentRating ?? t`All`}
                    </Text>
                    <Text className="text-muted-foreground text-xs">{"\u203A"}</Text>
                  </Pressable>
                </View>

                {/* Streaming */}
                <View>
                  <SectionLabel>{t`Streaming`}</SectionLabel>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-foreground text-sm">{t`Available to stream`}</Text>
                    <Switch
                      value={local.availableToStream ?? false}
                      onValueChange={(checked) =>
                        setLocal((prev) => ({
                          ...prev,
                          availableToStream: checked || undefined,
                        }))
                      }
                      accessibilityLabel={t`Available to stream`}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Bottom buttons */}
            <View
              className="border-border/50 flex-row gap-3 border-t px-5 py-4"
              style={{ paddingBottom: Math.max(16, safeBottom) }}
            >
              <Button variant="secondary" onPress={clearAll} className="flex-1">
                <ButtonLabel>{t`Clear`}</ButtonLabel>
              </Button>
              <Button onPress={applyFilters} className="flex-1">
                <ButtonLabel>{t`Apply`}</ButtonLabel>
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <SelectModal
        label={t`Genre`}
        icon={IconTag}
        selection={local.genreId !== undefined ? String(local.genreId) : ""}
        options={genreOptions}
        open={genreModalOpen}
        onOpenChange={setGenreModalOpen}
        onSelect={(value) =>
          setLocal((prev) => ({
            ...prev,
            genreId: value === "" ? undefined : Number(value),
          }))
        }
      />

      <SelectModal
        label={t`Content Rating`}
        selection={local.contentRating ?? ""}
        options={contentRatingOptions}
        open={contentRatingModalOpen}
        onOpenChange={setContentRatingModalOpen}
        onSelect={(value) =>
          setLocal((prev) => ({
            ...prev,
            contentRating: value === "" ? undefined : value,
          }))
        }
      />
    </>
  );
}
