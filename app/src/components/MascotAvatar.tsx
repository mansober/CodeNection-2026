import { Image, ImageStyle, StyleProp } from "react-native";

export type MascotPose = "idle" | "wave" | "happy" | "sleepy" | "wink";

/** Each pose is pre-cropped from the character sheet with its cream background removed. */
const sources: Record<MascotPose, number> = {
  idle: require("../../assets/images/mascot-idle.png"),
  wave: require("../../assets/images/mascot-wave.png"),
  happy: require("../../assets/images/mascot-happy.png"),
  sleepy: require("../../assets/images/mascot-sleepy.png"),
  wink: require("../../assets/images/mascot-wink.png"),
};

/** Transparent-background mascot art. `pose` picks the reaction to show. */
export function MascotAvatar({ pose = "idle", size = 86, style }: { pose?: MascotPose; size?: number; style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={sources[pose]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width: size, height: size }, style]}
    />
  );
}
