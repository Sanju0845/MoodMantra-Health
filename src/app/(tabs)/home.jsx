import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  StyleSheet,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Smile,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  MessageCircle,
  BookOpen,
  Users,
  Heart,
  Zap,
  Target,
  Bell,
  ClipboardList,
  Stethoscope,
  MapPin,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedButton, { AnimatedCard } from "../../components/AnimatedButton";
import Svg, { Circle } from "react-native-svg";

// Daily inspirational quotes
const DAILY_QUOTES = [
  "Embrace the journey of healing, one small step at a time.",
  "Your mental health is a priority. Your happiness is essential.",
  "It's okay to take things day by day.",
  "Small progress is still progress.",
  "Be gentle with yourself. You're doing the best you can.",
  "Every day is a fresh start.",
  "You are stronger than you think.",
];

// Circle Progress Component - starts from top
const CircleProgress = ({ size = 70, strokeWidth = 6, progress = 0, color = "#4A9B7F", bgColor = "#E5E7EB", children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <View style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      {/* Center content */}
      <View style={{ position: "absolute", justifyContent: "center", alignItems: "center" }}>
        {children}
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [userAssessments, setUserAssessments] = useState([]);
  const [moodDashboard, setMoodDashboard] = useState(null);
  const [dailyQuote, setDailyQuote] = useState(DAILY_QUOTES[0]);
  const [showChatTooltip, setShowChatTooltip] = useState(true);

  // Chat tooltip animation
  const tooltipScale = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  // Slider state for slide-to-log mood
  const SLIDER_WIDTH = Dimensions.get("window").width - 80; // Container width minus padding
  const THUMB_SIZE = 60;
  const SLIDE_THRESHOLD = SLIDER_WIDTH - THUMB_SIZE - 20; // How far to slide to trigger
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [slideComplete, setSlideComplete] = useState(false);

  // Pulse animation for slider hint
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulse animation loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        slideX.stopAnimation();
        slideX.setOffset(slideX._value);
        slideX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(gestureState.dx + slideX._offset, SLIDE_THRESHOLD));
        slideX.setValue(newX - slideX._offset);
      },
      onPanResponderRelease: (_, gestureState) => {
        slideX.flattenOffset();
        const currentValue = slideX._value;

        if (currentValue >= SLIDE_THRESHOLD * 0.75) {
          // Slide complete - animate and navigate to journal
          setSlideComplete(true);

          // Smooth animation to end
          Animated.timing(slideX, {
            toValue: SLIDE_THRESHOLD,
            duration: 150,
            useNativeDriver: true,
          }).start();

          // Fade out screen for smooth transition
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            router.push("/(tabs)/journal");
            // Reset after navigation
            setTimeout(() => {
              slideX.setValue(0);
              fadeAnim.setValue(1);
              setSlideComplete(false);
            }, 400);
          });
        } else {
          // Spring back to start with smooth physics
          Animated.spring(slideX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    loadData();
    // Get daily quote based on day of year
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    setDailyQuote(DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]);

    // Show chat tooltip for 3 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(tooltipScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 10,
        }),
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Hide after 5 seconds
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(tooltipScale, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(tooltipOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => setShowChatTooltip(false));
      }, 5000);
    }, 500);
  }, []);

  const loadData = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");

      const [profileResponse, appointmentsResponse] = await Promise.all([
        api.getProfile().catch(() => ({ success: false })),
        api.getUserAppointments().catch(() => ({ appointments: [] })),
      ]);

      if (profileResponse.success) {
        setUser(profileResponse.userData);
      }

      if (appointmentsResponse.success) {
        const upcoming = appointmentsResponse.appointments
          .filter((apt) => !apt.cancelled && !apt.isCompleted)
          .slice(0, 3);
        setAppointments(upcoming);
      }

      // Fetch user data from server
      if (userId) {
        // Get user assessments
        try {
          const assessmentsData = await api.getUserAssessments(userId);
          if (Array.isArray(assessmentsData)) {
            setUserAssessments(assessmentsData.slice(0, 3));
          }
        } catch (e) {
          console.log("[Home] No user assessments");
        }

        // Get mood dashboard analytics
        try {
          const dashboardData = await api.getMoodDashboard(userId, 30);
          if (dashboardData) {
            setMoodDashboard(dashboardData.dashboard || dashboardData);
          }
        } catch (e) {
          console.log("[Home] No mood dashboard data");
        }
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

  const formatAppointmentDate = (slotDate, slotTime) => {
    try {
      const parts = slotDate.includes("_")
        ? slotDate.split("_")
        : slotDate.split("/");
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const year = parseInt(parts[2]);

      const date = new Date(year, month, day);
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      const monthName = date.toLocaleDateString("en-US", { month: "short" });

      return `${dayName}, ${monthName} ${day}th - ${slotTime}`;
    } catch (e) {
      return `${slotDate} - ${slotTime}`;
    }
  };

  const getTrendIcon = (trend) => {
    if (trend === "improving") return TrendingUp;
    if (trend === "declining") return TrendingDown;
    return Minus;
  };

  const getTrendColor = (trend) => {
    if (trend === "improving") return "#10B981";
    if (trend === "declining") return "#EF4444";
    return "#9CA3AF";
  };

  const getMoodLabel = (score) => {
    if (score >= 4) return "Great";
    if (score >= 3) return "Good";
    if (score >= 2) return "Okay";
    return "Low";
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#4A9B7F" />
      </View>
    );
  }

  const analytics = moodDashboard?.analytics;
  const trend = analytics?.trend || "stable";
  const TrendIcon = getTrendIcon(trend);

  return (
    <Animated.View style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hi {user?.name?.split(" ")[0] || "there"}!
          </Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
            <Image
              source={{
                uri: user?.image || "https://via.placeholder.com/50",
              }}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        {/* Mood Card - Slide to Log */}
        <LinearGradient
          colors={["#4A9B7F", "#3B8068"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moodCard}
        >
          <View style={styles.moodCardContent}>
            <View style={styles.moodCardLeft}>
              <Text style={styles.moodCardTitle}>How are you{"\n"}feeling today?</Text>
              <Text style={styles.moodCardSubtitle}>Slide to log your mood</Text>
            </View>
            <View style={styles.moodEmojisRow}>
              <Text style={styles.moodEmoji}>😊</Text>
              <Text style={styles.moodEmoji}>😌</Text>
              <Text style={styles.moodEmoji}>😢</Text>
              <Text style={styles.moodEmoji}>😤</Text>
            </View>
          </View>

          {/* Slide to Log Mood Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              {/* Background text with animated arrow */}
              <View style={styles.sliderTextContainer}>
                <Text style={styles.sliderText}>Slide to log mood</Text>
                <Animated.Text
                  style={[
                    styles.sliderArrow,
                    { transform: [{ scale: pulseAnim }] }
                  ]}
                >
                  →→
                </Animated.Text>
              </View>

              {/* Draggable thumb with glow */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.sliderThumb,
                  {
                    transform: [
                      { translateX: slideX },
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.1],
                          outputRange: [1, 1.05],
                        })
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.sliderThumbGlow} />
                <Smile size={28} color="#4A9B7F" />
              </Animated.View>
            </View>
          </View>
        </LinearGradient>

        {/* Daily Quote - Bigger & Better */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteIconContainer}>
            <Text style={styles.quoteIcon}>✨</Text>
          </View>
          <Text style={styles.quoteLabel}>Daily Inspiration</Text>
          <Text style={styles.quoteText}>"{dailyQuote}"</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/assessment")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#E0F2FE" }]}>
                <ClipboardList size={28} color="#0EA5E9" />
              </View>
              <Text style={styles.quickActionText}>Assessments</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/doctors")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FCE7F3" }]}>
                <Stethoscope size={28} color="#EC4899" />
              </View>
              <Text style={styles.quickActionText}>Doctors</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/goals")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Target size={28} color="#EF4444" />
              </View>
              <Text style={styles.quickActionText}>Goals</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/journal")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
                <BookOpen size={28} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionText}>Journal</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#E6F4F0" }]}>
                <MessageCircle size={28} color="#4A9B7F" />
              </View>
              <Text style={styles.quickActionText}>Raska AI</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/doctors/nearme")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#DBEAFE" }]}>
                <MapPin size={28} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>Near Me</Text>
            </AnimatedButton>
          </View>
        </View>

        {/* Wellness Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wellness Tips</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tipsContainer}
          >
            <View style={[styles.tipCard, { backgroundColor: "#E6F4F0" }]}>
              <Heart size={24} color="#4A9B7F" />
              <Text style={styles.tipTitle}>Practice Gratitude</Text>
              <Text style={styles.tipText}>Write down 3 things you're grateful for today</Text>
            </View>
            <View style={[styles.tipCard, { backgroundColor: "#FEF3C7" }]}>
              <Zap size={24} color="#F59E0B" />
              <Text style={styles.tipTitle}>Stay Active</Text>
              <Text style={styles.tipText}>Take a 10-minute walk to boost your energy</Text>
            </View>
            <View style={[styles.tipCard, { backgroundColor: "#FCE7F3" }]}>
              <Target size={24} color="#EC4899" />
              <Text style={styles.tipTitle}>Set Goals</Text>
              <Text style={styles.tipText}>Focus on one small achievable goal today</Text>
            </View>
            <View style={[styles.tipCard, { backgroundColor: "#E0F2FE" }]}>
              <Users size={24} color="#0EA5E9" />
              <Text style={styles.tipTitle}>Stay Connected</Text>
              <Text style={styles.tipText}>Reach out to a friend or loved one</Text>
            </View>
          </ScrollView>
        </View>

        {/* Mood Analytics - from server */}
        {analytics && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mood Analytics</Text>
              <Text style={styles.sectionSubtitle}>Last 30 Days</Text>
            </View>
            <View style={styles.analyticsGrid}>
              {/* Average Mood - Circle Progress (Scale 1-5) */}
              <View style={[styles.analyticsCard, { flex: 1 }]}>
                <CircleProgress
                  size={70}
                  strokeWidth={7}
                  progress={(analytics.basicStats?.averageScore || 0) / 5}
                  color="#4A9B7F"
                  bgColor="#E6F4F0"
                >
                  <Text style={styles.circleValue}>
                    {analytics.basicStats?.averageScore?.toFixed(1) || "—"}
                  </Text>
                  <Text style={styles.circleLabel}>/ 5</Text>
                </CircleProgress>
                <Text style={styles.analyticsLabel}>Avg Mood</Text>
              </View>

              {/* Total Entries - Circle Progress */}
              <View style={[styles.analyticsCard, { flex: 1 }]}>
                <CircleProgress
                  size={70}
                  strokeWidth={7}
                  progress={Math.min((analytics.basicStats?.totalEntries || 0) / 30, 1)}
                  color="#F59E0B"
                  bgColor="#FEF3C7"
                >
                  <Text style={[styles.circleValue, { color: "#F59E0B" }]}>
                    {analytics.basicStats?.totalEntries || 0}
                  </Text>
                  <Text style={styles.circleLabel}>logs</Text>
                </CircleProgress>
                <Text style={styles.analyticsLabel}>Entries</Text>
              </View>

              {/* Trend Indicator */}
              <View style={[styles.analyticsCard, { flex: 1 }]}>
                <CircleProgress
                  size={70}
                  strokeWidth={7}
                  progress={analytics.trend === "improving" ? 0.8 : analytics.trend === "declining" ? 0.3 : 0.5}
                  color={getTrendColor(analytics.trend)}
                  bgColor={analytics.trend === "improving" ? "#D1FAE5" :
                    analytics.trend === "declining" ? "#FEE2E2" : "#F3F4F6"}
                >
                  <TrendIcon
                    size={22}
                    color={getTrendColor(analytics.trend)}
                  />
                </CircleProgress>
                <Text style={styles.analyticsLabel}>
                  {analytics.trend === "improving" ? "Improving" :
                    analytics.trend === "declining" ? "Declining" : "Stable"}
                </Text>
              </View>
            </View>

            {/* Mood Distribution Bar */}
            {analytics.moodDistribution && (
              <View style={styles.distributionCard}>
                <Text style={styles.distributionTitle}>30-Day Mood Distribution</Text>
                <View style={styles.distributionBar}>
                  {Object.entries(analytics.moodDistribution).map(([mood, count], index) => {
                    const total = Object.values(analytics.moodDistribution).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    const colors = {
                      happy: "#10B981",
                      neutral: "#F59E0B",
                      sad: "#6B7280",
                      anxious: "#8B5CF6",
                      angry: "#EF4444"
                    };
                    return percentage > 0 ? (
                      <View
                        key={mood}
                        style={[
                          styles.distributionSegment,
                          {
                            width: `${percentage}%`,
                            backgroundColor: colors[mood] || "#9CA3AF",
                            borderTopLeftRadius: index === 0 ? 4 : 0,
                            borderBottomLeftRadius: index === 0 ? 4 : 0,
                          }
                        ]}
                      />
                    ) : null;
                  })}
                </View>
                <View style={styles.distributionLegend}>
                  {Object.entries(analytics.moodDistribution).map(([mood, count]) => {
                    const colors = {
                      happy: "#10B981",
                      neutral: "#F59E0B",
                      sad: "#6B7280",
                      anxious: "#8B5CF6",
                      angry: "#EF4444"
                    };
                    return count > 0 ? (
                      <View key={mood} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: colors[mood] || "#9CA3AF" }]} />
                        <Text style={styles.legendText}>{mood}: {count}</Text>
                      </View>
                    ) : null;
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Upcoming Appointments - from server */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <TouchableOpacity
                key={apt._id}
                style={styles.appointmentCard}
                onPress={() => router.push({
                  pathname: "/(tabs)/doctors/[id]",
                  params: { id: apt.docData?._id }
                })}
              >
                <View style={styles.appointmentIcon}>
                  <Calendar size={20} color="#4A9B7F" />
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={styles.appointmentTitle}>
                    {apt.docData?.name
                      ? `${apt.sessionType || "Therapy"} Session with ${apt.docData.name}`
                      : "Therapy Session"}
                  </Text>
                  <Text style={styles.appointmentDate}>
                    {formatAppointmentDate(apt.slotDate, apt.slotTime)}
                  </Text>
                </View>
                <Text style={styles.detailsLink}>Details</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No upcoming appointments</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push("/(tabs)/doctors")}
              >
                <Text style={styles.bookButtonText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Assessments - from server */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Assessments</Text>
          {userAssessments.length > 0 ? (
            userAssessments.map((assessment) => (
              <TouchableOpacity
                key={assessment._id}
                style={styles.assessmentCard}
                onPress={() => router.push("/(tabs)/assessment")}
              >
                <View style={styles.assessmentInfo}>
                  <Text style={styles.assessmentTitle} numberOfLines={2}>
                    {assessment.title}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: "100%" }]} />
                    </View>
                  </View>
                </View>
                <Text style={styles.progressText}>
                  100%{"\n"}
                  <Text style={styles.progressLabel}>Completed</Text>
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No assessments yet</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push("/(tabs)/assessment")}
              >
                <Text style={styles.bookButtonText}>Take Assessment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat Tooltip */}
      {showChatTooltip && (
        <Animated.View
          style={[
            styles.chatTooltip,
            {
              opacity: tooltipOpacity,
              transform: [{ scale: tooltipScale }],
            }
          ]}
        >
          <View style={styles.tooltipArrow} />
          <Text style={styles.tooltipText}>Chat with Raska AI 💬</Text>
        </Animated.View>
      )}

      {/* Floating AI Chat Button */}
      <AnimatedButton
        style={styles.floatingChatButton}
        onPress={() => router.push("/(tabs)/chat")}
        scale={0.9}
      >
        <LinearGradient
          colors={["#4A9B7F", "#3B8068"]}
          style={styles.floatingChatGradient}
        >
          <MessageCircle size={20} color="#FFFFFF" />
        </LinearGradient>
      </AnimatedButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E5E7EB",
  },
  moodCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  moodCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  moodCardLeft: {
    flex: 1,
  },
  moodCardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 28,
  },
  moodCardSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
  },
  moodEmojisRow: {
    flexDirection: "row",
    gap: 4,
  },
  moodEmoji: {
    fontSize: 24,
  },
  logMoodButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
  },
  logMoodText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4A9B7F",
  },
  sliderContainer: {
    marginTop: 4,
  },
  sliderTrack: {
    height: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 30,
    justifyContent: "center",
    overflow: "hidden",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 30,
  },
  sliderTextContainer: {
    position: "absolute",
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  sliderText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 0.5,
  },
  sliderArrow: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,1)",
  },
  sliderThumb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 3,
    shadowColor: "#4A9B7F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sliderThumbGlow: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(74, 155, 127, 0.2)",
  },
  // Circle Progress Styles
  circleProgressContainer: {
    width: 70,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  circleProgressBg: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderColor: "#E5E7EB",
  },
  circleProgressFill: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 6,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  circleProgressInner: {
    justifyContent: "center",
    alignItems: "center",
  },
  circleValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4A9B7F",
  },
  circleLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  quoteCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  quoteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quoteIcon: {
    fontSize: 24,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#78350F",
    lineHeight: 26,
    textAlign: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  analyticsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  analyticsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  analyticsLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  distributionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  distributionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 12,
  },
  distributionBar: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  distributionSegment: {
    height: "100%",
  },
  distributionLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  appointmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  appointmentDate: {
    fontSize: 13,
    color: "#6B7280",
  },
  detailsLink: {
    fontSize: 14,
    color: "#4A9B7F",
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  bookButton: {
    backgroundColor: "#4A9B7F",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  assessmentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  assessmentInfo: {
    flex: 1,
  },
  assessmentTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  progressContainer: {
    width: "100%",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A9B7F",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "right",
    marginLeft: 12,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "400",
    color: "#9CA3AF",
  },
  // Floating Chat Button
  floatingChatButton: {
    position: "absolute",
    right: 16,
    bottom: 100,
    alignItems: "center",
  },
  floatingChatGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A9B7F",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  // Quick Actions
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "31%",
    alignItems: "center",
    marginBottom: 18,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
    textAlign: "center",
  },
  // Wellness Tips
  tipsContainer: {
    paddingRight: 20,
    gap: 12,
  },
  tipCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    marginLeft: 0,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
  // Chat tooltip
  chatTooltip: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#4A9B7F",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -8,
    right: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#4A9B7F",
  },
  tooltipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});