import type { FC, ReactNode } from "react";
import { ThemeContext, type ThemeContextType } from "@/hooks/useTheme";

// Re-export ThemeContext and types from useTheme hook for backward compatibility
export { ThemeContext, type ThemeContextType } from "@/hooks/useTheme";

export const ThemeProvider: FC<{
  children: ReactNode;
  value: ThemeContextType;
}> = ({ children, value }) => {
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
