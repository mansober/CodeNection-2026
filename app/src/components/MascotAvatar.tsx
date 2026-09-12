import { Image, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

const source = require("../../assets/images/maskott-reference.png");
const sheet = { width: 1122, height: 1402 };
const wavePose = { x: 228, y: 55, width: 250, height: 250 };

/**
 * Uses the supplied character sheet as a sprite so the established mascot stays exact.
 * The pale crop background is intentional: it comes from the original artwork.
 */
export function MascotAvatar({ size = 86, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const scale = size / wavePose.width;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.crop, { width: size, height: size }, style]}
    >
      <Image
        source={source}
        resizeMode="stretch"
        style={{
          position: "absolute",
          width: sheet.width * scale,
          height: sheet.height * scale,
          left: -wavePose.x * scale,
          top: -wavePose.y * scale,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  crop: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#FCFBF5",
  },
});
