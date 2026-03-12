import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import { useRef } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  type TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";
import { Button, ButtonLabel } from "@/components/ui/button";
import { SofaLogo } from "@/components/ui/sofa-logo";
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
            Alert.alert("Error", error.error?.message || "Failed to sign in");
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
      className="bg-background"
    >
      <Animated.View
        entering={FadeIn.duration(400)}
        className="mb-8 items-center"
      >
        <SofaLogo size={48} />
        <Text className="mt-3 font-display text-[32px] text-foreground">
          Sofa
        </Text>
        <Text className="mt-1 text-muted-foreground text-sm">
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
            <ButtonLabel>
              Sign in with {authConfig.data?.oidcProviderName ?? "SSO"}
            </ButtonLabel>
          </Button>

          {showPasswordLogin && (
            <View className="my-4 flex-row items-center">
              <View className="h-px flex-1 bg-border" />
              <Text className="px-3 text-muted-foreground text-xs">OR</Text>
              <View className="h-px flex-1 bg-border" />
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
                  disabled={isSubmitting}
                  className="mt-1 bg-primary"
                >
                  {isSubmitting ? (
                    <Spinner size="sm" />
                  ) : (
                    <ButtonLabel>Sign In</ButtonLabel>
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
              <Text className="text-primary text-sm">Create an account</Text>
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
            <Text className="text-muted-foreground text-xs">Change server</Text>
          </Pressable>
        </Link>
      </Animated.View>
    </ScrollView>
  );
}
