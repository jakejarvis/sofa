import { Link } from "expo-router";
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
  };
}) {
  return (
    <Link href={`/person/${person.personId}` as `/person/${string}`}>
      <Link.Trigger>
        <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <View className="w-20 items-center">
            <View className="mb-2 h-16 w-16 overflow-hidden rounded-full bg-secondary">
              {person.profilePath && (
                <Image
                  source={{ uri: person.profilePath }}
                  className="h-full w-full"
                  contentFit="cover"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              className="text-center font-sans-medium text-[11px] text-foreground"
            >
              {person.name}
            </Text>
            {person.character ? (
              <Text
                numberOfLines={1}
                className="text-center text-[10px] text-muted-foreground"
              >
                {person.character}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link.Trigger>
      <Link.Preview />
    </Link>
  );
}
