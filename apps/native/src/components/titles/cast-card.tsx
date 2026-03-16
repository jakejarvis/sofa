import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { Image } from "@/components/ui/image";
import { Text } from "@/components/ui/text";

export function CastCard({
  person,
}: {
  person: {
    id: string;
    personId: string;
    name: string;
    character: string | null;
    profilePath: string | null;
    profileThumbHash?: string | null;
  };
}) {
  const accessibilityLabel = person.character
    ? `${person.name} as ${person.character}`
    : person.name;
  const { navigate } = useRouter();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => navigate(`/person/${person.personId}`)}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="w-20 items-center">
        <View className="mb-2 h-16 w-16 overflow-hidden rounded-full bg-secondary">
          {person.profilePath && (
            <Image
              source={{ uri: person.profilePath }}
              thumbHash={person.profileThumbHash}
              recyclingKey={person.personId}
              className="h-full w-full"
              contentFit="cover"
              accessible={false}
            />
          )}
        </View>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
          className="text-center font-medium font-sans text-foreground text-xs"
        >
          {person.name}
        </Text>
        {person.character ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.0}
            className="text-center text-muted-foreground text-xs"
          >
            {person.character}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
