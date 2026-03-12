import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useRef } from "react";
import { Alert, Pressable, type TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { z } from "zod";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import {
  FieldError,
  Input,
  Label,
  TextField,
} from "@/components/ui/text-field";
import { authClient } from "@/lib/auth-client";
import * as Haptics from "@/utils/haptics";
import { orpc, queryClient } from "@/utils/orpc";

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Use at least 8 characters"),
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

export default function RegisterScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const publicInfo = useQuery(orpc.system.publicInfo.queryOptions());
  const registrationOpen = publicInfo.data?.registrationOpen ?? false;

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signUp.email(
        {
          name: value.name.trim(),
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              "Error",
              error.error?.message || "Failed to create account",
            );
          },
          onSuccess() {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            formApi.reset();
            queryClient.invalidateQueries();
          },
        },
      );
    },
  });

  if (!registrationOpen && !publicInfo.isPending) {
    return (
      <AuthScreen
        title="Registration Closed"
        subtitle="New account creation is currently disabled."
      >
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Link href="/(auth)/login" asChild>
            <Button className="mt-6 bg-primary">
              <ButtonLabel className="text-primary-foreground">
                Back to Login
              </ButtonLabel>
            </Button>
          </Link>
        </Animated.View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Create Account">
      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: formatFormErrors(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => (
          <View className="gap-3">
            {validationError && (
              <FieldError isInvalid className="mb-1">
                {validationError}
              </FieldError>
            )}

            <Animated.View entering={FadeInDown.duration(300).delay(100)}>
              <form.Field name="name">
                {(field) => (
                  <TextField>
                    <Label>Name</Label>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="Your name"
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailRef.current?.focus()}
                    />
                  </TextField>
                )}
              </form.Field>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(200)}>
              <form.Field name="email">
                {(field) => (
                  <TextField>
                    <Label>Email</Label>
                    <Input
                      ref={emailRef}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  </TextField>
                )}
              </form.Field>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(300).delay(300)}>
              <form.Field name="password">
                {(field) => (
                  <TextField>
                    <Label>Password</Label>
                    <Input
                      ref={passwordRef}
                      value={field.state.value}
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

            <Animated.View entering={FadeInDown.duration(300).delay(400)}>
              <Button
                onPress={form.handleSubmit}
                disabled={isSubmitting}
                className="mt-1 bg-primary"
              >
                {isSubmitting ? (
                  <Spinner size="sm" />
                ) : (
                  <ButtonLabel>Create Account</ButtonLabel>
                )}
              </Button>
            </Animated.View>
          </View>
        )}
      </form.Subscribe>

      <Animated.View
        entering={FadeIn.duration(300).delay(500)}
        className="mt-6 items-center"
      >
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text className="text-primary text-sm">
              Already have an account? Sign in
            </Text>
          </Pressable>
        </Link>
      </Animated.View>
    </AuthScreen>
  );
}
