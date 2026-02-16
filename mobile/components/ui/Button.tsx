import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
} from "react-native";
import { Text } from "./Text";

interface Props extends TouchableOpacityProps {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: string;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  children,
  disabled,
  className = "",
  ...props
}: Props) {
  const variantClasses: Record<string, string> = {
    primary: "bg-primary-600 active:bg-primary-700",
    secondary: "bg-gray-100 active:bg-gray-200",
    outline: "border border-gray-300 active:bg-gray-50",
    ghost: "active:bg-gray-100",
    danger: "bg-red-600 active:bg-red-700",
  };

  const textColorClasses: Record<string, string> = {
    primary: "text-white",
    secondary: "text-gray-900",
    outline: "text-gray-700",
    ghost: "text-gray-700",
    danger: "text-white",
  };

  const sizeClasses: Record<string, string> = {
    sm: "px-3 py-1.5",
    md: "px-4 py-2.5",
    lg: "px-6 py-3.5",
  };

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      className={`rounded-xl items-center justify-center flex-row ${variantClasses[variant]} ${sizeClasses[size]} ${isDisabled ? "opacity-50" : ""} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "danger" ? "#fff" : "#374151"}
          style={{ marginRight: 8 }}
        />
      )}
      <Text
        variant="label"
        className={`font-semibold ${textColorClasses[variant]}`}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}
