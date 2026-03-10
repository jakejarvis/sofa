import { IconDeviceTv } from "@tabler/icons-react-native";
import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { setServerUrl, validateServerUrl } from "@/lib/server-url";

const urlSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Server URL is required")
    .url("Enter a valid URL"),
});

export default function ServerUrlScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [validationError, setValidationError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { url: "" },
    validators: { onSubmit: urlSchema },
    onSubmit: async ({ value }) => {
      setValidationError(null);
      const isValid = await validateServerUrl(value.url);
      if (!isValid) {
        setValidationError(
          "Could not connect to server. Check the URL and try again.",
        );
        return;
      }
      await setServerUrl(value.url);
      router.replace("/(auth)/login");
    },
  });

  return (
    <View
      className="flex-1 justify-center px-6"
      style={{
        backgroundColor: colors.background,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <View className="mb-8 items-center">
        <IconDeviceTv size={48} color={colors.primary} />
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 32,
            color: colors.foreground,
            marginTop: 12,
          }}
        >
          Sofa
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: colors.mutedForeground,
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Enter your Sofa server URL to get started
        </Text>
      </View>

      <form.Subscribe
        selector={(state) => ({ isSubmitting: state.isSubmitting })}
      >
        {({ isSubmitting }) => (
          <View className="gap-4">
            <form.Field name="url">
              {(field) => (
                <TextField>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChangeText={field.handleChange}
                    placeholder="https://sofa.example.com"
                    keyboardType="url"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={form.handleSubmit}
                    style={{
                      backgroundColor: `${colors.input}`,
                      borderColor: colors.border,
                      color: colors.foreground,
                    }}
                  />
                </TextField>
              )}
            </form.Field>

            {validationError && (
              <Text style={{ color: colors.destructive, fontSize: 13 }}>
                {validationError}
              </Text>
            )}

            <Button
              onPress={form.handleSubmit}
              isDisabled={isSubmitting}
              style={{ backgroundColor: colors.primary }}
            >
              {isSubmitting ? (
                <Spinner size="sm" />
              ) : (
                <Button.Label
                  style={{
                    color: colors.primaryForeground,
                    fontFamily: fonts.sansMedium,
                  }}
                >
                  Connect
                </Button.Label>
              )}
            </Button>
          </View>
        )}
      </form.Subscribe>
    </View>
  );
}
