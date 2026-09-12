import { Platform } from "react-native";

export const colors = {
  ink: "#1D382C",
  forest: "#153C2D",
  deepForest: "#08261D",
  mint: "#D9E6C4",
  softMint: "#E8EEE0",
  canvas: "#EEF1E5",
  paper: "#F9FAF2",
  surfaceMuted: "#E8E5CF",
  outline: "#5D7061",
  outlineSoft: "#D8E0D2",
  coral: "#A45F43",
  coralDark: "#8C4632",
  softCoral: "#F2E4D6",
  amber: "#82672B",
  softAmber: "#E8E5CF",
  blue: "#4E73B8",
  violet: "#6F67B6",
  textMuted: "#536658",
  white: "#FFFCEF",
  water: "#74B9AF",
  waterBright: "#B6E3D5",
  waterDeep: "#2D7B72",
  moss: "#76945E",
  fern: "#4F7E4E",
  leaf: "#91B85B",
  soil: "#6B4A2C",
  soilDark: "#4B321F",
  sky: "#DCE9D0",
  lavender: "#E7E2F2",
  peach: "#F4DCCF",
  transparent: "transparent",
} as const;

export const fonts = {
  regular: "DMSans",
  medium: "DMSansBold",
  semiBold: "DMSansBold",
  bold: "DMSansBold",
  number: "SpaceGrotesk",
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 38, lineHeight: 42, letterSpacing: -0.7 },
  h1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 35, letterSpacing: -0.45 },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: fonts.semiBold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semiBold, fontSize: 15, lineHeight: 21 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, letterSpacing: 1 },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
} as const;

export const layout = {
  pageMaxWidth: 520,
  pagePadding: 20,
  radius: 22,
  radiusSmall: 13,
  touchTarget: 48,
  webShadow: Platform.select({
    web: { boxShadow: "0 18px 60px rgba(23, 34, 30, 0.08)" },
    default: {},
  }),
} as const;
