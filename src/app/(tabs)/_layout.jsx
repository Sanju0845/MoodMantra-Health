import { Tabs } from "expo-router";
import { View, Animated, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  House,
  ClipboardList,
  Stethoscope,
  UserCircle,
  Users,
} from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";

// Material 3 colors
const ACTIVE_COLOR = "#4A9B7F";
const INACTIVE_COLOR = "#79747E";
const SURFACE_COLOR = "#FFFFFF";
const ACTIVE_INDICATOR_BG = "#E8F5F0";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Material 3 Tab Icon with smooth state transitions
const MaterialTabIcon = ({ icon: Icon, focused, index, activeIndex }) => {
  return (
    <View
      style={{
        height: 32,
        width: 64,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 16,
        overflow: "visible",
      }}
    >
      <Icon
        color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        size={18}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
};

// Material 3 Active Indicator (sliding pill)
const ActiveIndicator = ({ activeIndex, tabCount }) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Scale animation for smooth morph
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        damping: 20,
        mass: 0.8,
        stiffness: 200,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        mass: 1,
        stiffness: 180,
      }),
    ]).start();

    // Slide animation with Material easing
    Animated.spring(slideAnim, {
      toValue: activeIndex,
      useNativeDriver: true,
      damping: 20,
      mass: 1,
      stiffness: 170,
    }).start();
  }, [activeIndex]);

  const tabWidth = SCREEN_WIDTH / tabCount;
  const indicatorWidth = 64;
  const indicatorOffset = (tabWidth - indicatorWidth) / 2;

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 12,
        left: 0,
        height: 29,
        width: indicatorWidth,
        backgroundColor: ACTIVE_INDICATOR_BG,
        borderRadius: 16,
        transform: [
          {
            translateX: slideAnim.interpolate({
              inputRange: [0, tabCount - 1],
              outputRange: [
                indicatorOffset,
                (tabCount - 1) * tabWidth + indicatorOffset,
              ],
            }),
          },
          { scaleX: scaleAnim },
        ],
      }}
    />
  );
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Map tab names to indices for the active indicator
  const visibleTabs = [
    "home",
    "assessment/index",
    "doctors",
    "community",
    "profile/index",
  ];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: SURFACE_COLOR,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 6,
          letterSpacing: 0.1,
        },
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: SURFACE_COLOR,
              position: "relative",
            }}
          >
            <ActiveIndicator activeIndex={activeTabIndex} tabCount={5} />
          </View>
        ),
      }}
      screenListeners={{
        state: (e) => {
          const routes = e.data?.state?.routes;
          const index = e.data?.state?.index;
          if (routes && index !== undefined) {
            const currentRoute = routes[index];
            const tabIndex = visibleTabs.indexOf(currentRoute.name);
            if (tabIndex !== -1) {
              setActiveTabIndex(tabIndex);
            }
          }
        },
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <MaterialTabIcon
              icon={House}
              focused={focused}
              index={0}
              activeIndex={activeTabIndex}
            />
          ),
        }}
        listeners={{
          tabPress: () => setActiveTabIndex(0),
        }}
      />

      {/* Assessment Tab */}
      <Tabs.Screen
        name="assessment/index"
        options={{
          title: "Assess",
          tabBarIcon: ({ focused }) => (
            <MaterialTabIcon
              icon={ClipboardList}
              focused={focused}
              index={1}
              activeIndex={activeTabIndex}
            />
          ),
        }}
        listeners={{
          tabPress: () => setActiveTabIndex(1),
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
            <MaterialTabIcon
              icon={Stethoscope}
              focused={focused}
              index={2}
              activeIndex={activeTabIndex}
            />
          ),
        }}
        listeners={{
          tabPress: () => setActiveTabIndex(2),
        }}
      />

      {/* Community Tab */}
      <Tabs.Screen
        name="community"
        options={{
          title: "Community",
          tabBarIcon: ({ focused }) => (
            <MaterialTabIcon
              icon={Users}
              focused={focused}
              index={3}
              activeIndex={activeTabIndex}
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            setActiveTabIndex(3);
            navigation.navigate("community", { screen: "index" });
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
            <MaterialTabIcon
              icon={UserCircle}
              focused={focused}
              index={4}
              activeIndex={activeTabIndex}
            />
          ),
        }}
        listeners={{
          tabPress: () => setActiveTabIndex(4),
        }}
      />

      {/* Hidden Routes */}
      <Tabs.Screen name="mood/index" options={{ href: null }} />
      <Tabs.Screen name="mood/tracker" options={{ href: null }} />
      <Tabs.Screen name="mood/dashboard" options={{ href: null }} />
      <Tabs.Screen name="mood/calendar" options={{ href: null }} />
      <Tabs.Screen name="chat" options={{ href: null }} />
      <Tabs.Screen name="goals" options={{ href: null }} />
      <Tabs.Screen name="notes" options={{ href: null }} />
      <Tabs.Screen name="profile/edit" options={{ href: null }} />
      <Tabs.Screen name="profile/appointments" options={{ href: null }} />
      <Tabs.Screen
        name="profile/assessmentanalytics"
        options={{ href: null }}
      />
      <Tabs.Screen name="profile/settings" options={{ href: null }} />
      <Tabs.Screen name="wellness/breathing" options={{ href: null }} />
      <Tabs.Screen name="wellness/water" options={{ href: null }} />
      <Tabs.Screen name="wellness/sleep" options={{ href: null }} />
      <Tabs.Screen name="wellness/habits" options={{ href: null }} />
      <Tabs.Screen name="teen-assessment" options={{ href: null }} />
    </Tabs>
  );
}



