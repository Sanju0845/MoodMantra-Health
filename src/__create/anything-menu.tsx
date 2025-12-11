import type React from "react";
import {
  SafeAreaProvider,
} from "react-native-safe-area-context";

// Simplified AnythingMenu - the full version requires moti/reanimated
// which are removed to reduce app size
const AnythingMenu = ({ children }: { children: React.ReactNode }) => children;

export default function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <AnythingMenu>{children}</AnythingMenu>
    </SafeAreaProvider>
  );
}
