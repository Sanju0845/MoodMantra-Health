import { useState, useEffect, useRef, useCallback } from "react";
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
import { useRouter, useFocusEffect } from "expo-router";
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
  Wind,
  Flame,
  Droplets,
  Moon,
  CheckSquare,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedButton, { AnimatedCard } from "../../components/AnimatedButton";
import Svg, { Circle } from "react-native-svg";
import "../../i18n"; // Init i18n
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { Globe } from "lucide-react-native";


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
  const [moodEntries, setMoodEntries] = useState([]);
  const [loggingStreak, setLoggingStreak] = useState(0);
  const [dailyQuote, setDailyQuote] = useState(DAILY_QUOTES[0]);
  const [showChatTooltip, setShowChatTooltip] = useState(true);
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);

  // Wellness data from local storage
  const [waterToday, setWaterToday] = useState(0);
  const [sleepToday, setSleepToday] = useState(0);
  const [breathingToday, setBreathingToday] = useState(0);
  const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  ];

  const changeLanguage = async (langCode) => {
    await i18n.changeLanguage(langCode);
    await AsyncStorage.setItem('language', langCode);
    setShowLanguageModal(false);
  };

  // Chat tooltip animation
  const tooltipScale = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  // Slider state for slide-to-log mood
  const SLIDER_WIDTH = Dimensions.get("window").width - 80; // Container width minus padding
  const THUMB_SIZE = 60;
  const SLIDE_THRESHOLD = SLIDER_WIDTH - THUMB_SIZE - 20; // How far to slide to trigger
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [slideComplete, setSlideComplete] = useState(false);

  // Animation refs
  const slideX = useRef(new Animated.Value(0)).current;
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

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadWellnessData();
    }, [])
  );
  useEffect(() => {
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

  const loadWellnessData = async () => {
    try {
      const today = new Date().toDateString();

      // Load water data
      const waterData = await AsyncStorage.getItem("waterData");
      if (waterData) {
        const data = JSON.parse(waterData);
        const todayData = data.find(d => d.date === today);
        setWaterToday(todayData?.cups || 0);
      }

      // Load sleep data
      const sleepData = await AsyncStorage.getItem("sleepData");
      if (sleepData) {
        const data = JSON.parse(sleepData);
        const todayData = data.find(d => d.date === today);
        setSleepToday(todayData?.hours || 0);
      }

      // Load breathing data
      const breathingData = await AsyncStorage.getItem("breathingData");
      if (breathingData) {
        const data = JSON.parse(breathingData);
        const todayData = data.find(d => d.date === today);
        setBreathingToday(todayData?.sessions || 0);
      }
    } catch (error) {
      console.error("Error loading wellness data:", error);
    }
  };

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

        // Get mood entries for streak calculation (use weekly analytics)
        try {
          const weeklyData = await api.getWeeklyMoodAnalytics(userId);
          if (weeklyData?.moodData) {
            setMoodEntries(weeklyData.moodData);
            // Calculate streak
            const entries = weeklyData.moodData;
            if (entries.length > 0) {
              let streak = 0;
              const today = new Date();
              today.setHours(0, 0, 0, 0);

              const sorted = [...entries].sort((a, b) =>
                new Date(b.date || b.timestamp || b.createdAt) - new Date(a.date || a.timestamp || a.createdAt)
              );

              let checkDate = new Date(today);
              for (const entry of sorted) {
                const entryDate = new Date(entry.date || entry.timestamp || entry.createdAt);
                entryDate.setHours(0, 0, 0, 0);

                if (entryDate.getTime() === checkDate.getTime()) {
                  streak++;
                  checkDate.setDate(checkDate.getDate() - 1);
                } else if (entryDate.getTime() < checkDate.getTime()) {
                  break;
                }
              }
              setLoggingStreak(streak);
            }
          }
        } catch (e) {
          console.log("[Home] No mood entries");
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
    loadWellnessData();
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

  const moodAnalytics = moodDashboard?.analytics || analytics;
  const trend = moodAnalytics?.trend || "stable";
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
            {t('greeting')} {user?.name?.split(" ")[0] || t('greeting_placeholder')}!
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 8, borderRadius: 20 }}
              onPress={() => setShowLanguageModal(true)}
            >
              <Globe size={18} color="#475569" />
              <Text style={{ fontSize: 12, color: "#475569", fontWeight: "600", marginLeft: 4 }}>
                {LANGUAGES.find(l => l.code === i18n.language)?.code?.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
              <Image
                source={{
                  uri: user?.image || "https://via.placeholder.com/50",
                }}
                style={styles.profileImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Language Modal */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: 'white', borderRadius: 20, padding: 20, width: '100%', maxWidth: 300 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: '#1E293B' }}>
                Select Language
              </Text>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F1F5F9',
                    backgroundColor: i18n.language === lang.code ? '#F0FDF4' : 'transparent',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    marginBottom: 4
                  }}
                  onPress={() => changeLanguage(lang.code)}
                >
                  <Text style={{
                    fontSize: 16,
                    fontWeight: i18n.language === lang.code ? 'bold' : 'normal',
                    color: i18n.language === lang.code ? '#166534' : '#334155'
                  }}>
                    {lang.native} ({lang.label})
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 16, padding: 12, alignItems: 'center' }}
                onPress={() => setShowLanguageModal(false)}
              >
                <Text style={{ color: '#64748B', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>


        {/* Mood Card - Slide to Log */}
        <LinearGradient
          colors={["#4A9B7F", "#3B8068"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moodCard}
        >
          <View style={styles.moodCardContent}>
            <View style={styles.moodCardLeft}>
              <Text style={styles.moodCardTitle}>{t('how_are_you')}</Text>
              <Text style={styles.moodCardSubtitle}>{t('slide_to_log')}</Text>
            </View>
            <View style={styles.moodCardRight}>
              {loggingStreak > 0 && (
                <View style={styles.streakBadge}>
                  <Flame size={14} color="#F59E0B" />
                  <Text style={styles.streakBadgeText}>{loggingStreak}</Text>
                </View>
              )}
              <View style={styles.moodEmojisRow}>
                <Text style={styles.moodEmoji}>😊</Text>
                <Text style={styles.moodEmoji}>😌</Text>
                <Text style={styles.moodEmoji}>😢</Text>
                <Text style={styles.moodEmoji}>😤</Text>
              </View>
            </View>
          </View>

          {/* Slide to Log Mood Slider */}
          <View style={styles.sliderContainer}>
            <View style={styles.sliderTrack}>
              {/* Background text with animated arrow */}
              <View style={styles.sliderTextContainer}>
                <Text style={styles.sliderText}>{t('slide_to_log')}</Text>
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

        {/* Quick Actions - Now includes Breathing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
          <View style={styles.quickActionsGrid}>
            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/wellness/breathing")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#E6F4F0" }]}>
                <Wind size={28} color="#4A9B7F" />
              </View>
              <Text style={styles.quickActionText}>{t('breathing')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/journal")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEF3C7" }]}>
                <BookOpen size={28} color="#F59E0B" />
              </View>
              <Text style={styles.quickActionText}>{t('journal')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/assessment")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#E0F2FE" }]}>
                <ClipboardList size={28} color="#0EA5E9" />
              </View>
              <Text style={styles.quickActionText}>{t('assessment')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FCE7F3" }]}>
                <MessageCircle size={28} color="#EC4899" />
              </View>
              <Text style={styles.quickActionText}>{t('raska_ai')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/doctors")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#DBEAFE" }]}>
                <Stethoscope size={28} color="#3B82F6" />
              </View>
              <Text style={styles.quickActionText}>{t('doctors')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCard}
              onPress={() => router.push("/(tabs)/goals")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: "#FEE2E2" }]}>
                <Target size={28} color="#EF4444" />
              </View>
              <Text style={styles.quickActionText}>{t('goals')}</Text>
            </AnimatedButton>
          </View>
        </View>

        {/* Today's Focus Card */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.focusCard}
        >
          <View style={styles.focusCardHeader}>
            <Text style={styles.focusCardTitle}>Today's Focus</Text>
            <Zap size={20} color="#FDE68A" />
          </View>
          <Text style={styles.focusCardText}>
            Take 5 minutes for mindful breathing and set your intention for the day
          </Text>
          <TouchableOpacity style={styles.focusButton}>
            <Text style={styles.focusButtonText}>Start Now</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Wellness Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wellness Progress</Text>
            <Text style={styles.sectionSubtitle}>Today's goals</Text>
          </View>
          <View style={styles.progressGrid}>
            {/* Water Intake */}
            <View style={styles.progressCard}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={waterToday / 10}
                color="#3B82F6"
                bgColor="#DBEAFE"
              >
                <Droplets size={24} color="#3B82F6" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Water</Text>
              <Text style={styles.progressValue}>{waterToday}/10 cups</Text>
            </View>

            {/* Sleep */}
            <View style={styles.progressCard}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={sleepToday / 8}
                color="#4A9B7F"
                bgColor="#E6F4F0"
              >
                <Moon size={24} color="#4A9B7F" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Sleep</Text>
              <Text style={styles.progressValue}>{sleepToday.toFixed(1)} hrs</Text>
            </View>

            {/* Breathing */}
            <View style={styles.progressCard}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={breathingToday / 3}
                color="#10B981"
                bgColor="#D1FAE5"
              >
                <Wind size={24} color="#10B981" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Breathing</Text>
              <Text style={styles.progressValue}>{breathingToday}/3 sessions</Text>
            </View>
          </View>
        </View>

        {/* Mindfulness Moment */}
        <View style={styles.mindfulnessCard}>
          <View style={styles.mindfulnessHeader}>
            <Text style={styles.mindfulnessEmoji}>🧘‍♀️</Text>
            <View style={styles.mindfulnessTextContainer}>
              <Text style={styles.mindfulnessTitle}>Mindfulness Moment</Text>
              <Text style={styles.mindfulnessSubtitle}>Take a deep breath</Text>
            </View>
          </View>
          <Text style={styles.mindfulnessQuote}>
            "The present moment is filled with joy and happiness. If you are attentive, you will see it."
          </Text>
        </View>

        {/* Daily Inspiration - Compact inline */}
        <View style={styles.quoteCardCompact}>
          <Text style={styles.quoteEmoji}>✨</Text>
          <Text style={styles.quoteTextCompact}>"{dailyQuote}"</Text>
        </View>

        {/* Wellness Tools Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('wellness_tools')}</Text>
          <View style={styles.wellnessGrid}>
            <AnimatedButton
              style={styles.wellnessCard}
              onPress={() => router.push("/(tabs)/wellness/water")}
            >
              <View style={[styles.wellnessIcon, { backgroundColor: "#DBEAFE" }]}>
                <Droplets size={24} color="#3B82F6" />
              </View>
              <Text style={styles.wellnessLabel}>{t('water')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.wellnessCard}
              onPress={() => router.push("/(tabs)/wellness/sleep")}
            >
              <View style={[styles.wellnessIcon, { backgroundColor: "#F3E8FF" }]}>
                <Moon size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.wellnessLabel}>{t('sleep')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.wellnessCard}
              onPress={() => router.push("/(tabs)/wellness/habits")}
            >
              <View style={[styles.wellnessIcon, { backgroundColor: "#DCFCE7" }]}>
                <CheckSquare size={24} color="#22C55E" />
              </View>
              <Text style={styles.wellnessLabel}>{t('habits')}</Text>
            </AnimatedButton>

            <AnimatedButton
              style={styles.wellnessCard}
              onPress={() => router.push("/(tabs)/mood/calendar")}
            >
              <View style={[styles.wellnessIcon, { backgroundColor: "#FEF3C7" }]}>
                <Calendar size={24} color="#F59E0B" />
              </View>
              <Text style={styles.wellnessLabel}>{t('calendar')}</Text>
            </AnimatedButton>
          </View>
        </View>

        {/* Analytics - Navigation Buttons */}
        {moodAnalytics && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Analytics</Text>
              <Text style={styles.sectionSubtitle}>View detailed insights</Text>
            </View>
            <View style={styles.analyticsGrid}>
              {/* Mood Analytics Button */}
              <TouchableOpacity
                style={[styles.analyticsCard, { flex: 1, paddingVertical: 20 }]}
                onPress={() => router.push("/(tabs)/mood/dashboard")}
                activeOpacity={0.7}
              >
                <Activity size={32} color="#4A9B7F" style={{ marginBottom: 12 }} />
                <Text style={[styles.analyticsLabel, { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 4 }]}>
                  Mood Analytics
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>
                  View mood trends & insights
                </Text>
              </TouchableOpacity>

              {/* Assessment Analytics Button */}
              <TouchableOpacity
                style={[styles.analyticsCard, { flex: 1, paddingVertical: 20 }]}
                onPress={() => router.push("/(tabs)/profile/assessmentanalytics")}
                activeOpacity={0.7}
              >
                <ClipboardList size={32} color="#6366F1" style={{ marginBottom: 12 }} />
                <Text style={[styles.analyticsLabel, { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 4 }]}>
                  Assessment Analytics
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B", textAlign: "center" }}>
                  View assessment results
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Upcoming Appointments - from server */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_appointments')}</Text>
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
                      ? `${apt.sessionType || "Therapy"} Session with ${apt.docData.name} `
                      : "Therapy Session"}
                  </Text>
                  <Text style={styles.appointmentDate}>
                    {formatAppointmentDate(apt.slotDate, apt.slotTime)}
                  </Text>
                </View>
                <Text style={styles.detailsLink}>{t('details')}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_appointments')}</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push("/(tabs)/doctors")}
              >
                <Text style={styles.bookButtonText}>{t('book_now')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recent Assessments - from server */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('recent_assessments')}</Text>
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
                  <Text style={styles.progressLabel}>{t('completed')}</Text>
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{t('no_assessments')}</Text>
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => router.push("/(tabs)/assessment")}
              >
                <Text style={styles.bookButtonText}>{t('take_assessment')}</Text>
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
  moodCardRight: {
    alignItems: "flex-end",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
    gap: 4,
  },
  streakBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#D97706",
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
  // Compact Quote
  quoteCardCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  quoteEmoji: {
    fontSize: 20,
  },
  quoteTextCompact: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#78350F",
    fontStyle: "italic",
    lineHeight: 18,
  },
  // Wellness Grid
  wellnessGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  wellnessCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  wellnessIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  wellnessLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9CA3AF",
  },
  analyticsGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  analyticsIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  analyticsLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  distributionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  appointmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#E6F4F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
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
    marginTop: 16,
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
  // Wellness Tools
  wellnessToolsGrid: {
    gap: 14,
  },
  wellnessToolCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  wellnessToolIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  wellnessToolEmoji: {
    fontSize: 26,
  },
  wellnessToolInfo: {
    flex: 1,
    marginLeft: 16,
  },
  wellnessToolTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  wellnessToolDesc: {
    fontSize: 13,
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
  // Today's Focus Card
  focusCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  focusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  focusCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  focusCardText: {
    fontSize: 15,
    color: "#E0E7FF",
    lineHeight: 22,
    marginBottom: 16,
  },
  focusButton: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  focusButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Wellness Progress
  progressGrid: {
    flexDirection: "row",
    gap: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 10,
  },
  progressValue: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  // Mindfulness Card
  mindfulnessCard: {
    backgroundColor: "#FFFBEB",
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mindfulnessHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mindfulnessEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  mindfulnessTextContainer: {
    flex: 1,
  },
  mindfulnessTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },
  mindfulnessSubtitle: {
    fontSize: 13,
    color: "#B45309",
  },
  mindfulnessQuote: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
    fontStyle: "italic",
  },
});