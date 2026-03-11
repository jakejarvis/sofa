import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Link, useRouter } from "expo-router";
import {
  Button,
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  useToast,
} from "heroui-native";
import { useRef } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  type TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { SofaLogo } from "@/components/ui/sofa-logo";

import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginScreen() {
  const { replace } = useRouter();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);
  const { toast } = useToast();

  const authConfig = useQuery(orpc.system.authConfig.queryOptions());

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value, formApi }) => {
      await authClient.signIn.email(
        { email: value.email.trim(), password: value.password },
        {
          onError(error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            toast.show({
              variant: "danger",
              label: error.error?.message || "Failed to sign in",
            });
          },
          onSuccess() {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            formApi.reset();
            queryClient.invalidateQueries();
            replace("/(tabs)/(home)");
          },
        },
      );
    },
  });

  const showPasswordLogin = !authConfig.data?.passwordLoginDisabled;
  const showOidc = authConfig.data?.oidcEnabled;
  const showRegister = authConfig.data?.registrationOpen;

  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
      keyboardShouldPersistTaps="handled"
      bounces={false}
      style={{ backgroundColor: colors.background }}
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        className="mb-8 items-center"
      >
        <SofaLogo size={48} />
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
          }}
        >
          Sign in to continue
        </Text>
      </Animated.View>

      {showOidc && (
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="mb-4"
        >
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
            <Button.Label>
              Sign in with {authConfig.data?.oidcProviderName ?? "SSO"}
            </Button.Label>
          </Button>

          {showPasswordLogin && (
            <View className="my-4 flex-row items-center">
              <View
                className="h-px flex-1"
                style={{ backgroundColor: colors.border }}
              />
              <Text
                style={{
                  fontSize: 12,
                  color: colors.mutedForeground,
                  paddingHorizontal: 12,
                }}
              >
                OR
              </Text>
              <View
                className="h-px flex-1"
                style={{ backgroundColor: colors.border }}
              />
            </View>
          )}
        </Animated.View>
      )}

      {showPasswordLogin && (
        <form.Subscribe
          selector={(state) => ({
            isSubmitting: state.isSubmitting,
            validationError: state.errorMap.onSubmit
              ? String(state.errorMap.onSubmit)
              : null,
          })}
        >
          {({ isSubmitting, validationError }) => (
            <View className="gap-3">
              {validationError && (
                <FieldError isInvalid className="mb-1">
                  {validationError}
                </FieldError>
              )}

              <Animated.View entering={FadeInDown.duration(300).delay(200)}>
                <form.Field name="email">
                  {(field) => (
                    <TextField>
                      <Label>Email</Label>
                      <Input
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
                        autoComplete="password"
                        textContentType="password"
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
                  isDisabled={isSubmitting}
                  style={{ backgroundColor: colors.primary }}
                  className="mt-1"
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
                      Sign In
                    </Button.Label>
                  )}
                </Button>
              </Animated.View>
            </View>
          )}
        </form.Subscribe>
      )}

      {showRegister && (
        <Animated.View
          entering={FadeIn.duration(300).delay(500)}
          className="mt-6 items-center"
        >
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={{ color: colors.primary, fontSize: 14 }}>
                Create an account
              </Text>
            </Pressable>
          </Link>
        </Animated.View>
      )}

      <Animated.View
        entering={FadeIn.duration(300).delay(500)}
        className="mt-4 items-center"
      >
        <Link href="/(auth)/server-url" asChild>
          <Pressable>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Change server
            </Text>
          </Pressable>
        </Link>
      </Animated.View>
    </ScrollView>
  );
}
