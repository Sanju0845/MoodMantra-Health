import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Stethoscope,
  Heart,
  MessageSquare,
  UserCircle,
} from "lucide-react-native";
import { colors, fontWeight } from "../../utils/theme";
import { LinearGradient } from "expo-linear-gradient";

// Custom Tab Bar Icon with indicator (no Reanimated)
const TabIcon = ({ icon: Icon, focused, color }) => {
  return (
    <View style={styles.iconContainer}>
      {focused && (
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeIndicator}
        />
      )}
      <View style={focused ? styles.iconFocused : styles.iconNormal}>
        <Icon
          color={focused ? colors.primary : color}
          size={22}
          strokeWidth={focused ? 2.5 : 1.8}
        />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Calculate bottom padding based on device type
  const hasGestureNavigation = insets.bottom > 20;
  const bottomPadding = hasGestureNavigation ? insets.bottom - 10 : Math.max(insets.bottom, 8);
  const tabBarHeight = 60 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          paddingHorizontal: 8,
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
            },
            android: {
              elevation: 20,
              shadowColor: "#000",
            },
          }),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: fontWeight.semibold,
          marginTop: 2,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="doctors/index"
        options={{
          title: "Doctors",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Stethoscope} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="doctors/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood/index"
        options={{
          title: "Wellness",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Heart} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood/tracker"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="mood/dashboard"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={MessageSquare} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={UserCircle} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile/appointments"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 32,
  },
  activeIndicator: {
    position: "absolute",
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    opacity: 0.8,
  },
  iconFocused: {
    transform: [{ scale: 1.1 }],
  },
  iconNormal: {
    transform: [{ scale: 1 }],
  },
});
