import { Trans, useLingui } from "@lingui/react/macro";
import { IconServer2 } from "@tabler/icons-react-native";
import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, type TextInput, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { z } from "zod";

import { AuthScreen } from "@/components/auth-screen";
import { Button, ButtonLabel } from "@/components/ui/button";
import { ScaledIcon } from "@/components/ui/scaled-icon";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { Input, Label, TextField } from "@/components/ui/text-field";
import { orpc } from "@/lib/orpc";
import { queryClient } from "@/lib/query-client";
import { authClient, getServerUrl, splitUrl } from "@/lib/server";
import { toast } from "@/lib/toast";
import { getFormErrors } from "@/utils/form-errors";
import * as Haptics from "@/utils/haptics";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginScreen() {
  const { t } = useLingui();
  const passwordRef = useRef<TextInput>(null);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const [isSignedIn, setIsSignedIn] = useState(false);

  const authConfig = useQuery(orpc.system.authConfig.queryOptions());

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      const result = signInSchema.safeParse(value);
      if (!result.success) {
        const { message, fields } = getFormErrors(result.error);
        setErrorFields(fields);
        toast.error(message);
        return;
      }

      await authClient.signIn.email(
        { email: result.data.email, password: result.data.password },
        {
          onError(error) {
            toast.error(error.error?.message || t`Failed to sign in`);
          },
          onSuccess() {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setIsSignedIn(true);
            queryClient.invalidateQueries();
          },
        },
      );
    },
  });

  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const busy = isSubmitting || isSignedIn;

  const statusCompletedColor = useCSSVariable("--color-status-completed") as string;
  const serverHost = splitUrl(getServerUrl()).host;

  const showPasswordLogin = !authConfig.data?.passwordLoginDisabled;
  const showOidc = authConfig.data?.oidcEnabled;
  const showRegister = authConfig.data?.registrationOpen;

  const clearFieldError = (name: string) => {
    if (errorFields.has(name)) {
      setErrorFields((prev) => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  return (
    <AuthScreen title="Sofa" subtitle={t`Sign in to continue`}>
      {showOidc &&
        (() => {
          const providerName = authConfig.data?.oidcProviderName ?? "SSO";
          return (
            <Animated.View entering={FadeInDown.duration(300).delay(100)} className="mb-4">
              <Button
                onPress={() => {
                  authClient.signIn.oauth2({
                    providerId: "oidc",
                    callbackURL: "/(tabs)/(home)",
                  });
                }}
                variant="secondary"
                className="w-full"
              >
                <ButtonLabel>
                  <Trans>Sign in with {providerName}</Trans>
                </ButtonLabel>
              </Button>

              {showPasswordLogin && (
                <View className="my-4 flex-row items-center">
                  <View className="bg-border h-px flex-1" />
                  <Text className="text-muted-foreground px-3 text-xs">
                    <Trans>OR</Trans>
                  </Text>
                  <View className="bg-border h-px flex-1" />
                </View>
              )}
            </Animated.View>
          );
        })()}

      {showPasswordLogin && (
        <View className="gap-3">
          <Animated.View entering={FadeInDown.duration(300).delay(200)}>
            <form.Field name="email">
              {(field) => (
                <TextField>
                  <Label>
                    <Trans>Email</Trans>
                  </Label>
                  <Input
                    value={field.state.value}
                    accessibilityLabel="Email"
                    onBlur={field.handleBlur}
                    onChangeText={(text) => {
                      field.handleChange(text);
                      clearFieldError("email");
                    }}
                    placeholder="wwhite@graymatter.biz"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    className={errorFields.has("email") ? "border-destructive" : undefined}
                  />
                </TextField>
              )}
            </form.Field>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(300)}>
            <form.Field name="password">
              {(field) => (
                <TextField>
                  <Label>
                    <Trans>Password</Trans>
                  </Label>
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
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={form.handleSubmit}
                    className={errorFields.has("password") ? "border-destructive" : undefined}
                  />
                </TextField>
              )}
            </form.Field>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(400)}>
            <Button onPress={form.handleSubmit} disabled={busy} className="mt-2">
              {busy ? (
                <Spinner size="sm" />
              ) : (
                <ButtonLabel>
                  <Trans>Sign In</Trans>
                </ButtonLabel>
              )}
            </Button>
          </Animated.View>

          {showRegister && (
            <Animated.View entering={FadeIn.duration(300).delay(500)}>
              <Link href="/(auth)/register" asChild>
                <Button disabled={busy} variant="secondary">
                  <ButtonLabel>
                    <Trans>Create an account</Trans>
                  </ButtonLabel>
                </Button>
              </Link>
            </Animated.View>
          )}

          <Animated.View entering={FadeIn.duration(300).delay(500)} className="mt-8 items-center">
            <Link href="/(auth)/server-url" replace asChild>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                className="flex-row items-center gap-1.5"
              >
                <ScaledIcon icon={IconServer2} size={14} color={statusCompletedColor} />
                <Text className="text-muted-foreground font-sans text-xs">
                  <Trans>
                    Connected to <Text className="font-medium">{serverHost}</Text>. Tap to change.
                  </Trans>
                </Text>
              </Pressable>
            </Link>
          </Animated.View>
        </View>
      )}
    </AuthScreen>
  );
}
