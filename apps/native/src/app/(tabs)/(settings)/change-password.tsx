import { useForm } from "@tanstack/react-form";
import { Stack, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Alert, ScrollView, type TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { z } from "zod";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  FieldError,
  Input,
  Label,
  TextField,
} from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/lib/toast";
import * as Haptics from "@/utils/haptics";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function formatFormErrors(errors: unknown): string | null {
  if (!errors) return null;
  if (typeof errors === "string") return errors;
  if (typeof errors === "object") {
    const first = Object.values(errors as Record<string, { message: string }[]>)
      .flat()
      .find((e) => e.message);
    if (first) return first.message;
  }
  return null;
}

export default function ChangePasswordScreen() {
  const router = useRouter();
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(false);

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validators: { onSubmit: changePasswordSchema },
    onSubmit: async ({ value, formApi }) => {
      try {
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
          revokeOtherSessions,
        });
        if (result.error) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            "Error",
            result.error.message ?? "Failed to change password",
          );
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success("Password updated");
        formApi.reset();
        router.back();
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Something went wrong");
      }
    },
  });

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 24,
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
    >
      <Stack.Screen options={{ title: "Change Password" }} />

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: formatFormErrors(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => (
          <View className="gap-4">
            {validationError && (
              <FieldError isInvalid className="mb-1">
                {validationError}
              </FieldError>
            )}

            <Animated.View entering={FadeInDown.duration(300).delay(100)}>
              <form.Field name="currentPassword">
                {(field) => (
                  <TextField>
                    <Label>Current password</Label>
                    <Input
                      value={field.state.value}
                      accessibilityLabel="Current password"
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="current-password"
                      textContentType="password"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => newPasswordRef.current?.focus()}
                    />
                  </TextField>
                )}
              </form.Field>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(200)}>
              <form.Field name="newPassword">
                {(field) => (
                  <TextField>
                    <Label>New password</Label>
                    <Input
                      ref={newPasswordRef}
                      value={field.state.value}
                      accessibilityLabel="New password"
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() =>
                        confirmPasswordRef.current?.focus()
                      }
                    />
                  </TextField>
                )}
              </form.Field>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(300)}>
              <form.Field name="confirmPassword">
                {(field) => (
                  <TextField>
                    <Label>Confirm new password</Label>
                    <Input
                      ref={confirmPasswordRef}
                      value={field.state.value}
                      accessibilityLabel="Confirm new password"
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={form.handleSubmit}
                    />
                  </TextField>
                )}
              </form.Field>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(300).delay(400)}
              className="flex-row items-center justify-between rounded-xl border border-border bg-input px-3.5 py-3"
              style={{ borderCurve: "continuous" }}
            >
              <Text className="text-[15px] text-foreground">
                Sign out of other sessions
              </Text>
              <Switch
                value={revokeOtherSessions}
                onValueChange={setRevokeOtherSessions}
                accessibilityLabel="Sign out of other sessions"
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(500)}>
              <Button
                onPress={form.handleSubmit}
                disabled={isSubmitting}
                className="mt-2 bg-primary"
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <ButtonLabel>Update Password</ButtonLabel>
                )}
              </Button>
            </Animated.View>
          </View>
        )}
      </form.Subscribe>
    </ScrollView>
  );
}
