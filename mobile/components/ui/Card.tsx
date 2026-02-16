import { View, ViewProps } from "react-native";

interface Props extends ViewProps {
  variant?: "default" | "outlined";
}

export function Card({
  variant = "default",
  className = "",
  ...props
}: Props) {
  const variantClasses: Record<string, string> = {
    default: "bg-white rounded-2xl p-4 shadow-sm",
    outlined: "bg-white rounded-2xl p-4 border border-gray-200",
  };

  return (
    <View className={`${variantClasses[variant]} ${className}`} {...props} />
  );
}
