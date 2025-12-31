import { Tabs } from "expo-router";
import { View, Animated, Easing } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  House,
  ClipboardList,
  Stethoscope,
  BookOpen,
  UserCircle,
  Users,
  StickyNote,
} from "lucide-react-native";
import React from "react";

// Smooth Material Design colors
const ACTIVE_COLOR = "#4A9B7F";
const INACTIVE_COLOR = "#B0B8C1";

// Ultra-smooth Material Tab Icon
const SmoothTabIcon = ({ icon: Icon, focused }) => {
  const scaleAnim = React.useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const bgOpacityAnim = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        friction: 8,
        tension: 100,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacityAnim, {
        toValue: focused ? 1 : 0,
        duration: 250,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 48 }}>
      {/* Smooth Icon */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Icon
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
          size={24}
          strokeWidth={focused ? 2.5 : 2}
        />
      </Animated.View>
    </View>
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
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 12,
          paddingHorizontal: 4,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          elevation: 16,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: 4,
          letterSpacing: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <SmoothTabIcon icon={House} focused={focused} />
          ),
        }}
      />

      {/* Assessment Tab */}
      <Tabs.Screen
        name="assessment/index"
        options={{
          title: "Assess",
          tabBarIcon: ({ focused }) => (
            <SmoothTabIcon icon={ClipboardList} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="assessment/take" options={{ href: null }} />
      <Tabs.Screen name="assessment/result" options={{ href: null }} />

      {/* Doctor Tab */}
      <Tabs.Screen
        name="doctors"
        options={{
          title: "Care",
          tabBarIcon: ({ focused }) => (
            <SmoothTabIcon icon={Stethoscope} focused={focused} />
          ),
        }}
      />

      {/* Community Tab */}
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <SmoothTabIcon icon={Users} focused={focused} />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('community', { screen: 'index' });
          },
        })}
      />

      {/* Journal Tab - Hidden */}
      <Tabs.Screen
        name="journal"
        options={{
          href: null,
          title: "Journal",
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <SmoothTabIcon icon={UserCircle} focused={focused} />
          ),
        }}
      />

      {/* Hidden Routes */}
      <Tabs.Screen name="mood/index" options={{ href: null }} />
      <Tabs.Screen name="mood/tracker" options={{ href: null }} />
      <Tabs.Screen name="mood/dashboard" options={{ href: null }} />
      <Tabs.Screen name="mood/calendar" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null, tabBarStyle: { display: "none" } }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/appointments" options={{ href: null }} />
      <Tabs.Screen name="profile/assessmentanalytics" options={{ href: null }} />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="wellness/breathing" options={{ href: null }} />
      <Tabs.Screen name="wellness/water" options={{ href: null }} />
      <Tabs.Screen name="wellness/sleep" options={{ href: null }} />
      <Tabs.Screen name="wellness/habits" options={{ href: null }} />
    </Tabs>
  );
}
