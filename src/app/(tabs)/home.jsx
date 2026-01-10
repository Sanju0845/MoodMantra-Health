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

                {/* Header Divider */}
                <View style={styles.sectionDivider} />

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
                <View style={styles.moodCard}>
                    {/* Abstract gradient background */}
                    <LinearGradient
                        colors={["#A78BFA", "#EC4899", "#F59E0B"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24 }}
                    />
                    {/* Blurry white overlay */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.85)', borderRadius: 24 }} />
                    {/* Animated Background Pattern */}
                    <View style={{ position: 'absolute', right: -30, top: -30, opacity: 0.06 }}>
                        <Animated.View style={{ transform: [{ rotate: pulseAnim.interpolate({ inputRange: [1, 1.1], outputRange: ['0deg', '5deg'] }) }] }}>
                            <Smile size={180} color="#4B5563" />
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
                </View>

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

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

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

                {/* Weekly Log Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Weekly Log</Text>
                        <Text style={styles.sectionSubtitle}>Track your progress</Text>
                    </View>

                    {/* Streak Goal Card */}
                    <View style={styles.streakGoalCardNew}>
                        <View style={styles.streakHeaderRow}>
                            <View>
                                <Text style={styles.streakLabelNew}>Daily Streak</Text>
                                <View style={styles.streakValueRow}>
                                    <Text style={styles.streakNumberNew}>{loggingStreak}</Text>
                                    <Text style={styles.streakDaysText}>days</Text>
                                </View>
                            </View>
                            <Flame size={32} color="#F59E0B" />
                        </View>

                        {/* Weekly Calendar */}
                        <View style={styles.weeklyCalendarNew}>
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
                                const today = new Date();
                                const currentDay = today.getDay();
                                const diff = currentDay === 0 ? -6 : 1 - currentDay;

                                const monday = new Date(today);
                                monday.setDate(today.getDate() + diff);
                                monday.setHours(0, 0, 0, 0);

                                const checkDate = new Date(monday);
                                checkDate.setDate(monday.getDate() + index);
                                checkDate.setHours(0, 0, 0, 0);

                                const hasEntry = moodEntries.some(entry => {
                                    const entryDate = new Date(entry.date || entry.timestamp || entry.createdAt);
                                    entryDate.setHours(0, 0, 0, 0);
                                    return entryDate.getTime() === checkDate.getTime();
                                });

                                return (
                                    <View key={index} style={styles.dayContainerNew}>
                                        <Text style={styles.dayLabelNew}>{day}</Text>
                                        <View style={[
                                            styles.dayCircleNew,
                                            hasEntry && styles.dayCircleActiveNew
                                        ]}>
                                            {hasEntry && (
                                                <Check size={10} color="#FFFFFF" strokeWidth={3} />
                                            )}
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

                {/* Journal Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Journal</Text>
                        <TouchableOpacity onPress={() => router.push("/(tabs)/notes")}>
                            <Text style={styles.seeAllText}>See all</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => router.push("/(tabs)/notes")}
                        style={styles.journalMainCard}
                    >
                        {/* Abstract Background Elements */}
                        <View style={styles.journalAbstractBg}>
                            {/* Sky Clouds */}
                            <View style={[styles.journalCloud, { top: 30, left: 40 }]}>
                                <View style={[styles.cloudPart, { width: 40, height: 20 }]} />
                                <View style={[styles.cloudPart, { width: 30, height: 15, marginLeft: -10, marginTop: 5 }]} />
                            </View>
                            <View style={[styles.journalCloud, { top: 50, right: 50 }]}>
                                <View style={[styles.cloudPart, { width: 35, height: 18 }]} />
                                <View style={[styles.cloudPart, { width: 25, height: 12, marginLeft: -8, marginTop: 4 }]} />
                            </View>

                            {/* Sun with glow */}
                            <View style={styles.journalSun}>
                                <View style={styles.sunGlow} />
                                <Text style={styles.journalSunEmoji}>☀️</Text>
                            </View>

                            {/* Trees with shadows */}
                            <View style={styles.treeGroup}>
                                <Text style={[styles.journalTree, { left: 20, bottom: 0, fontSize: 36 }]}>🌲</Text>
                                <Text style={[styles.journalTree, { left: 60, bottom: 5, fontSize: 32 }]}>🌲</Text>
                                <Text style={[styles.journalTree, { right: 70, bottom: 0, fontSize: 34 }]}>🌳</Text>
                                <Text style={[styles.journalTree, { right: 30, bottom: 5, fontSize: 30 }]}>🌲</Text>
                            </View>

                            {/* Green Hills with depth */}
                            <View style={styles.journalHills}>
                                <View style={[styles.journalHill, { left: -20, backgroundColor: '#65A30D', zIndex: 1 }]} />
                                <View style={[styles.journalHill, { left: 60, backgroundColor: '#84CC16', zIndex: 2 }]} />
                                <View style={[styles.journalHill, { left: 140, backgroundColor: '#A3E635', zIndex: 1 }]} />
                            </View>
                        </View>

                        {/* Content with better styling */}
                        <View style={styles.journalContent}>
                            <Text style={styles.journalCardTitle}>Let's start your day</Text>
                            <Text style={styles.journalCardSubtitle}>
                                Begin with a mindful morning reflection
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Quick Journal Section */}
                    <View style={styles.quickJournalSection}>
                        <Text style={styles.quickJournalTitle}>Quick Journal</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.quickJournalScroll}
                            decelerationRate="fast"
                            pagingEnabled={false}
                        >
                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#FFF7ED' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "How did you feel today?" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>💭</Text>
                                <Text style={styles.quickJournalLabel}>Pause & reflect</Text>
                                <Text style={styles.quickJournalPrompt}>How did you feel today?</Text>
                                <Text style={styles.quickJournalTag}>Daily</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#EDE9FE' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "What do you want to focus on?" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>🎯</Text>
                                <Text style={styles.quickJournalLabel}>Set intentions</Text>
                                <Text style={styles.quickJournalPrompt}>What do you want to focus?</Text>
                                <Text style={styles.quickJournalTag}>Daily</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#ECFDF5' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "3 things I'm grateful for" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>🙏</Text>
                                <Text style={styles.quickJournalLabel}>Express gratitude</Text>
                                <Text style={styles.quickJournalPrompt}>3 things you're grateful for</Text>
                                <Text style={styles.quickJournalTag}>Daily</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#FEF2F2' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "What challenged me today?" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>💪</Text>
                                <Text style={styles.quickJournalLabel}>Growth mindset</Text>
                                <Text style={styles.quickJournalPrompt}>What challenged me today?</Text>
                                <Text style={styles.quickJournalTag}>Weekly</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#FEF3C7' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "What made me smile?" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>😊</Text>
                                <Text style={styles.quickJournalLabel}>Joyful moments</Text>
                                <Text style={styles.quickJournalPrompt}>What made me smile?</Text>
                                <Text style={styles.quickJournalTag}>Daily</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.quickJournalCard, { backgroundColor: '#E0F2FE' }]}
                                onPress={() => router.push({
                                    pathname: "/(tabs)/notes",
                                    params: { title: "Dreams & aspirations" }
                                })}
                            >
                                <Text style={styles.quickJournalEmoji}>✨</Text>
                                <Text style={styles.quickJournalLabel}>Dream big</Text>
                                <Text style={styles.quickJournalPrompt}>Dreams & aspirations</Text>
                                <Text style={styles.quickJournalTag}>Weekly</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>



                {/* Wellness Progress */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Today's Wellness</Text>
                        <Text style={styles.sectionSubtitle}>Track your daily goals</Text>
                    </View>
                    <View style={styles.wellnessCardsGrid}>
                        <TouchableOpacity style={styles.wellnessCardItem} onPress={() => router.push("/wellness/water")}>
                            <View style={[styles.wellnessIconLarge, { backgroundColor: "#DBEAFE" }]}>
                                <Droplets size={28} color="#2563EB" />
                            </View>
                            <Text style={styles.wellnessCardLabel}>Water</Text>
                            <Text style={styles.wellnessCardValue}>{waterToday}ml</Text>
                            <View style={styles.progressBarLarge}>
                                <View style={[styles.progressFillLarge, { width: `${Math.min(waterProgress * 100, 100)}%`, backgroundColor: "#2563EB" }]} />
                            </View>
                            <Text style={styles.wellnessCardGoal}>Goal: 2000ml</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessCardItem} onPress={() => router.push("/wellness/sleep")}>
                            <View style={[styles.wellnessIconLarge, { backgroundColor: "#F3E8FF" }]}>
                                <Moon size={28} color="#9333EA" />
                            </View>
                            <Text style={styles.wellnessCardLabel}>Sleep</Text>
                            <Text style={styles.wellnessCardValue}>{sleep.today}h</Text>
                            <View style={styles.progressBarLarge}>
                                <View style={[styles.progressFillLarge, { width: `${Math.min(sleepProgress * 100, 100)}%`, backgroundColor: "#9333EA" }]} />
                            </View>
                            <Text style={styles.wellnessCardGoal}>Goal: 8h</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessCardItem} onPress={() => router.push("/wellness/breathing")}>
                            <View style={[styles.wellnessIconLarge, { backgroundColor: "#CCFBF1" }]}>
                                <Wind size={28} color="#0D9488" />
                            </View>
                            <Text style={styles.wellnessCardLabel}>Breathing</Text>
                            <Text style={styles.wellnessCardValue}>{breathingToday}/3</Text>
                            <View style={styles.progressBarLarge}>
                                <View style={[styles.progressFillLarge, { width: `${Math.min(breathingProgress * 100, 100)}%`, backgroundColor: "#0D9488" }]} />
                            </View>
                            <Text style={styles.wellnessCardGoal}>Goal: 3 sessions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessCardItem} onPress={() => router.push("/wellness/habits")}>
                            <View style={[styles.wellnessIconLarge, { backgroundColor: "#FEF3C7" }]}>
                                <CheckSquare size={28} color="#F59E0B" />
                            </View>
                            <Text style={styles.wellnessCardLabel}>Habits</Text>
                            <Text style={styles.wellnessCardValue}>0/5</Text>
                            <View style={styles.progressBarLarge}>
                                <View style={[styles.progressFillLarge, { width: '0%', backgroundColor: "#F59E0B" }]} />
                            </View>
                            <Text style={styles.wellnessCardGoal}>Daily tracking</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

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

                {/* Section Divider */}
                <View style={styles.sectionDivider} />

                {/* Community Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Journal</Text>
                        <Text style={styles.sectionSubtitle}>Connect & share</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.communityCard}
                        onPress={() => router.push("/(tabs)/community")}
                        activeOpacity={0.9}
                    >
                        {/* Abstract Shapes Background */}
                        <View style={styles.communityShapeCircle1} />
                        <View style={styles.communityShapeCircle2} />
                        <View style={styles.communityShapeSquare} />

                        {/* Content */}
                        <View style={styles.communityContent}>
                            <View style={styles.communityHeader}>
                                <Text style={styles.communityEmojis}>🤝💖</Text>
                                <View style={styles.communityIconBadge}>
                                    <MessageCircle size={20} color="#EC4899" />
                                </View>
                            </View>
                            <Text style={styles.communityTitle}>Join Our Community</Text>
                            <Text style={styles.communitySubtitle}>
                                Connect with others, share your journey, and find support
                            </Text>
                            <View style={styles.communityButton}>
                                <Text style={styles.communityButtonText}>Explore Community</Text>
                                <ChevronRight size={16} color="#FFFFFF" />
                            </View>
                        </View>
                    </TouchableOpacity>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
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
        backgroundColor: '#E5E7EB',
    },
    moodCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        overflow: 'hidden',
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
        color: "#1F2937",
        lineHeight: 28,
    },
    moodCardSubtitle: {
        fontSize: 13,
        color: "#1F2937",
        marginTop: 6,
    },
    // Circle Progress Styles
    // Compact Quote
    // Wellness Grid
    wellnessCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    wellnessCardItem: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    wellnessIconLarge: {
        width: 56,
        height: 56,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    wellnessCardLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
    },
    wellnessCardValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    wellnessCardGoal: {
        fontSize: 10,
        color: "#9CA3AF",
        marginTop: 6,
    },
    progressBarLarge: {
        width: "100%",
        height: 6,
        backgroundColor: "#E5E7EB",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFillLarge: {
        height: "100%",
        borderRadius: 3,
    },
    sectionDivider: {
        height: 2,
        backgroundColor: "#CBD5E1",
        marginVertical: 10,
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
        letterSpacing: 0.5,
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
        borderRadius: 12,
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
    analyticsLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 4,
        textAlign: "center",
    },
    // Floating Chat Button
    floatingChatButton: {
        position: "absolute",
        right: 20,
        bottom: 95,
        alignItems: "center",
        zIndex: 999,
    },
    floatingChatGradient: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    // Quick Actions
    // Wellness Tips
    // Wellness Tools
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
    // Wellness Progress
    // Mindfulness Card
    // New 2-Column Layout
    // Streak Goal Card (redesigned for left column)
    // Level Card
    // Activity Summary Card
    // New Streak Goal Card Styles
    streakGoalCardNew: {
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    streakHeaderRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    streakLabelNew: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "600",
        marginBottom: 8,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    streakValueRow: {
        flexDirection: "row",
        alignItems: "baseline",
        gap: 6,
    },
    streakNumberNew: {
        fontSize: 36,
        fontWeight: "800",
        color: "#F59E0B",
        lineHeight: 40,
    },
    streakDaysText: {
        fontSize: 14,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    weeklyCalendarNew: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    dayContainerNew: {
        alignItems: "center",
        gap: 8,
    },
    dayLabelNew: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6B7280",
    },
    dayCircleNew: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    dayCircleActiveNew: {
        backgroundColor: "#10B981",
    },
    // New Activity Summary Card Styles
    // Daily Motivation Card
    motivationCard: {
        backgroundColor: "#FFFBEB",
        borderRadius: 14,
        padding: 18,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: "#FEF3C7",
    },
    motivationIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: "#FEF3C7",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 2,
    },
    motivationContent: {
        flex: 1,
    },
    motivationLabel: {
        fontSize: 11,
        color: "#D97706",
        fontWeight: "700",
        marginBottom: 6,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    motivationText: {
        fontSize: 13,
        color: "#78350F",
        lineHeight: 18,
        fontStyle: "italic",
        fontWeight: "500",
    },
    // Community Card
    communityCard: {
        backgroundColor: "#FCE7F3",
        borderRadius: 16,
        padding: 28,
        minHeight: 280,
        overflow: "hidden",
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: "#FBCFE8",
    },
    communityShapeCircle1: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        top: -50,
        right: -40,
    },
    communityShapeCircle2: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(236, 72, 153, 0.08)",
        bottom: -30,
        left: 20,
    },
    communityShapeSquare: {
        position: "absolute",
        width: 70,
        height: 70,
        borderRadius: 14,
        backgroundColor: "rgba(236, 72, 153, 0.12)",
        top: 120,
        left: -25,
        transform: [{ rotate: "15deg" }],
    },
    communityContent: {
        position: "relative",
        zIndex: 2,
        flex: 1,
        justifyContent: "space-between",
    },
    communityHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    communityEmojis: {
        fontSize: 40,
    },
    communityIconBadge: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
    communityTitle: {
        fontSize: 26,
        fontWeight: "800",
        color: "#831843",
        marginBottom: 12,
        letterSpacing: -0.5,
        lineHeight: 32,
    },
    communitySubtitle: {
        fontSize: 15,
        color: "#9F1239",
        lineHeight: 22,
        marginBottom: 24,
        fontWeight: "500",
    },
    communityButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#EC4899",
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: "flex-start",
        gap: 8,
    },
    communityButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
    // Progress Overview Card
    // Quick Stats Card (deprecated)
    // My Mood Card
    // Weekly Insight Card
    // Daily Quote Card (new compact version for left column)
    // Mood Character Card (large square on right)
    // Therapist Cards
    // Therapist Cards - Redesigned
    therapistCard: {
        width: 280,
        backgroundColor: '#EFF6FF', // Light blueish bg
        borderRadius: 16,
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
    // Quick Actions - New Styles
    quickActionsGridNew: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
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
    quickActionTitleNew: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    // Quick Actions - Clean Professional Design
    // Featured Notes Card
    // Journal Styles
    seeAllText: {
        fontSize: 13,
        color: '#4A9B7F',
        fontWeight: '600',
    },
    journalMainCard: {
        height: 220,
        borderRadius: 24,
        backgroundColor: '#FEF3C7',
        overflow: 'hidden',
        marginBottom: 20,
        position: 'relative',
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    journalAbstractBg: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    journalCloud: {
        position: 'absolute',
        flexDirection: 'row',
        opacity: 0.6,
    },
    cloudPart: {
        backgroundColor: '#FFFBEB',
        borderRadius: 20,
    },
    journalSun: {
        position: 'absolute',
        top: 25,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sunGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FDE68A',
        opacity: 0.4,
    },
    journalSunEmoji: {
        fontSize: 32,
        zIndex: 2,
    },
    treeGroup: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    journalTree: {
        position: 'absolute',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 3,
    },
    journalHills: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        height: 70,
        flexDirection: 'row',
    },
    journalHill: {
        position: 'absolute',
        width: 140,
        height: 70,
        borderTopLeftRadius: 70,
        borderTopRightRadius: 70,
    },
    journalContent: {
        position: 'relative',
        zIndex: 10,
        padding: 20,
        paddingTop: 24,
        justifyContent: 'flex-start',
    },
    journalTextBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    journalCardTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#78350F',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    journalCardSubtitle: {
        fontSize: 12,
        color: '#92400E',
        fontWeight: '500',
        lineHeight: 16,
    },
    quickJournalSection: {
        marginTop: 4,
    },
    quickJournalTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 12,
    },
    quickJournalScroll: {
        paddingRight: 16,
        gap: 12,
    },
    quickJournalCard: {
        width: 160,
        borderRadius: 16,
        padding: 16,
        minHeight: 160,
        justifyContent: 'space-between',
        marginRight: 0,
    },
    quickJournalEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    quickJournalLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 8,
    },
    quickJournalPrompt: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 18,
        marginBottom: 12,
        flex: 1,
    },
    quickJournalTag: {
        fontSize: 10,
        fontWeight: '600',
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    sliderContainerNew: {
        marginTop: 16,
    },
    sliderTrackNew: {
        position: 'relative',
        height: 60,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#1F2937',
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
        color: '#1F2937',
        letterSpacing: 0.5,
    },
    sliderArrowNew: {
        fontSize: 18,
        color: '#1F2937',
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
        backgroundColor: '#1F2937',
        opacity: 0.2,
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
        color: '#1F2937',
    },
    miniStatTextFire: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
    },
    // Abstract Quick Actions Styles
    quickActionAbstractCard: {
        width: '48%',
        height: 160,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 8,
    },
    quickActionGradient: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    decorCircle: {
        position: 'absolute',
        borderRadius: 1000,
    },
    decorStar: {
        position: 'absolute',
        fontSize: 16,
    },
    quickActionContent: {
        alignItems: 'center',
        zIndex: 10,
    },
    quickActionIconNew: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 4,
    },
    quickActionTitleNew: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1F2937',
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    quickActionSubNew: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
    },
    quickActionsGridNew: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
});
