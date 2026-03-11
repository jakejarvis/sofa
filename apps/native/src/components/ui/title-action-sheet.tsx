import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import {
  IconBookmark,
  IconCheck,
  IconPlayerPlay,
  IconTrash,
} from "@tabler/icons-react-native";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

type TitleStatus = "watchlist" | "in_progress" | "completed";

interface TitleActionTarget {
  id?: string;
  tmdbId: number;
  title: string;
  type: "movie" | "tv";
  userStatus?: TitleStatus | null;
}

interface TitleActionSheetContextType {
  showActions: (target: TitleActionTarget) => void;
}

const TitleActionSheetContext = createContext<TitleActionSheetContextType>({
  showActions: () => {},
});

export function useTitleActions() {
  return useContext(TitleActionSheetContext);
}

export function TitleActionSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [target, setTarget] = useState<TitleActionTarget | null>(null);
  const { push } = useRouter();

  const quickAdd = useMutation(
    orpc.watchlist.quickAdd.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
        bottomSheetRef.current?.close();
      },
    }),
  );

  const updateStatus = useMutation(
    orpc.titles.updateStatus.mutationOptions({
      onSuccess: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        queryClient.invalidateQueries();
        bottomSheetRef.current?.close();
      },
    }),
  );

  const watchMovie = useMutation(
    orpc.titles.watchMovie.mutationOptions({
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        queryClient.invalidateQueries();
        bottomSheetRef.current?.close();
      },
    }),
  );

  const showActions = useCallback((item: TitleActionTarget) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTarget(item);
    bottomSheetRef.current?.expand();
  }, []);

  const contextValue = useMemo(() => ({ showActions }), [showActions]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  return (
    <TitleActionSheetContext.Provider value={contextValue}>
      {children}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        enableDynamicSizing
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground }}
      >
        <BottomSheetView style={{ paddingBottom: 40 }}>
          {target && (
            <SheetContent
              target={target}
              onViewDetails={() => {
                bottomSheetRef.current?.close();
                if (target.id) push(`/title/${target.id}`);
              }}
              onQuickAdd={() =>
                quickAdd.mutate({
                  tmdbId: target.tmdbId,
                  type: target.type,
                })
              }
              onMarkWatching={(id) =>
                updateStatus.mutate({ id, status: "in_progress" })
              }
              onMarkWatched={(id) => watchMovie.mutate({ id })}
              onRemove={(id) => updateStatus.mutate({ id, status: null })}
            />
          )}
        </BottomSheetView>
      </BottomSheet>
    </TitleActionSheetContext.Provider>
  );
}

function SheetContent({
  target,
  onViewDetails,
  onQuickAdd,
  onMarkWatching,
  onMarkWatched,
  onRemove,
}: {
  target: TitleActionTarget;
  onViewDetails: () => void;
  onQuickAdd: () => void;
  onMarkWatching: (id: string) => void;
  onMarkWatched: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View className="px-4 pb-4">
      <Text
        numberOfLines={1}
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          color: colors.foreground,
          marginBottom: 16,
        }}
      >
        {target.title}
      </Text>

      {target.id && (
        <ActionRow
          icon={<IconPlayerPlay size={20} color={colors.foreground} />}
          label="View Details"
          onPress={onViewDetails}
        />
      )}

      {!target.userStatus && (
        <ActionRow
          icon={<IconBookmark size={20} color={colors.primary} />}
          label="Add to Watchlist"
          onPress={onQuickAdd}
        />
      )}

      {target.id && target.userStatus !== "in_progress" && (
        <ActionRow
          icon={<IconPlayerPlay size={20} color={colors.statusWatching} />}
          label="Mark as Watching"
          onPress={() => onMarkWatching(target.id as string)}
        />
      )}

      {target.id && target.type === "movie" && (
        <ActionRow
          icon={<IconCheck size={20} color={colors.statusCompleted} />}
          label="Mark as Watched"
          onPress={() => onMarkWatched(target.id as string)}
        />
      )}

      {target.id && target.userStatus && (
        <ActionRow
          icon={<IconTrash size={20} color={colors.destructive} />}
          label="Remove from Library"
          onPress={() => onRemove(target.id as string)}
          destructive
        />
      )}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-xl px-3 py-3.5"
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.secondary : "transparent",
      })}
    >
      {icon}
      <Text
        style={{
          fontFamily: fonts.sansMedium,
          fontSize: 15,
          color: destructive ? colors.destructive : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
