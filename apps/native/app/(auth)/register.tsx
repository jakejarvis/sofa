import { IconLock } from "@tabler/icons-react-native";
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const { toast } = useToast();

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
            toast.show({
              variant: "danger",
              label: error.error?.message || "Failed to create account",
            });
          },
          onSuccess() {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            formApi.reset();
            queryClient.invalidateQueries();
            router.replace("/(tabs)/(home)");
          },
        },
      );
    },
  });

  if (!registrationOpen && !publicInfo.isPending) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{
          backgroundColor: colors.background,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}
      >
        <Animated.View entering={FadeIn.duration(400)} className="items-center">
          <IconLock size={48} color={colors.mutedForeground} />
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 24,
              color: colors.foreground,
              marginTop: 16,
            }}
          >
            Registration Closed
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.mutedForeground,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            New account creation is currently disabled.
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Link href="/(auth)/login" asChild>
            <Button
              className="mt-6"
              style={{ backgroundColor: colors.primary }}
            >
              <Button.Label style={{ color: colors.primaryForeground }}>
                Back to Login
              </Button.Label>
            </Button>
          </Link>
        </Animated.View>
      </View>
    );
  }

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
          Create Account
        </Text>
      </Animated.View>

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
                    Create Account
                  </Button.Label>
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
            <Text style={{ color: colors.primary, fontSize: 14 }}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </Link>
      </Animated.View>
    </ScrollView>
  );
}
