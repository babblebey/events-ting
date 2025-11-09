/**
 * ThemeProvider Component
 * Custom theme provider using Flowbite React's theming capabilities
 */
"use client";

import { createTheme, ThemeProvider as FlowbiteThemeProvider } from "flowbite-react";

const ourTheme = createTheme({
  badge: {
    root: {
      base: "w-fit"
    }
  }
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <FlowbiteThemeProvider theme={ourTheme}>
      {children}
    </FlowbiteThemeProvider>
  );
}