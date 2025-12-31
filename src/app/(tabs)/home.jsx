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
  FlatList,
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
  Check,
  ChevronRight,
  Smartphone,
  Calendar as CalendarIcon,
  FileText,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import AnimatedButton, { AnimatedCard } from "../../components/AnimatedButton";
import Svg, { Circle } from "react-native-svg";
import "../../i18n"; // Init i18n
import { useTranslation } from "react-i18next";
import { Modal } from "react-native";
import { Globe } from "lucide-react-native";
import { useWellness } from "@/context/WellnessContext";
import { supabase } from "../../utils/supabaseClient";


// Mood Emoji Mapping (matching journal.jsx)
const MOOD_EMOJIS = {
  "Joyful": "😁",
  "Happy": "😊",
  "Calm": "😌",
  "Grateful": "🙏",
  "Motivated": "💪",
  "Loved": "❤️",
  "Inspired": "🌟",
  "Sad": "😢",
  "Angry": "😡",
  "Anxious": "😰",
  "Tired": "😩",
  "Overwhelmed": "😖",
  "Awful": "😭",
  "Neutral": "😐",
  "Confused": "😕",
  "Bored": "🥱",
  "Okay": "🙂",
  "Nostalgic": "🥹",
  "Hopeful": "🌈",
  "Guilty": "😔",
  "Ashamed": "😳",
};

// Mood Data with Colors (for recent moods preview)
const MOOD_DATA = [
  { id: "joyful", emoji: "😁", label: "Joyful", color: "#4A9B7F" },
  { id: "happy", emoji: "😊", label: "Happy", color: "#16A34A" },
  { id: "calm", emoji: "😌", label: "Calm", color: "#14B8A6" },
  { id: "grateful", emoji: "🙏", label: "Grateful", color: "#F59E0B" },
  { id: "motivated", emoji: "💪", label: "Motivated", color: "#10B981" },
  { id: "loved", emoji: "❤️", label: "Loved", color: "#EC4899" },
  { id: "inspired", emoji: "🌟", label: "Inspired", color: "#6366F1" },
  { id: "sad", emoji: "😢", label: "Sad", color: "#3B82F6" },
  { id: "angry", emoji: "😡", label: "Angry", color: "#EF4444" },
  { id: "anxious", emoji: "😰", label: "Anxious", color: "#F59E0B" },
  { id: "tired", emoji: "😩", label: "Tired", color: "#94A3B8" },
  { id: "overwhelmed", emoji: "😖", label: "Overwhelmed", color: "#F97316" },
  { id: "awful", emoji: "😭", label: "Awful", color: "#A855F7" },
  { id: "neutral", emoji: "😐", label: "Neutral", color: "#64748B" },
  { id: "confused", emoji: "😕", label: "Confused", color: "#8B5CF6" },
  { id: "bored", emoji: "🥱", label: "Bored", color: "#6B7280" },
  { id: "okay", emoji: "🙂", label: "Okay", color: "#22C55E" },
  { id: "nostalgic", emoji: "🥹", label: "Nostalgic", color: "#EC4899" },
  { id: "hopeful", emoji: "🌈", label: "Hopeful", color: "#10B981" },
  { id: "guilty", emoji: "😔", label: "Guilty", color: "#F59E0B" },
  { id: "ashamed", emoji: "😳", label: "Ashamed", color: "#EF4444" },
];

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
  const { water, sleep, breathing, habits, refreshData: refreshWellness } = useWellness();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [userAssessments, setUserAssessments] = useState([]);
  const [moodDashboard, setMoodDashboard] = useState(null);
  const [moodEntries, setMoodEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loggingStreak, setLoggingStreak] = useState(0);

  // Carousel Animation
  const scrollX = useRef(new Animated.Value(0)).current;
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const CARD_WIDTH = SCREEN_WIDTH * 0.65; // Reduced to show peek of side cards
  const SPACING = 8; // Tighter spacing for better peek visibility
  const SPACER_WIDTH = (SCREEN_WIDTH - CARD_WIDTH) / 2;

  const [dailyQuote, setDailyQuote] = useState(DAILY_QUOTES[0]);
  const [showChatTooltip, setShowChatTooltip] = useState(true);
  const { t, i18n } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [waterToday, setWaterToday] = useState(0);
  const [breathingToday, setBreathingToday] = useState(0);

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Wellness Data - use direct Supabase data
  const waterProgress = waterToday / 2000;
  const sleepProgress = sleep.today / 8;
  const breathingProgress = breathingToday / 3;
  const completedHabits = habits.logs.find(l => l.date === new Date().toDateString())?.completedIds?.length || 0;
  const totalHabits = habits.list.length;
  const habitsProgress = totalHabits > 0 ? completedHabits / totalHabits : 0;

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
    // Force a small delay to ensure all components re-render with new language
    setTimeout(() => {
      // This setState will trigger a re-render of the home screen which will cascade through navigation
      setLoading(false);
    }, 100);
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
      console.log('[Home] Screen focused - reloading data');
      loadData();
      refreshWellness();
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

  const loadData = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");

      const [profileResponse, appointmentsResponse, doctorsResponse] = await Promise.all([
        api.getProfile().catch(() => ({ success: false })),
        api.getUserAppointments().catch(() => ({ appointments: [] })),
        api.getDoctors().catch(() => ({ doctors: [] })),
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

      if (doctorsResponse.success && Array.isArray(doctorsResponse.doctors)) {
        setDoctors(doctorsResponse.doctors);
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

        // Load Water from Supabase
        try {
          const { data: waterLogs, error: waterError } = await supabase
            .from('water_logs')
            .select('*')
            .eq('user_id', userId);

          if (!waterError && waterLogs) {
            const todayStr = new Date().toDateString();
            const todayLogs = waterLogs.filter(log => {
              const logDateStr = new Date(log.logged_at).toDateString();
              return logDateStr === todayStr;
            });
            const todayTotal = todayLogs.reduce((sum, log) => sum + log.amount_ml, 0);
            setWaterToday(todayTotal);
          }
        } catch (e) {
          console.log("[Home] Error loading water:", e);
        }

        // Load Breathing from Supabase
        try {
          console.log('[Home] Loading breathing sessions for userId:', userId);

          const { data: breathingSessions, error: breathingError } = await supabase
            .from('breathing_sessions')
            .select('*')
            .eq('user_id', userId);

          if (breathingError) {
            console.error('[Home] Breathing error:', breathingError);
          } else {
            console.log('[Home] Fetched breathing sessions:', breathingSessions?.length || 0);
            console.log('[Home] Sample sessions:', breathingSessions?.slice(0, 3));

            // Get today's date in YYYY-MM-DD format (local timezone)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const todayStr = `${year}-${month}-${day}`;

            console.log('[Home] Looking for sessions on date:', todayStr);

            const todaySessions = breathingSessions?.filter(session => {
              console.log('[Home] Checking session:', session.session_date, '===', todayStr, '?', session.session_date === todayStr);
              return session.session_date === todayStr;
            }) || [];

            setBreathingToday(todaySessions.length);
            console.log('[Home] ✅ Breathing sessions today:', todaySessions.length, 'of', breathingSessions?.length || 0, 'total');
          }
        } catch (e) {
          console.log("[Home] Error loading breathing:", e);
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
          console.log('[Home] ========== WEEKLY MOOD API RESPONSE ==========');
          console.log('[Home] Full response:', JSON.stringify(weeklyData, null, 2));
          console.log('[Home] Response keys:', Object.keys(weeklyData || {}));

          // Check different possible data structures
          const possibleDataArrays = [
            weeklyData?.moodData,
            weeklyData?.moodEntries,
            weeklyData?.data,
            Array.isArray(weeklyData) ? weeklyData : null
          ].filter(Boolean);

          console.log('[Home] Found possible data arrays:', possibleDataArrays.length);

          let moodDataArray = weeklyData?.moodData || weeklyData?.moodEntries || weeklyData?.data || (Array.isArray(weeklyData) ? weeklyData : []);

          console.log('[Home] Using data array with length:', moodDataArray.length);
          if (moodDataArray && moodDataArray.length > 0) {
            // Sort by date descending (newest first)
            const sortedEntries = [...moodDataArray].sort((a, b) =>
              new Date(b.date || b.timestamp || b.createdAt) - new Date(a.date || a.timestamp || a.createdAt)
            );

            console.log('[Home] Sorted entries count:', sortedEntries.length);
            console.log('[Home] ========== LATEST MOOD ENTRY ==========');
            console.log(JSON.stringify(sortedEntries[0], null, 2));
            console.log('[Home] ===========================================');

            if (sortedEntries[0]) {
              console.log('[Home] Mood field value:', sortedEntries[0].mood);
              console.log('[Home] Available fields:', Object.keys(sortedEntries[0]));
              console.log('[Home] Emoji from MOOD_EMOJIS map:', MOOD_EMOJIS[sortedEntries[0].mood]);
            }

            setMoodEntries(sortedEntries);

            // Calculate streak
            const entries = moodDataArray;
            if (entries.length > 0) {
              let streak = 0;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              console.log('[Home] Today for streak calc:', today.toDateString());

              const sorted = [...entries].sort((a, b) =>
                new Date(b.date || b.timestamp || b.createdAt) - new Date(a.date || a.timestamp || a.createdAt)
              );

              let checkDate = new Date(today);
              for (const entry of sorted) {
                const entryDate = new Date(entry.date || entry.timestamp || entry.createdAt);
                entryDate.setHours(0, 0, 0, 0);

                console.log('[Home] Checking entry:', {
                  entryDate: entryDate.toDateString(),
                  checkDate: checkDate.toDateString(),
                  matches: entryDate.getTime() === checkDate.getTime()
                });

                if (entryDate.getTime() === checkDate.getTime()) {
                  streak++;
                  checkDate.setDate(checkDate.getDate() - 1);
                } else if (entryDate.getTime() < checkDate.getTime()) {
                  break;
                }
              }
              console.log('[Home] ========== CALCULATED STREAK:', streak, '==========');
              setLoggingStreak(streak);
            }
          } else {
            console.log('[Home] No mood data array found or empty');
          }
        } catch (e) {
          console.log("[Home] No mood entries:", e.message);
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
    refreshWellness();
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
          <View>
            <Text style={styles.greeting}>
              {t('greeting')} {user?.name?.split(" ")[0] || t('greeting_placeholder')}!
            </Text>
            <Text style={styles.dateText}>{todayDate}</Text>
          </View>

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


        {/* Mood Card - Slide to Log - ENHANCED WITH MORE CONTENT */}
        <LinearGradient
          colors={["#4A9B7F", "#14B8A6", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.moodCard}
        >
          {/* Animated Background Pattern */}
          <View style={{ position: 'absolute', right: -30, top: -30, opacity: 0.08 }}>
            <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: ['0deg', '5deg'] }) }] }}>
              <Smile size={180} color="#FFFFFF" />
            </Animated.View>
          </View>

          <View style={styles.moodCardContent}>
            <View style={styles.moodCardLeft}>
              <View style={styles.moodCardHeader}>
                <Text style={styles.moodCardEmoji}>😊</Text>
                <View>
                  <Text style={styles.moodCardTitle}>{t('how_are_you')}</Text>
                  <Text style={styles.moodCardSubtitle}>Track your emotions today</Text>
                </View>
              </View>

              {/* Mini Stats Row with Animated Fire */}
              <View style={styles.miniStatsRow}>
                {loggingStreak > 0 && (
                  <LinearGradient
                    colors={['#FF6B35', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.miniStatCardFire}
                  >
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <Flame size={16} color="#FFF" fill="#FFF" />
                    </Animated.View>
                    <Text style={styles.miniStatTextFire}>{loggingStreak} day{loggingStreak > 1 ? 's' : ''}</Text>
                  </LinearGradient>
                )}
                {moodEntries && moodEntries.length > 0 && (
                  <View style={styles.miniStatCard}>
                    <Calendar size={14} color="#FFF" />
                    <Text style={styles.miniStatText}>{moodEntries.length} logged</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Improved Slide to Log Slider */}
          <View style={styles.sliderContainerNew}>
            <View style={styles.sliderTrackNew}>
              {/* Animated gradient background */}
              <LinearGradient
                colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sliderTrackGradient}
              />

              {/* Slide text with animated arrow */}
              <View style={styles.sliderTextContainerNew}>
                <Animated.View style={{ opacity: slideX.interpolate({ inputRange: [0, SLIDER_WIDTH * 0.5], outputRange: [1, 0] }) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.sliderTextNew}>Slide to log mood</Text>
                    <Animated.Text style={[styles.sliderArrowNew, { transform: [{ translateX: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: [0, 4] }) }] }]}>
                      →
                    </Animated.Text>
                  </View>
                </Animated.View>
              </View>

              {/* Premium Draggable Thumb */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.sliderThumbNew,
                  {
                    transform: [
                      { translateX: slideX },
                      { scale: pulseAnim }
                    ],
                  },
                ]}
              >
                {/* Glow effect */}
                <View style={styles.sliderThumbGlowNew} />
                {/* Inner content */}
                <LinearGradient
                  colors={['#FFFFFF', '#F0FDF4']}
                  style={styles.sliderThumbInner}
                >
                  <Smile size={28} color="#4A9B7F" strokeWidth={2.5} />
                </LinearGradient>
              </Animated.View>
            </View>
          </View>
        </LinearGradient>

        {/* Therapist Carousel */}
        {doctors.length > 0 && (
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
              <Text style={styles.sectionTitle}>Our Therapists</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/doctors")}>
                <Text style={{ color: '#4A9B7F', fontWeight: '600' }}>View All</Text>
              </TouchableOpacity>
            </View>

            <Animated.FlatList
              data={doctors}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + SPACING}
              decelerationRate="fast"
              initialScrollIndex={doctors.length > 1 ? 1 : 0}
              getItemLayout={(data, index) => ({
                length: CARD_WIDTH + SPACING,
                offset: (CARD_WIDTH + SPACING) * index,
                index,
              })}
              contentContainerStyle={{
                paddingLeft: SPACER_WIDTH - (SPACING * 2),
                paddingRight: SPACER_WIDTH + (SPACING * 2),
                paddingVertical: 10
              }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              keyExtractor={(item) => item._id}
              renderItem={({ item, index }) => {
                const inputRange = [
                  (CARD_WIDTH + SPACING) * (index - 1),
                  (CARD_WIDTH + SPACING) * index,
                  (CARD_WIDTH + SPACING) * (index + 1),
                ];

                const scale = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.9, 1, 0.9],
                  extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                  inputRange,
                  outputRange: [0.6, 1, 0.6],
                  extrapolate: 'clamp',
                });

                return (
                  <Animated.View style={{
                    width: CARD_WIDTH,
                    transform: [{ scale }],
                    opacity,
                    marginRight: SPACING,
                  }}>
                    <TouchableOpacity
                      style={[styles.therapistCard, { width: '100%', marginRight: 0 }]}
                      activeOpacity={0.9}
                      onPress={() => router.push({ pathname: "/(tabs)/doctors", params: { doctorId: item._id } })}
                    >
                      <View style={styles.therapistContentRow}>
                        <View style={styles.therapistLeft}>
                          <View style={styles.therapistImageDecor} />
                          <Image
                            source={{ uri: item.image || 'https://via.placeholder.com/100' }}
                            style={styles.therapistImage}
                            resizeMode="cover"
                            onError={() => console.log('Image load error:', item.name)}
                          />
                        </View>

                        <View style={styles.therapistInfo}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                            <Text style={styles.therapistName} numberOfLines={1}>{item.name}</Text>
                            <View style={styles.therapistArrow}>
                              <ChevronRight size={14} color="#94A3B8" />
                            </View>
                          </View>

                          <View style={styles.therapistDetailRow}>
                            <Smartphone size={12} color="#64748B" />
                            <Text style={styles.therapistDetailText} numberOfLines={1}>
                              {item.degree || item.specialty || 'Psychologist'}
                            </Text>
                          </View>

                          <View style={styles.therapistDetailRow}>
                            <CalendarIcon size={12} color="#64748B" />
                            <Text style={styles.therapistDetailText}>
                              {item.experience ? `${item.experience} yrs exp` : '5+ yrs exp'}
                            </Text>
                          </View>

                          <View style={styles.therapistDetailRow}>
                            <MessageCircle size={12} color="#64748B" />
                            <Text style={styles.therapistDetailText} numberOfLines={1}>
                              {item.languages || item.language || 'English, Hindi'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }}
            />
          </View>
        )}

        {/* Today's Logs Section */}
        <View style={{ paddingHorizontal: 20, marginTop: 8, marginBottom: 4 }}>
          <Text style={styles.sectionTitle}>Today's Logs</Text>
        </View>

        {/* New 2-Column Layout */}
        <View style={styles.twoColumnLayout}>
          {/* Left Column - 2 Stacked Cards */}
          <View style={styles.leftColumn}>
            {/* Streak Goal Card */}
            <View style={styles.streakGoalCard}>
              <View style={styles.streakGoalHeader}>
                <Text style={styles.streakGoalTitle}>My Streak Goal</Text>
                <View style={styles.streakGoalBadge}>
                  <Text style={styles.streakGoalCount}>{loggingStreak}/40</Text>
                  <Flame size={16} color="#F59E0B" />
                </View>
              </View>

              {/* Weekly Calendar */}
              <View style={styles.weeklyCalendar}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                  // Get Monday of current week
                  const today = new Date();
                  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                  const diff = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days, otherwise go to Monday

                  const monday = new Date(today);
                  monday.setDate(today.getDate() + diff);
                  monday.setHours(0, 0, 0, 0);

                  // Calculate the date for this day in the week
                  const checkDate = new Date(monday);
                  checkDate.setDate(monday.getDate() + index);
                  checkDate.setHours(0, 0, 0, 0);

                  const hasEntry = moodEntries.some(entry => {
                    const entryDate = new Date(entry.date || entry.timestamp || entry.createdAt);
                    entryDate.setHours(0, 0, 0, 0);
                    const matches = entryDate.getTime() === checkDate.getTime();
                    if (matches) {
                      console.log(`[Home] ✓ Entry found for ${day}:`, {
                        checkDate: checkDate.toDateString(),
                        entryDate: entryDate.toDateString(),
                        moodLabel: entry.mood
                      });
                    }
                    return matches;
                  });

                  console.log(`[Home] Day ${day} (${checkDate.toDateString()}): hasEntry=${hasEntry}`);

                  return (
                    <View key={index} style={styles.dayContainer}>
                      <Text style={styles.dayLabel}>{day}</Text>
                      <View style={[
                        styles.dayCircle,
                        hasEntry && styles.dayCircleActive
                      ]}>
                        {hasEntry && (
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Daily Inspiration Card */}
            <View style={styles.dailyQuoteCard}>
              <Text style={styles.dailyQuoteEmoji}>✨</Text>
              <View style={styles.dailyQuoteContent}>
                <Text style={styles.dailyQuoteLabel}>Daily Inspiration</Text>
                <Text style={styles.dailyQuoteText}>"{dailyQuote}"</Text>
              </View>
            </View>
          </View>

          {/* Right Column - Large Mood Character */}
          <View style={styles.rightColumn}>
            <View style={styles.moodCharacterCard}>
              <Text style={styles.moodCharacterEmoji}>
                {moodEntries.length > 0 && moodEntries[0]?.mood
                  ? MOOD_EMOJIS[moodEntries[0].mood] || '🙂'
                  : '🙂'}
              </Text>
              <Text style={styles.moodCharacterLabel}>
                {moodEntries.length > 0 && moodEntries[0]?.mood
                  ? `Feeling ${moodEntries[0].mood}`
                  : 'Log Your Mood'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions - Redesigned */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('quick_actions')}</Text>
            <Text style={styles.sectionSubtitle}>Your daily wellness tools</Text>
          </View>
          <View style={styles.quickActionsGridNew}>
            <AnimatedButton
              style={styles.quickActionCardNew}
              onPress={() => router.push("/(tabs)/chat")}
            >
              <Image
                source={{ uri: 'https://swcajhaxbtvnpjvuaefa.supabase.co/storage/v1/object/public/assets/raskaai.jpg' }}
                style={[styles.quickActionBgImage, { opacity: 0.7 }]}
                resizeMode="cover"
              />
              <View style={styles.quickActionOverlay} />
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionTextContainer}>
                  <Text style={styles.quickActionTitleNew}>{t('raska_ai')}</Text>
                  <Text style={styles.quickActionSubtitle}>Chat with AI</Text>
                </View>
              </View>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCardNew}
              onPress={() => router.push("/(tabs)/wellness/water")}
            >
              <Image
                source={{ uri: 'https://swcajhaxbtvnpjvuaefa.supabase.co/storage/v1/object/public/assets/water.jpg' }}
                style={styles.quickActionBgImage}
                resizeMode="cover"
              />
              <View style={styles.quickActionOverlay} />
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionTextContainer}>
                  <Text style={styles.quickActionTitleNew}>{t('water')}</Text>
                  <Text style={styles.quickActionSubtitle}>Track intake</Text>
                </View>
              </View>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCardNew}
              onPress={() => router.push("/(tabs)/wellness/sleep")}
            >
              <Image
                source={{ uri: 'https://swcajhaxbtvnpjvuaefa.supabase.co/storage/v1/object/public/assets/sleep.jpg' }}
                style={styles.quickActionBgImage}
                resizeMode="cover"
              />
              <View style={styles.quickActionOverlay} />
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionTextContainer}>
                  <Text style={styles.quickActionTitleNew}>{t('sleep')}</Text>
                  <Text style={styles.quickActionSubtitle}>Log hours</Text>
                </View>
              </View>
            </AnimatedButton>

            <AnimatedButton
              style={styles.quickActionCardNew}
              onPress={() => router.push("/(tabs)/wellness/habits")}
            >
              <Image
                source={{ uri: 'https://swcajhaxbtvnpjvuaefa.supabase.co/storage/v1/object/public/assets/habit.jpg' }}
                style={styles.quickActionBgImage}
                resizeMode="cover"
              />
              <View style={styles.quickActionOverlay} />
              <View style={styles.quickActionContent}>
                <View style={styles.quickActionTextContainer}>
                  <Text style={styles.quickActionTitleNew}>{t('habits')}</Text>
                  <Text style={styles.quickActionSubtitle}>Daily tracking</Text>
                </View>
              </View>
            </AnimatedButton>
          </View>
        </View>

        {/* Featured Notes Card */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(tabs)/notes")}
        >
          <View style={styles.notesFeatureCard}>
            <Image
              source={{ uri: 'https://swcajhaxbtvnpjvuaefa.supabase.co/storage/v1/object/public/assets/notes.jpg?v=2' }}
              style={styles.notesFeatureBgImage}
              resizeMode="cover"
            />

            <View style={styles.notesFeatureContent}>
              <View style={styles.notesFeatureText}>
                <Text style={styles.notesFeatureTitle}>MY notes</Text>
                <Text style={styles.notesFeatureSubtitle}>
                  Capture thoughts,{'\n'}ideas{'\n'}and memories
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

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
          <TouchableOpacity style={styles.focusButton} onPress={() => router.push("/(tabs)/wellness/breathing")}>
            <Text style={styles.focusButtonText}>Start Now</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Wellness Progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Wellness Progress</Text>
            <Text style={styles.sectionSubtitle}>Today's goals</Text>
          </View>
          <View style={[styles.progressGrid, { flexWrap: 'wrap', gap: 12 }]}>
            {/* Water Intake */}
            <View style={[styles.progressCard, { width: '47%' }]}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={water.today / 2000}
                color="#3B82F6"
                bgColor="#DBEAFE"
              >
                <Droplets size={24} color="#3B82F6" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Water</Text>
              <Text style={styles.progressValue}>{Math.floor(water.today / 200)}/10 cups</Text>
            </View>

            {/* Sleep */}
            <View style={[styles.progressCard, { width: '47%' }]}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={sleep.today / 8}
                color="#4A9B7F"
                bgColor="#E6F4F0"
              >
                <Moon size={24} color="#4A9B7F" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Sleep</Text>
              <Text style={styles.progressValue}>{sleep.today.toFixed(1)} hrs</Text>
            </View>

            {/* Breathing */}
            <View style={[styles.progressCard, { width: '47%' }]}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={breathing.today / 3}
                color="#10B981"
                bgColor="#D1FAE5"
              >
                <Wind size={24} color="#10B981" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Breathing</Text>
              <Text style={styles.progressValue}>{breathing.today}/3 Reps</Text>
            </View>

            {/* Habits */}
            <View style={[styles.progressCard, { width: '47%' }]}>
              <CircleProgress
                size={70}
                strokeWidth={6}
                progress={
                  habits.list.length > 0
                    ? (habits.logs.find(l => l.date === new Date().toDateString())?.completedIds?.length || 0) / habits.list.length
                    : 0
                }
                color="#F59E0B"
                bgColor="#FEF3C7"
              >
                <CheckSquare size={24} color="#F59E0B" />
              </CircleProgress>
              <Text style={styles.progressLabel}>Habits</Text>
              <Text style={styles.progressValue}>
                {habits.logs.find(l => l.date === new Date().toDateString())?.completedIds?.length || 0}/{habits.list.length} done
              </Text>
            </View>
          </View>
        </View>



        {/* Daily Inspiration - Compact inline */}
        <View style={styles.quoteCardCompact}>
          <Text style={styles.quoteEmoji}>✨</Text>
          <Text style={styles.quoteTextCompact}>"{dailyQuote}"</Text>
        </View>

        {/* Analytics - Navigation Buttons */}
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

        {/* Upcoming Appointments - from server */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('upcoming_appointments')}</Text>
          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <TouchableOpacity
                key={apt._id}
                style={styles.appointmentCard}
                onPress={() => router.push("/(tabs)/profile/appointments")}
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
        <View style={styles.floatingChatGradient}>
          <Image
            source={{ uri: "https://raskamon.com/raskabot.jpg" }}
            style={{ width: "100%", height: "100%", borderRadius: 24 }}
            resizeMode="cover"
          />
        </View>
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
  dateText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
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
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
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
    flexWrap: "wrap",
    gap: 12,
  },
  wellnessCard: {
    width: "47%",
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
    right: 20,
    bottom: 110, // Increased to ensure it stays well above footer
    alignItems: "center",
    zIndex: 999, // Ensure it stays above other elements
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
    marginBottom: 20,
  },
  quickActionIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 13,
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
    marginBottom: 24,
    borderRadius: 24,
    padding: 24,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    overflow: "hidden",
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
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
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
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#FDE68A",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
  // New 2-Column Layout
  twoColumnLayout: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  leftColumn: {
    flex: 2,
    gap: 12,
  },
  rightColumn: {
    flex: 1,
  },
  // Streak Goal Card (redesigned for left column)
  streakGoalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  streakGoalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  streakGoalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  streakGoalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakGoalCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#D97706",
  },
  weeklyCalendar: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayContainer: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  dayCircle: {
    width: 20,
    height: 20,
    borderRadius: 9,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleActive: {
    backgroundColor: "#4A9B7F",
  },
  dayCheckmark: {
    // Removed - now using CheckSquare icon directly
  },
  // Level Card
  levelCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  levelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  levelProgressBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  levelProgressFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: 4,
  },
  levelXP: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "right",
  },
  // My Mood Card
  myMoodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  myMoodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  myMoodTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  addMoodButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  addMoodIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  myMoodContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  moodAvatarContainer: {
    position: "relative",
  },
  moodAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
  },
  moodTagsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  moodTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  moodTagText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  // Weekly Insight Card
  weeklyInsightCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  weeklyInsightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  weeklyInsightText: {
    flex: 1,
    fontSize: 14,
    color: "#166534",
    lineHeight: 20,
  },
  weeklyInsightHighlight: {
    fontWeight: "700",
    color: "#15803D",
  },
  // Daily Quote Card (new compact version for left column)
  dailyQuoteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    flexDirection: "row",
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  dailyQuoteEmoji: {
    fontSize: 28,
  },
  dailyQuoteContent: {
    flex: 1,
  },
  dailyQuoteLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#D97706",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dailyQuoteText: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18,
    fontStyle: "italic",
  },
  // Mood Character Card (large square on right)
  moodCharacterCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  moodCharacterEmoji: {
    fontSize: 64,
    marginBottom: 12,
    textAlign: "center",
  },
  moodCharacterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4A9B7F",
    textAlign: "center",
  },
  // Therapist Cards
  // Therapist Cards - Redesigned
  therapistCard: {
    width: 280,
    backgroundColor: '#EFF6FF', // Light blueish bg
    borderRadius: 24,
    padding: 16,
    marginRight: 16,
    borderWidth: 1.5,
    borderColor: '#64748B', // Dark thin border
  },
  therapistContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  therapistLeft: {
    position: 'relative',
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistImageDecor: {
    position: 'absolute',
    bottom: 0,
    left: -5,
    width: 50,
    height: 35,
    backgroundColor: '#EA580C', // Orange
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    transform: [{ rotate: '-45deg' }],
    opacity: 0.9,
  },
  therapistImage: {
    width: 65,
    height: 65,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 2,
  },
  therapistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  therapistName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  therapistArrow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  therapistDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  therapistDetailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
    flex: 1,
  },
  chatButton: {
    backgroundColor: '#0EA5E9', // Sky blue/Cyan
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  chatButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  // Quick Actions - New Styles
  quickActionsGridNew: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCardNew: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    minHeight: 120,
    overflow: 'hidden',
  },
  quickActionBgImage: {
    position: 'absolute',
    width: '100%',
    height: '120%',
    top: -20,
    left: 0,
  },
  quickActionOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(255, 255, 255, 0)',
  },
  quickActionBgGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  quickActionContent: {
    position: 'relative',
    zIndex: 2,
    padding: 16,
    minHeight: 120,
    justifyContent: 'flex-end',
  },
  quickActionIconNew: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTextContainer: {
    gap: 4,
  },
  quickActionTitleNew: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  quickActionSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  // Featured Notes Card
  notesFeatureCard: {
    marginBottom: 20,
    borderRadius: 24,
    minHeight: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  notesFeatureBgImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  notesFeatureContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 2,
    flex: 1,
    padding: 20,
  },
  notesFeatureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesFeatureText: {
    flex: 1,
  },
  notesFeatureTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  notesFeatureSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
    lineHeight: 20,
  },
  notesFeatureAction: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesStatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    position: 'relative',
    zIndex: 2,
  },
  notesStatsText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  // New Mood Slider Styles
  moodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  moodCardEmoji: {
    fontSize: 42,
  },
  streakBadgeNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  streakBadgeTextNew: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sliderContainerNew: {
    marginTop: 16,
  },
  sliderTrackNew: {
    position: 'relative',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  sliderTrackGradient: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  sliderTextContainerNew: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  sliderTextNew: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 0.5,
  },
  sliderArrowNew: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
  },
  sliderThumbNew: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 60,
    height: 60,
    zIndex: 3,
  },
  sliderThumbGlowNew: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
    transform: [{ scale: 1.2 }],
  },
  sliderThumbInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A9B7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Mini Stats Row
  miniStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    flexWrap: 'wrap',
  },
  miniStatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  miniStatCardFire: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  miniStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  miniStatTextFire: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Recent Moods Preview
  recentMoodsContainer: {
    marginTop: 14,
  },
  recentMoodsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  recentMoodsEmojis: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  moodEmojiContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  moodEmojiText: {
    fontSize: 20,
  },
  // Legacy dot styles (keeping for compatibility)
  recentMoodsDots: {
    flexDirection: 'row',
    gap: 6,
  },
  moodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
