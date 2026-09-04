import { Platform } from "react-native";

export const colors = {
  ink: "#17221E",
  forest: "#0F6B4F",
  deepForest: "#173E32",
  mint: "#E6F2EC",
  softMint: "#F0F6F2",
  canvas: "#F8F7F2",
  paper: "#FFFFFF",
  surfaceMuted: "#F0EEE7",
  outline: "#65716B",
  outlineSoft: "#D8D8D2",
  coral: "#D45F4E",
  coralDark: "#B54132",
  softCoral: "#F9E7E3",
  amber: "#C68A2E",
  softAmber: "#F4E8D6",
  blue: "#4E73B8",
  violet: "#6F67B6",
  textMuted: "#65716B",
  white: "#FFFFFF",
  transparent: "transparent",
} as const;

export const fonts = {
  regular: "IBMPlexSans-Regular",
  medium: "IBMPlexSans-Medium",
  semiBold: "IBMPlexSans-SemiBold",
  bold: "IBMPlexSans-Bold",
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 42, letterSpacing: -0.7 },
  h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.45 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semiBold, fontSize: 14, lineHeight: 18 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, letterSpacing: 1 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
} as const;

export const layout = {
  pageMaxWidth: 520,
  pagePadding: 20,
  radius: 14,
  radiusSmall: 10,
  touchTarget: 48,
  webShadow: Platform.select({
    web: { boxShadow: "0 18px 60px rgba(23, 34, 30, 0.08)" },
    default: {},
  }),
} as const;
