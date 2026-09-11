import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/theme/tokens";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans: require("../../assets/fonts/dm-regular.ttf"),
    DMSansBold: require("../../assets/fonts/dm-bold.ttf"),
    SpaceGrotesk: require("../../assets/fonts/space-regular.ttf"),
  });

  if (!fontsLoaded) return <View style={styles.loading} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.canvas },
});
