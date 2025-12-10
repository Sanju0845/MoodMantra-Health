import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Edit,
  Calendar,
  LogOut,
  User as UserIcon,
  Mail,
  Phone,
  ChevronRight,
  Settings,
  HelpCircle,
  Shield,
  MapPin,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../../utils/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

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
      icon: Edit,
      title: "Edit Profile",
      subtitle: "Update your information",
      route: "/(tabs)/profile/edit",
    },
    {
      icon: Calendar,
      title: "My Appointments",
      subtitle: "View booking history",
      route: "/(tabs)/profile/appointments",
    },
    {
      icon: Settings,
      title: "Settings",
      subtitle: "App preferences",
      route: null,
    },
    {
      icon: HelpCircle,
      title: "Help & Support",
      subtitle: "Get help",
      route: null,
    },
    {
      icon: Shield,
      title: "Privacy Policy",
      subtitle: "Read our policy",
      route: null,
    },
  ];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Header with Profile Info */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxl,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
          alignItems: "center",
        }}
      >
        <View style={{ position: "relative", marginBottom: spacing.md }}>
          <Image
            source={{ uri: user?.image || "https://via.placeholder.com/100" }}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              borderWidth: 3,
              borderColor: colors.textWhite,
            }}
          />
          <TouchableOpacity
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: colors.cardBackground,
              padding: spacing.xs,
              borderRadius: borderRadius.full,
              ...shadow.sm,
            }}
            onPress={() => router.push("/(tabs)/profile/edit")}
          >
            <Edit color={colors.primary} size={16} />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textWhite, marginBottom: spacing.xs }}>
          {user?.name || "User"}
        </Text>
        <Text style={{ fontSize: fontSize.md, color: colors.textWhite, opacity: 0.9 }}>
          {user?.email}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Stats Card */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: -spacing.xl, marginBottom: spacing.lg }}>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
              flexDirection: "row",
              justifyContent: "space-around",
              ...shadow.md,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary }}>0</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMedium }}>Appointments</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary }}>0</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMedium }}>Mood Logs</Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border }} />
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary }}>0</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textMedium }}>Sessions</Text>
            </View>
          </View>
        </View>

        {/* Personal Info */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.md }}>
            Personal Information
          </Text>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: borderRadius.lg,
              padding: spacing.lg,
              ...shadow.sm,
            }}
          >
            {user?.phone && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
                <View style={{ backgroundColor: colors.primary + "20", padding: spacing.sm, borderRadius: borderRadius.md }}>
                  <Phone color={colors.primary} size={18} />
                </View>
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textLight }}>Phone</Text>
                  <Text style={{ fontSize: fontSize.md, color: colors.textDark }}>{user.phone}</Text>
                </View>
              </View>
            )}

            {user?.gender && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
                <View style={{ backgroundColor: colors.primary + "20", padding: spacing.sm, borderRadius: borderRadius.md }}>
                  <UserIcon color={colors.primary} size={18} />
                </View>
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textLight }}>Gender</Text>
                  <Text style={{ fontSize: fontSize.md, color: colors.textDark }}>{user.gender}</Text>
                </View>
              </View>
            )}

            {user?.dob && (
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
                <View style={{ backgroundColor: colors.primary + "20", padding: spacing.sm, borderRadius: borderRadius.md }}>
                  <Calendar color={colors.primary} size={18} />
                </View>
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textLight }}>Date of Birth</Text>
                  <Text style={{ fontSize: fontSize.md, color: colors.textDark }}>{new Date(user.dob).toLocaleDateString()}</Text>
                </View>
              </View>
            )}

            {user?.address && (
              <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <View style={{ backgroundColor: colors.primary + "20", padding: spacing.sm, borderRadius: borderRadius.md }}>
                  <MapPin color={colors.primary} size={18} />
                </View>
                <View style={{ marginLeft: spacing.md, flex: 1 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textLight }}>Address</Text>
                  <Text style={{ fontSize: fontSize.md, color: colors.textDark }}>
                    {user.address.line1}
                    {user.address.line2 && `, ${user.address.line2}`}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Menu Items */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.lg }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.md }}>
            Quick Actions
          </Text>
          <View
            style={{
              backgroundColor: colors.cardBackground,
              borderRadius: borderRadius.lg,
              ...shadow.sm,
            }}
          >
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: spacing.md,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderColor: colors.borderLight,
                }}
                onPress={() => item.route && router.push(item.route)}
                activeOpacity={0.7}
              >
                <View style={{ backgroundColor: colors.primary + "20", padding: spacing.sm, borderRadius: borderRadius.md }}>
                  <item.icon color={colors.primary} size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textDark }}>{item.title}</Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textMedium }}>{item.subtitle}</Text>
                </View>
                <ChevronRight color={colors.textLight} size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.error + "10",
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut color={colors.error} size={22} />
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.error, marginLeft: spacing.sm }}>
              Logout
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
