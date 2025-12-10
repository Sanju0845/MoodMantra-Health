import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Calendar,
  Activity,
  MessageCircle,
  ClipboardList,
  ChevronRight,
  Bell,
  User,
} from "lucide-react-native";
import api from "../../utils/api";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../utils/theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileResponse, doctorsResponse, appointmentsResponse] =
        await Promise.all([
          api.getProfile().catch(() => ({ success: false })),
          api.getDoctors(),
          api.getUserAppointments().catch(() => ({ appointments: [] })),
        ]);

      if (profileResponse.success) {
        setUser(profileResponse.userData);
      }

      if (doctorsResponse.success) {
        setDoctors(doctorsResponse.doctors.slice(0, 5));
      }

      if (appointmentsResponse.success) {
        const upcoming = appointmentsResponse.appointments
          .filter((apt) => !apt.cancelled && !apt.isCompleted)
          .slice(0, 2);
        setAppointments(upcoming);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const quickActions = [
    {
      title: "Track Mood",
      icon: Activity,
      color: colors.primary,
      route: "/(tabs)/mood/tracker",
    },
    {
      title: "Book Appointment",
      icon: Calendar,
      color: colors.secondary,
      route: "/(tabs)/doctors/index",
    },
    {
      title: "AI Chat",
      icon: MessageCircle,
      color: colors.warning,
      route: "/(tabs)/chat",
    },
    {
      title: "Assessments",
      icon: ClipboardList,
      color: colors.info,
      route: "/assessments",
    },
  ];

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
          <View>
            <Text style={{ fontSize: fontSize.md, color: colors.textWhite, opacity: 0.9 }}>
              Welcome back,
            </Text>
            <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textWhite }}>
              {user?.name || "User"}!
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: spacing.sm,
                borderRadius: borderRadius.full,
              }}
            >
              <Bell color={colors.textWhite} size={22} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: spacing.sm,
                borderRadius: borderRadius.full,
              }}
              onPress={() => router.push("/(tabs)/profile/index")}
            >
              <User color={colors.textWhite} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={{ fontSize: fontSize.md, color: colors.textWhite, opacity: 0.9 }}>
          How are you feeling today?
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Quick Actions */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginBottom: spacing.md }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flex: 1,
                  minWidth: "45%",
                  backgroundColor: colors.cardBackground,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  alignItems: "center",
                  ...shadow.md,
                }}
                onPress={() => router.push(action.route)}
                activeOpacity={0.7}
              >
                <View
                  style={{
                    backgroundColor: action.color + "20",
                    padding: spacing.sm,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.sm,
                  }}
                >
                  <action.icon color={action.color} size={28} />
                </View>
                <Text
                  style={{
                    color: colors.textDark,
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    textAlign: "center",
                  }}
                >
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Appointments */}
        {appointments.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark }}>
                Upcoming Appointments
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/profile/appointments")}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            {appointments.map((apt) => (
              <View
                key={apt._id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  flexDirection: "row",
                  alignItems: "center",
                  ...shadow.sm,
                }}
              >
                <Image
                  source={{ uri: apt.docData?.image || "https://via.placeholder.com/60" }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: borderRadius.md,
                    marginRight: spacing.md,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textDark, marginBottom: spacing.xs }}>
                    {apt.docData?.name}
                  </Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textMedium, marginBottom: spacing.xs }}>
                    {apt.docData?.speciality}
                  </Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium }}>
                    {apt.slotDate?.replace(/_/g, "/")} at {apt.slotTime}
                  </Text>
                </View>
                <ChevronRight color={colors.textLight} size={20} />
              </View>
            ))}
          </View>
        )}

        {/* Featured Doctors */}
        <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.xl }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark }}>
              Top Specialists
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/doctors/index")}>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                View All
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {doctors.map((doctor) => (
              <TouchableOpacity
                key={doctor._id}
                style={{
                  backgroundColor: colors.cardBackground,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                  width: 160,
                  ...shadow.md,
                }}
                onPress={() => router.push(`/(tabs)/doctors/${doctor._id}`)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: doctor.image || "https://via.placeholder.com/100" }}
                  style={{
                    width: "100%",
                    height: 100,
                    borderRadius: borderRadius.md,
                    marginBottom: spacing.sm,
                  }}
                />
                <Text
                  style={{
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    color: colors.textDark,
                    marginBottom: spacing.xs,
                  }}
                  numberOfLines={1}
                >
                  {doctor.name}
                </Text>
                <Text
                  style={{ fontSize: fontSize.xs, color: colors.textMedium, marginBottom: spacing.sm }}
                  numberOfLines={1}
                >
                  {doctor.speciality}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.primary }}>
                    ₹{doctor.fees}
                  </Text>
                  {doctor.available && (
                    <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm }}>
                      <Text style={{ fontSize: 10, color: colors.success, fontWeight: fontWeight.semibold }}>
                        Available
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
