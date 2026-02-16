import { View, TouchableOpacity } from "react-native";
import { Text } from "@/components/ui";

const GAUGE_KEYS = ["creativity", "patience", "humor", "rigor", "curiosity"] as const;

export type GaugeKey = (typeof GAUGE_KEYS)[number];

export interface Gauges {
  creativity: number;
  patience: number;
  humor: number;
  rigor: number;
  curiosity: number;
}

interface GaugeSliderProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  color?: string;
  readonly?: boolean;
}

export function GaugeSlider({ label, value, onChange, color = "#818CF8", readonly = false }: GaugeSliderProps) {
  return (
    <View className="flex-row items-center gap-2 mb-2">
      <Text className="text-xs text-gray-500 w-20">{label}</Text>
      <View className="flex-row gap-1 flex-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity
            key={n}
            disabled={readonly}
            onPress={() => onChange?.(n)}
            className="flex-1 h-3 rounded-full"
            style={{
              backgroundColor: n <= value ? color : `${color}30`,
            }}
          />
        ))}
      </View>
      <Text className="text-xs text-gray-400 w-4 text-center font-mono">{value}</Text>
    </View>
  );
}

interface GaugeGroupProps {
  gauges: Gauges;
  labels: Record<GaugeKey, string>;
  onChange?: (gauges: Gauges) => void;
  color?: string;
  readonly?: boolean;
}

export function GaugeGroup({ gauges, labels, onChange, color, readonly }: GaugeGroupProps) {
  return (
    <View>
      {GAUGE_KEYS.map((key) => (
        <GaugeSlider
          key={key}
          label={labels[key]}
          value={gauges[key]}
          color={color}
          readonly={readonly}
          onChange={
            onChange
              ? (val) => onChange({ ...gauges, [key]: val })
              : undefined
          }
        />
      ))}
    </View>
  );
}

export { GAUGE_KEYS };
export const DEFAULT_GAUGES: Gauges = {
  creativity: 3,
  patience: 3,
  humor: 1,
  rigor: 3,
  curiosity: 3,
};
