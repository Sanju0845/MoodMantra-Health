import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import {
  ArrowLeft,
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
  BadgeCheck,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Hide tab bar on this screen
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: 'none' },
    });

    return () => {
      navigation.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

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
      icon: Bell,
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

  // Get user initials
  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A9B7F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Abstract Header Design */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        {/* Abstract Shapes - Enhanced */}
        <Svg style={styles.abstractShape1} width="200" height="200" viewBox="0 0 200 200">
          <Path
            d="M 0 100 Q 50 0, 100 0 Q 200 0, 200 100 L 100 200 Q 0 200, 0 100 Z"
            fill="#4A9B7F"
            opacity="0.15"
          />
        </Svg>

        <Svg style={styles.abstractShape2} width="220" height="220" viewBox="0 0 220 220">
          <Circle cx="110" cy="110" r="90" fill="#10B981" opacity="0.12" />
        </Svg>

        <Svg style={styles.abstractShape3} width="160" height="160" viewBox="0 0 160 160">
          <Path
            d="M 80 0 L 160 80 L 80 160 L 0 80 Z"
            fill="#F59E0B"
            opacity="0.18"
          />
        </Svg>

        <Svg style={styles.abstractShape4} width="140" height="140" viewBox="0 0 140 140">
          <Path
            d="M 0 0 Q 140 0, 140 70 Q 105 105, 70 140 L 0 140 Z"
            fill="#EC4899"
            opacity="0.14"
          />
        </Svg>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/(tabs)/home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>

        {/* White Separator Block */}
        <View style={styles.headerSeparator} />
      </View>

      {/* Fixed Avatar - On Top of Design */}
      <View style={styles.fixedAvatarContainer}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          {/* Verification Badge */}
          <View style={styles.verificationBadge}>
            <BadgeCheck size={20} color="#FFFFFF" fill="#4A9B7F" />
          </View>
        </View>

        {/* User Name and Info */}
        <View style={styles.userInfoSection}>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userInfo}>
            ID: {user?._id?.slice(-8) || user?.id?.slice(-8) || "********"}
          </Text>
          <Text style={styles.userInfo}>
            Joined {user?.createdAt || user?.created_at
              ? new Date(user.createdAt || user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'Recently'}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 120, paddingTop: 80 }
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* Personal Info Card */}
        {(user?.phone || user?.email || user?.gender || user?.dob || user?.address) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.card}>
              {user?.email && (
                <View style={styles.infoRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#E0E7FF" }]}>
                    <UserIcon color="#6366F1" size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{user.email}</Text>
                  </View>
                </View>
              )}

              {user?.phone && (
                <View style={styles.infoRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#D1FAE5" }]}>
                    <Phone color="#10B981" size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{user.phone}</Text>
                  </View>
                </View>
              )}

              {user?.gender && (
                <View style={styles.infoRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#FEF3C7" }]}>
                    <UserIcon color="#F59E0B" size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Gender</Text>
                    <Text style={styles.infoValue}>{user.gender}</Text>
                  </View>
                </View>
              )}

              {user?.dob && (
                <View style={styles.infoRow}>
                  <View style={[styles.iconBox, { backgroundColor: "#E0E7FF" }]}>
                    <Calendar color="#6366F1" size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Date of Birth</Text>
                    <Text style={styles.infoValue}>
                      {new Date(user.dob).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              )}

              {user?.address && (
                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <View style={[styles.iconBox, { backgroundColor: "#FCE7F3" }]}>
                    <MapPin color="#EC4899" size={18} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Address</Text>
                    <Text style={styles.infoValue}>
                      {user.address.line1}
                      {user.address.line2 && `, ${user.address.line2}`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.card}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && { borderBottomWidth: 0 }
                ]}
                onPress={() => {
                  if (item.link) {
                    Linking.openURL(item.link);
                  } else if (item.route) {
                    router.push(item.route);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, { backgroundColor: item.color + "15" }]}>
                  <item.icon color={item.color} size={20} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight color="#9CA3AF" size={20} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut color="#EF4444" size={22} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Footer - Made with Love */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <Text style={styles.footerMadeWith}>Made with</Text>
            <Image
              source={require('../../../../assets/images/favicon.png')}
              style={styles.footerIcon}
            />
            <Text style={styles.footerBy}>by</Text>
          </View>
          <Text style={styles.footerBrand}>Raskamon</Text>
        </View>

        {/* Bottom Spacer - White Block */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed White Footer Overlay */}
      <View style={[styles.footerOverlay, { paddingBottom: insets.bottom }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  stickyHeader: {
    position: "absolute",
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  stickyHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  stickyBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },
  stickyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  stickyAvatarText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#F59E0B",
  },
  stickyInfo: {
    flex: 1,
  },
  stickyName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  stickyDate: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  headerContainer: {
    height: 180,
    position: "relative",
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  abstractShape1: {
    position: "absolute",
    top: -30,
    left: -50,
  },
  abstractShape2: {
    position: "absolute",
    top: -50,
    right: -70,
  },
  abstractShape3: {
    position: "absolute",
    bottom: -20,
    left: 40,
  },
  abstractShape4: {
    position: "absolute",
    bottom: 10,
    right: -30,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  headerSeparator: {
    position: "absolute",
    bottom: -10,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContent: {
    paddingTop: 20,
  },
  profileSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
    marginTop: -50,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F59E0B",
  },
  verificationBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A9B7F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  userInfo: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
    lineHeight: 16,
  },
  fixedAvatarContainer: {
    position: "absolute",
    top: 80,
    left: 80,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    zIndex: 5,
  },
  userInfoSection: {
    flex: 1,
    justifyContent: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    marginLeft: 14,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 2,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuContent: {
    flex: 1,
    marginLeft: 14,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 10,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 2,
    marginTop: 0,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  footerMadeWith: {
    fontSize: 22,
    fontWeight: "400",
    color: "#9CA3AF",
    opacity: 0.7,
    letterSpacing: 1.5,
  },
  footerIcon: {
    width: 48,
    height: 48,
    opacity: 0.8,
  },
  footerBy: {
    fontSize: 22,
    fontWeight: "400",
    color: "#9CA3AF",
    opacity: 0.7,
    letterSpacing: 1.5,
  },
  footerBrand: {
    fontSize: 96,
    fontWeight: "700",
    color: "#4A9B7F",
    opacity: 0.6,
    letterSpacing: 4,
    fontStyle: "Thin",
  },
  bottomSpacer: {
    height: 60,
    backgroundColor: "#FFFFFF",
  },
  footerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "#FFFFFF",
    pointerEvents: "none",
  },
});
