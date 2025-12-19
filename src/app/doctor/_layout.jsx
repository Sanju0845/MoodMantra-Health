import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  Calendar,
  Users,
  UserCircle,
} from "lucide-react-native";

// Tab colors matching the design
const ACTIVE_COLOR = "#4A9B7F"; // Green to match app theme
const INACTIVE_COLOR = "#9CA3AF"; // Gray for inactive

// Custom Tab Bar Icon
const TabIcon = ({ icon: Icon, focused }) => {
  return (
    <Icon
      color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
      size={22}
      strokeWidth={focused ? 2.5 : 2}
    />
  );
};

export default function DoctorTabLayout() {
  const insets = useSafeAreaInsets();

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
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10,
          paddingHorizontal: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 20,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 6,
          paddingHorizontal: 4,
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Home} focused={focused} />
          ),
        }}
      />

      {/* Appointments Tab */}
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Appointments",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Calendar} focused={focused} />
          ),
        }}
      />

      {/* My Patients Tab */}
      <Tabs.Screen
        name="patients"
        options={{
          title: "Patients",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Users} focused={focused} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={UserCircle} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}


