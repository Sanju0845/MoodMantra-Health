import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  ClipboardList,
  Stethoscope,
  BookOpen,
  UserCircle,
  Users,
} from "lucide-react-native";

// Tab colors matching the design
const ACTIVE_COLOR = "#4A9B7F"; // Green to match app theme
const INACTIVE_COLOR = "#9CA3AF"; // Gray for inactive

// Custom Tab Bar Icon
const TabIcon = ({ icon: Icon, focused }) => {
  return (
    <Icon
      color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
      size={24}
      strokeWidth={focused ? 2.5 : 2}
    />
  );
};

export default function TabLayout() {
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
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 6,
          paddingHorizontal: 10,
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
          fontSize: 10,
          fontWeight: "600",
          marginTop: 1,
          marginBottom: 1,
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
          title: "Assess",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={ClipboardList} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="assessment/take" options={{ href: null }} />
      <Tabs.Screen name="assessment/result" options={{ href: null }} />

      {/* Doctor Tab */}
      <Tabs.Screen
        name="doctors/index"
        options={{
          title: "Care",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Stethoscope} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="doctors/[id]" options={{ href: null }} />
      <Tabs.Screen name="doctors/payment" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="doctors/nearme" options={{ href: null }} />

      {/* Community Tab */}
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Users} focused={focused} />
          ),
        }}
        listeners={({ navigation, route }) => ({
          tabPress: (e) => {
            // Navigate to community index when tab is pressed
            navigation.navigate('community', { screen: 'index' });
          },
        })}
      />

      {/* Journal Tab */}
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
      <Tabs.Screen name="mood/index" options={{ href: null }} />
      <Tabs.Screen name="mood/tracker" options={{ href: null }} />
      <Tabs.Screen name="mood/dashboard" options={{ href: null }} />
      <Tabs.Screen name="mood/calendar" options={{ href: null }} />

      {/* Hidden chat route - NOT SHOWN IN TAB BAR */}
      <Tabs.Screen
        name="chat"
        options={{
          href: null, // This hides the tab from the bottom navigation
          tabBarStyle: { display: "none" },
        }}
      />

      {/* Hidden goals route */}
      <Tabs.Screen name="goals" options={{ href: null }} />

      {/* Profile Tab - Hidden from footer, accessible from home screen */}
      <Tabs.Screen
        name="profile/index"
        options={{
          href: null, // Hidden from tab bar
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={UserCircle} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/appointments" options={{ href: null }} />
      <Tabs.Screen name="profile/assessmentanalytics" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />

      {/* Wellness Routes */}
      <Tabs.Screen name="wellness/breathing" options={{ href: null }} />
      <Tabs.Screen name="wellness/water" options={{ href: null }} />
      <Tabs.Screen name="wellness/sleep" options={{ href: null }} />
      <Tabs.Screen name="wellness/habits" options={{ href: null }} />
    </Tabs>
  );
}