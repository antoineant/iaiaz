import { View, Text as RNText } from "react-native";
import { Text } from "./Text";

interface MifaLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
}

const SIZES = {
  sm: { logo: 24, subtitle: 12 },
  md: { logo: 36, subtitle: 14 },
  lg: { logo: 48, subtitle: 16 },
};

// Gradient from primary-600 (#0284c7) to accent-600 (#c026d3)
const CHARS = [
  { char: "m", color: "#0284c7" },
  { char: "ī", color: "#3a6dca" },
  { char: "f", color: "#8139cd" },
  { char: "ā", color: "#c026d3" },
];

export function MifaLogo({ size = "md", showSubtitle = true }: MifaLogoProps) {
  const s = SIZES[size];

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row" }}>
        {CHARS.map((c, i) => (
          <RNText
            key={i}
            style={{
              fontSize: s.logo,
              fontWeight: "900",
              color: c.color,
            }}
          >
            {c.char}
          </RNText>
        ))}
      </View>
      {showSubtitle && (
        <Text
          style={{
            fontSize: s.subtitle,
            color: "#9ca3af",
            fontWeight: "500",
            marginTop: 2,
          }}
        >
          by iaiaz
        </Text>
      )}
    </View>
  );
}
