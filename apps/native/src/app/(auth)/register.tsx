import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, type TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { z } from "zod";
import { AuthScreen } from "@/components/auth-screen";
import { Button, ButtonLabel } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Input, Label, TextField } from "@/components/ui/text-field";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { authClient, getServerUrl, splitUrl } from "@/lib/server";
import { toast } from "@/lib/toast";
import { getFormErrors } from "@/utils/form-errors";
import * as Haptics from "@/utils/haptics";

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

export default function RegisterScreen() {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const [isSignedUp, setIsSignedUp] = useState(false);

  const publicInfo = useQuery(orpc.system.publicInfo.queryOptions());
  const registrationOpen = publicInfo.data?.registrationOpen ?? false;

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    onSubmit: async ({ value }) => {
      const result = signUpSchema.safeParse(value);
      if (!result.success) {
        const { message, fields } = getFormErrors(result.error);
        setErrorFields(fields);
        toast.error(message);
        return;
      }

      await authClient.signUp.email(
        {
          name: result.data.name,
          email: result.data.email,
          password: result.data.password,
        },
        {
          onError(error) {
            toast.error(error.error?.message || "Failed to create account");
          },
          onSuccess() {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSignedUp(true);
            queryClient.invalidateQueries();
          },
        },
      );
    },
  });

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const busy = isSubmitting || isSignedUp;

  const serverHost = splitUrl(getServerUrl()).host;

  const clearFieldError = (name: string) => {
    if (errorFields.has(name)) {
      setErrorFields((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

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
    <AuthScreen
      title="Create Account"
      subtitle={`Registering on ${serverHost}`}
    >
      <View className="gap-3">
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <form.Field name="name">
            {(field) => (
              <TextField>
                <Label>Name</Label>
                <Input
                  value={field.state.value}
                  accessibilityLabel="Name"
                  onBlur={field.handleBlur}
                  onChangeText={(text) => {
                    field.handleChange(text);
                    clearFieldError("name");
                  }}
                  placeholder="Your name"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  className={
                    errorFields.has("name") ? "border-destructive" : undefined
                  }
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
                  accessibilityLabel="Email"
                  onBlur={field.handleBlur}
                  onChangeText={(text) => {
                    field.handleChange(text);
                    clearFieldError("email");
                  }}
                  placeholder="email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  className={
                    errorFields.has("email") ? "border-destructive" : undefined
                  }
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
                  accessibilityLabel="Password"
                  onBlur={field.handleBlur}
                  onChangeText={(text) => {
                    field.handleChange(text);
                    clearFieldError("password");
                  }}
                  placeholder="••••••••"
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={form.handleSubmit}
                  className={
                    errorFields.has("password")
                      ? "border-destructive"
                      : undefined
                  }
                />
              </TextField>
            )}
          </form.Field>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(400)}>
          <Button
            onPress={form.handleSubmit}
            disabled={busy}
            className="mt-1 bg-primary"
          >
            {busy ? (
              <Spinner size="sm" />
            ) : (
              <ButtonLabel>Create Account</ButtonLabel>
            )}
          </Button>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeIn.duration(300).delay(500)}
        className="mt-6 items-center"
      >
        <Link href="/(auth)/login" asChild>
          <Pressable disabled={busy}>
            <Text className="text-primary text-sm">
              Already have an account? Sign in
            </Text>
          </Pressable>
        </Link>
      </Animated.View>
    </AuthScreen>
  );
}
