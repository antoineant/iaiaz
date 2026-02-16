import { Text as RNText, TextProps } from "react-native";

interface Props extends TextProps {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
}

export function Text({ variant = "body", className = "", ...props }: Props) {
  const variantClasses: Record<string, string> = {
    title: "text-2xl font-bold text-gray-900",
    subtitle: "text-lg font-semibold text-gray-800",
    body: "text-base text-gray-700",
    caption: "text-sm text-gray-500",
    label: "text-sm font-medium text-gray-600",
  };

  return (
    <RNText className={`${variantClasses[variant]} ${className}`} {...props} />
  );
}
