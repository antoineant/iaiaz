import { createContext, useContext } from "react";
import { AccentTheme, DEFAULT_ACCENT } from "./theme";

const AccentColorContext = createContext<AccentTheme>(DEFAULT_ACCENT);

export const AccentColorProvider = AccentColorContext.Provider;

export function useAccentColor(): AccentTheme {
  return useContext(AccentColorContext);
}
