import { View, TextInput, TextInputProps } from "react-native";
import { Text } from "./Text";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: Props) {
  return (
    <View className="gap-1.5">
      {label && <Text variant="label">{label}</Text>}
      <TextInput
        className={`bg-gray-50 border rounded-xl px-4 py-3 text-base text-gray-900 ${
          error ? "border-red-400" : "border-gray-200"
        } ${className}`}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && (
        <Text variant="caption" className="text-red-500">
          {error}
        </Text>
      )}
    </View>
  );
}
