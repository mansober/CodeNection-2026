import Svg, { Circle, Line, Path, Polyline, Rect } from "react-native-svg";

export type IconName =
  | "leaf"
  | "today"
  | "plan"
  | "distribution"
  | "check-in"
  | "recovery"
  | "calendar"
  | "person"
  | "document"
  | "check"
  | "plus"
  | "chevron"
  | "clock";

type Props = {
  name: IconName;
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function MarginIcon({ name, color = "#0F6B4F", size = 24, strokeWidth = 1.8 }: Props) {
  const common = { stroke: color, strokeWidth, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === "leaf" && <><Path d="M4 19C5.5 9 11 4.5 20 4c-.4 8.5-5.2 14-13 15" {...common} /><Path d="M6.5 17.5 17 7.5" {...common} /></>}
      {name === "today" && <><Path d="M5 8h14v11H5z" {...common} /><Path d="M8 5v5M16 5v5M5 11h14" {...common} /><Rect x="9" y="14" width="6" height="3" rx="1" fill={color} /></>}
      {name === "plan" && <><Rect x="4" y="5" width="16" height="15" rx="2" {...common} /><Path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" {...common} /></>}
      {name === "distribution" && <><Path d="M11 3a9 9 0 1 0 9 9h-9z" {...common} /><Path d="M14 3.6A9 9 0 0 1 20.4 10H14z" {...common} /></>}
      {name === "check-in" && <><Circle cx="12" cy="12" r="8" {...common} /><Circle cx="9" cy="10" r="1" fill={color} /><Circle cx="15" cy="10" r="1" fill={color} /><Path d="M8.5 14.5c2.2 2 4.8 2 7 0" {...common} /></>}
      {name === "recovery" && <><Path d="M5 17c1-7 5-11 14-12-1 8-5 12-12 13" {...common} /><Path d="m6 19 10-11" {...common} /></>}
      {name === "calendar" && <><Rect x="4" y="5" width="16" height="15" rx="2" {...common} /><Path d="M8 3v4M16 3v4M4 10h16" {...common} /></>}
      {name === "person" && <><Circle cx="12" cy="8" r="3" {...common} /><Path d="M5 20c.8-4.4 3.1-6.5 7-6.5s6.2 2.1 7 6.5" {...common} /></>}
      {name === "document" && <><Rect x="5" y="3" width="14" height="18" rx="2" {...common} /><Path d="M8 8h8M8 12h8M8 16h5" {...common} /></>}
      {name === "check" && <Polyline points="5,12 10,17 19,7" {...common} />}
      {name === "plus" && <><Line x1="12" y1="5" x2="12" y2="19" {...common} /><Line x1="5" y1="12" x2="19" y2="12" {...common} /></>}
      {name === "chevron" && <Path d="m9 6 6 6-6 6" {...common} />}
      {name === "clock" && <><Circle cx="12" cy="12" r="9" {...common} /><Path d="M12 7v5l3 2" {...common} /></>}
    </Svg>
  );
}

export function StressFaceIcon({ level, color, size = 26 }: { level: number; color: string; size?: number }) {
  const mouth = [
    "M7.5 14.5c2.4 3 6.6 3 9 0",
    "M8 15h8",
    "M8 15.5c2.2-2 5.8-2 8 0",
    "M7.5 16c2.4-3.2 6.6-3.2 9 0",
    "M7 16.5c2.7-3.8 7.3-3.8 10 0",
  ][Math.max(0, Math.min(4, level))];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="1.65" />
      <Circle cx="9" cy="10.5" r="1.05" fill={color} />
      <Circle cx="15" cy="10.5" r="1.05" fill={color} />
      <Path d={mouth} fill="none" stroke={color} strokeWidth="1.65" strokeLinecap="round" />
      {level === 4 ? <><Path d="m7.6 8.4 2.5-.8" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" /><Path d="m16.4 8.4-2.5-.8" fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></> : null}
    </Svg>
  );
}
