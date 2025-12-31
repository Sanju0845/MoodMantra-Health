import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Edit,
  Calendar,
  LogOut,
  User as UserIcon,
  Phone,
  ChevronRight,
  Settings,
  HelpCircle,
  Shield,
  MapPin,
  Bell,
  BarChart3,
  BookOpen,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Reload profile whenever screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success) {
        setUser(response.userData);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await api.logout();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: BookOpen,
      title: "Log Mood",
      subtitle: "Track your daily feelings",
      route: "/(tabs)/journal",
      color: "#4A9B7F",
    },
    {
      icon: Edit,
      title: "Edit Profile",
      subtitle: "Update your information",
      route: "/(tabs)/profile/edit",
      color: "#10B981",
    },
    {
      icon: Calendar,
      title: "My Appointments",
      subtitle: "View booking history",
      route: "/(tabs)/profile/appointments",
      color: "#F59E0B",
    },
    {
      icon: Bell, // Using Bell or BarChart if available, Bell for now as placeholder or import Lucide icon
      title: "My Analytics",
      subtitle: "Insights & Mood Tracking",
      route: "/(tabs)/mood/dashboard",
      color: "#8B5CF6",
    },
    {
      icon: Calendar,
      title: "Mood Calendar",
      subtitle: "View mood history calendar",
      route: "/(tabs)/mood/calendar",
      color: "#4A9B7F",
    },
    {
      icon: BarChart3,
      title: "My Assessment Analytics",
      subtitle: "View assessment insights",
      route: "/(tabs)/profile/assessmentanalytics",
      color: "#10B981",
    },
    {
      icon: Settings,
      title: "Settings",
      subtitle: "App preferences & Theme",
      route: "/(tabs)/profile/settings",
      color: "#6366F1",
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help",
      route: null,
      link: "https://raskamon.com/contact",
      color: "#EC4899",
    },
    {
      icon: Shield,
      title: "Privacy Policy",
      subtitle: "Read our policy",
      route: null,
      link: "https://raskamon.com/privacy-policy",
      color: "#14B8A6",
    },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <StatusBar style="light" />

      {/* Gradient Header with Profile */}
      <LinearGradient
        colors={["#F59E0B", "#D97706", "#B45309"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 20, paddingBottom: 32, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}
      >
        {/* Profile Info */}
        <View style={{ alignItems: "center", paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ position: "relative", marginBottom: 16 }}>
            <Image
              source={{ uri: user?.image || "https://via.placeholder.com/100" }}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                borderWidth: 4,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            />
            <TouchableOpacity
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: "#FFFFFF",
                padding: 8,
                borderRadius: 20,
                borderWidth: 3,
                borderColor: "#F59E0B",
              }}
              onPress={() => router.push("/(tabs)/profile/edit")}
            >
              <Edit color="#F59E0B" size={14} />
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#FFFFFF", marginBottom: 4 }}>
            {user?.name || "User"}
          </Text>
          <Text style={{ fontSize: 14, color: "rgba(255, 255, 255, 0.9)" }}>
            {user?.email}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Personal Info */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 16 }}>
            Personal Information
          </Text>
          <View
            style={{
              backgroundColor: "#F9FAFB",
              borderRadius: 16,
              padding: 16,
            }}
          >
            {user?.phone && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ backgroundColor: "#D1FAE5", padding: 10, borderRadius: 12 }}>
                  <Phone color="#10B981" size={18} />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>Phone</Text>
                  <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>{user.phone}</Text>
                </View>
              </View>
            )}

            {user?.gender && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ backgroundColor: "#E0E7FF", padding: 10, borderRadius: 12 }}>
                  <UserIcon color="#6366F1" size={18} />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>Gender</Text>
                  <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>{user.gender}</Text>
                </View>
              </View>
            )}

            {user?.dob && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                <View style={{ backgroundColor: "#FEF3C7", padding: 10, borderRadius: 12 }}>
                  <Calendar color="#F59E0B" size={18} />
                </View>
                <View style={{ marginLeft: 14 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>Date of Birth</Text>
                  <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>
                    {new Date(user.dob).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

            {user?.address && (
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ backgroundColor: "#FCE7F3", padding: 10, borderRadius: 12 }}>
                  <MapPin color="#EC4899" size={18} />
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 2 }}>Address</Text>
                  <Text style={{ fontSize: 15, color: "#1F2937", fontWeight: "500" }}>
                    {user.address.line1}
                    {user.address.line2 && `, ${user.address.line2}`}
                  </Text>
                </View>
              </View>
            )}

            {!user?.phone && !user?.gender && !user?.dob && !user?.address && (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Text style={{ color: "#9CA3AF", fontSize: 14 }}>No personal info added yet</Text>
                <TouchableOpacity
                  style={{ marginTop: 12, backgroundColor: "#F59E0B", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 }}
                  onPress={() => router.push("/(tabs)/profile/edit")}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>Add Info</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#F3F4F6",
            }}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderColor: "#F3F4F6",
                }}
                onPress={() => {
                  if (item.link) {
                    Linking.openURL(item.link);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={{ backgroundColor: item.color + "15", padding: 10, borderRadius: 12 }}>
                  <item.icon color={item.color} size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={{ fontSize: 15, fontWeight: "600", color: "#1F2937" }}>{item.title}</Text>
                  <Text style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>{item.subtitle}</Text>
                </View>
                <ChevronRight color="#9CA3AF" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut color="#EF4444" size={22} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: "#EF4444", marginLeft: 10 }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView >
    </View >
  );
}
