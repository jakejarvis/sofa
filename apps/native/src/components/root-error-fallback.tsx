import { msg } from "@lingui/core/macro";
import { reloadAppAsync } from "expo";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { i18n } from "@sofa/i18n";

/**
 * Rendered by the app-wide error boundary, outside every provider — so it uses
 * only react-native primitives and literal colors.
 */
export function RootErrorFallback({ resetError }: { resetError: () => void }) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n._(msg`Something went wrong`)}</Text>
      <Text style={styles.body}>{i18n._(msg`Sofa hit an unexpected error.`)}</Text>
      <Pressable accessibilityRole="button" onPress={resetError} style={styles.button}>
        <Text style={styles.buttonLabel}>{i18n._(msg`Try again`)}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => void reloadAppAsync()}
        style={styles.button}
      >
        <Text style={styles.buttonLabel}>{i18n._(msg`Restart app`)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#101010",
  },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "600", textAlign: "center" },
  body: { color: "#a1a1a1", fontSize: 15, textAlign: "center", marginBottom: 12 },
  button: {
    minWidth: 180,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#fba952",
  },
  buttonLabel: { color: "#1a1208", fontSize: 16, fontWeight: "600" },
});
