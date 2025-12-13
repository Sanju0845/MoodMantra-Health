import { Tabs } from "expo-router";
import { View, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Home,
  ClipboardList,
  Stethoscope,
  BookOpen,
  UserCircle,
} from "lucide-react-native";

// Tab colors matching the design
const ACTIVE_COLOR = "#4A9B7F"; // Green to match app theme
const INACTIVE_COLOR = "#9CA3AF"; // Gray for inactive

// Custom Tab Bar Icon
const TabIcon = ({ icon: Icon, focused }) => {
  return (
    <View style={styles.iconContainer}>
      <Icon
        color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        size={22}
        strokeWidth={focused ? 2.2 : 1.8}
      />
    </View>
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Calculate bottom padding based on device type
  const hasGestureNavigation = insets.bottom > 20;
  const bottomPadding = hasGestureNavigation ? insets.bottom - 5 : Math.max(insets.bottom, 10);
  const tabBarHeight = 70 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: tabBarHeight,
          paddingTop: 12,
          paddingBottom: bottomPadding,
          paddingHorizontal: 8,
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
            android: {
              elevation: 20,
            },
          }),
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 6,
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Home} focused={focused} />
          ),
        }}
      />

      {/* Assessment Tab */}
      <Tabs.Screen
        name="assessment/index"
        options={{
          title: "Assessment",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ClipboardList} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="assessment/take"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assessment/result"
        options={{
          href: null,
        }}
      />

      {/* Doctor Tab */}
      <Tabs.Screen
        name="doctors/index"
        options={{
          title: "Doctors",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Stethoscope} focused={focused} />
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
        name="doctors/payment"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="doctors/nearme"
        options={{
          href: null,
        }}
      />

      {/* Journal Tab - with mood tracking */}
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={BookOpen} focused={focused} />
          ),
        }}
      />

      {/* Hidden mood routes */}
      <Tabs.Screen
        name="mood/index"
        options={{
          href: null,
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
        name="mood/calendar"
        options={{
          href: null,
        }}
      />

      {/* Hidden chat route */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null,
        }}
      />

      {/* Hidden goals route */}
      <Tabs.Screen
        name="goals"
        options={{
          href: null,
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={UserCircle} focused={focused} />
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
      <Tabs.Screen
        name="profile/settings"
        options={{
          href: null,
        }}
      />

      {/* Wellness Routes - Local Features */}
      <Tabs.Screen
        name="wellness/breathing"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wellness/water"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wellness/sleep"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="wellness/habits"
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
});
