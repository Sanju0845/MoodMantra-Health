import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
    StyleSheet,
    Dimensions,
    Modal,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
    Smile,
    Calendar,
    Activity,
    MessageCircle,
    BookOpen,
    Users,
    Heart,
    Target,
    Droplets,
    Moon,
    Wind,
    CheckSquare,
    ChevronRight,
    ChevronDown,
    Globe,
    Flame,
    Bell,
    Sparkles,
    Brain,
    TrendingUp,
    Zap,
    Star,
    Award,
    GraduationCap,
    Clock,
    Languages,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useWellness } from "@/context/WellnessContext";
import { supabase } from "../../utils/supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MOOD_OPTIONS = [
    { id: "great", emoji: "😊", label: "Great", color: "#10B981" },
    { id: "good", emoji: "🙂", label: "Good", color: "#22C55E" },
    { id: "okay", emoji: "😐", label: "Okay", color: "#EAB308" },
    { id: "bad", emoji: "😔", label: "Low", color: "#3B82F6" },
    { id: "terrible", emoji: "😢", label: "Sad", color: "#EF4444" },
];

const LANGUAGES = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const { water, sleep, breathing, habits, refreshData: refreshWellness } = useWellness();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [doctors, setDoctors] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loggingStreak, setLoggingStreak] = useState(0);
    const [waterToday, setWaterToday] = useState(0);
    const [breathingToday, setBreathingToday] = useState(0);
    const [showLanguageModal, setShowLanguageModal] = useState(false);
    const scrollViewRef = useRef(null);
    const [currentScrollIndex, setCurrentScrollIndex] = useState(0);

    // Create infinite loop by tripling the doctors array
    const infiniteDoctors = useMemo(() => {
        if (doctors.length === 0) return [];
        return [...doctors, ...doctors, ...doctors];
    }, [doctors]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const waterProgress = Math.min(waterToday / 2000, 1);
    const sleepProgress = Math.min(sleep.today / 8, 1);
    const breathingProgress = Math.min(breathingToday / 3, 1);
    const completedHabits = habits.logs.find(l => l.date === new Date().toDateString())?.completedIds?.length || 0;
    const totalHabits = habits.list.length;
    const habitsProgress = totalHabits > 0 ? completedHabits / totalHabits : 0;

    useFocusEffect(
        useCallback(() => {
            loadData();
            refreshWellness();
        }, [])
    );

    // Set initial scroll position to middle section
    useEffect(() => {
        if (doctors.length > 0 && scrollViewRef.current) {
            const cardWidth = SCREEN_WIDTH * 0.70 + 12;
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    x: doctors.length * cardWidth,
                    animated: false,
                });
                setCurrentScrollIndex(doctors.length);
            }, 100);
        }
    }, [doctors.length]);

    const changeLanguage = async (langCode) => {
        await i18n.changeLanguage(langCode);
        await AsyncStorage.setItem('language', langCode);
        setShowLanguageModal(false);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');
            const storedUserData = await AsyncStorage.getItem('userData');

            // Set stored user data immediately if available
            if (storedUserData) {
                try {
                    const parsedUserData = JSON.parse(storedUserData);
                    if (parsedUserData?.name) {
                        setUser(parsedUserData);
                    }
                } catch (e) { }
            }

            const [profileResponse, doctorsResponse, appointmentsResponse] = await Promise.all([
                api.getProfile().catch(() => ({ success: false })),
                api.getDoctors().catch(() => ({ doctors: [] })),
                api.getUserAppointments().catch(() => ({ appointments: [] })),
            ]);

            if (profileResponse.success && profileResponse.user) {
                setUser(profileResponse.user);
            } else if (userId) {
                // Try to get profile from Supabase
                try {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (profile) {
                        const storedData = storedUserData ? JSON.parse(storedUserData) : {};
                        setUser({
                            name: profile.full_name || profile.name || storedData.name,
                            email: profile.email,
                            avatar: profile.avatar_url,
                        });
                    }
                } catch (e) {
                    // storedUserData already set above, no need to do anything
                }
            }

            if (doctorsResponse.success && Array.isArray(doctorsResponse.doctors)) {
                setDoctors(doctorsResponse.doctors.slice(0, 5));
            }
            if (appointmentsResponse.success) {
                setAppointments(appointmentsResponse.appointments.filter((apt) => !apt.cancelled && !apt.isCompleted).slice(0, 2));
            }

            if (userId) {
                try {
                    const { data: waterLogs } = await supabase.from('water_logs').select('*').eq('user_id', userId);
                    if (waterLogs) {
                        const todayStr = new Date().toDateString();
                        setWaterToday(waterLogs.filter(log => new Date(log.logged_at).toDateString() === todayStr).reduce((sum, log) => sum + log.amount_ml, 0));
                    }
                } catch (e) { }

                try {
                    const { data: breathingSessions } = await supabase.from('breathing_sessions').select('*').eq('user_id', userId);
                    if (breathingSessions) {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        setBreathingToday(breathingSessions.filter(s => s.session_date === todayStr).length);
                    }
                } catch (e) { }

                try {
                    const weeklyData = await api.getWeeklyMoodAnalytics(userId);
                    let moodDataArray = weeklyData?.moodData || weeklyData?.moodEntries || weeklyData?.data || [];
                    if (moodDataArray.length > 0) {
                        const sortedEntries = [...moodDataArray].sort((a, b) => new Date(b.date || b.timestamp || b.createdAt) - new Date(a.date || a.timestamp || a.createdAt));
                        let streak = 0;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        let checkDate = new Date(today);
                        for (const entry of sortedEntries) {
                            const entryDate = new Date(entry.date || entry.timestamp || entry.createdAt);
                            entryDate.setHours(0, 0, 0, 0);
                            if (entryDate.getTime() === checkDate.getTime()) {
                                streak++;
                                checkDate.setDate(checkDate.getDate() - 1);
                            } else if (entryDate.getTime() < checkDate.getTime()) break;
                        }
                        setLoggingStreak(streak);
                    }
                } catch (e) { }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        await refreshWellness();
        setRefreshing(false);
    };

    // Auto-scroll carousel with glitch prevention
    useEffect(() => {
        if (infiniteDoctors.length === 0 || doctors.length === 0) return;

        let isUserScrolling = false;
        let scrollTimeout;

        const interval = setInterval(() => {
            if (isUserScrolling) return; // Don't auto-scroll if user is scrolling

            setCurrentScrollIndex((prevIndex) => {
                const cardWidth = SCREEN_WIDTH * 0.70 + 12;
                const nextIndex = prevIndex + 1;

                // Scroll to next card smoothly
                scrollViewRef.current?.scrollTo({
                    x: nextIndex * cardWidth,
                    animated: true,
                });

                // Check if we need to reset (approaching end of middle section)
                const middleSectionEnd = doctors.length * 2 - 1;
                if (nextIndex >= middleSectionEnd) {
                    // Wait for animation to complete, then reset
                    setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                            x: doctors.length * cardWidth,
                            animated: false,
                        });
                    }, 400);
                    return doctors.length;
                }

                return nextIndex;
            });
        }, 4000); // Scroll every 4 seconds

        return () => clearInterval(interval);
    }, [infiniteDoctors.length, doctors.length]);

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        onPress={() => router.push("/(tabs)/profile")}
                    >
                        <Image
                            source={{ uri: user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || "User"}&background=6366F1&color=fff&size=100` }}
                            style={styles.avatar}
                        />
                        <View style={styles.onlineDot} />
                    </TouchableOpacity>
                    <View style={styles.greetingBox}>
                        <Text style={styles.greetingText}>{getGreeting()}</Text>
                        <Text style={styles.userName}>{user?.name?.split(' ')[0] || "Friend"} 👋</Text>
                        <Text style={styles.dateText}>{todayDate}</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setShowLanguageModal(true)}>
                        <Globe size={20} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}>
                        <View style={styles.notifBadge} />
                        <Bell size={20} color="#475569" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
            >
                {/* Mood Card - Enhanced */}
                <View style={styles.moodCard}>
                    <LinearGradient
                        colors={["#FFFFFF", "#F8FAFC"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.moodGradient}
                    >
                        <View style={styles.moodHeader}>
                            <View style={styles.moodHeaderLeft}>
                                <Heart size={22} color="#F472B6" strokeWidth={2} />
                                <View>
                                    <Text style={styles.moodTitle}>How are you feeling?</Text>
                                    <Text style={styles.moodSubtitle}>Check in with yourself today</Text>
                                </View>
                            </View>
                            {loggingStreak > 0 && (
                                <View style={styles.streakBadge}>
                                    <Flame size={13} color="#F59E0B" strokeWidth={2} />
                                    <Text style={styles.streakText}>{loggingStreak}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.moodRow}>
                            {MOOD_OPTIONS.map((mood) => (
                                <TouchableOpacity
                                    key={mood.id}
                                    style={styles.moodItem}
                                    onPress={() => router.push("/(tabs)/journal")}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.moodCircle, { backgroundColor: "#F8FAFC" }]}>
                                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                    </View>
                                    <Text style={styles.moodLabel}>{mood.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.insightBtn} onPress={() => router.push("/mood/dashboard")}>
                            <Activity size={16} color="#64748B" strokeWidth={2} />
                            <Text style={styles.insightText}>View mood insights</Text>
                            <ChevronRight size={16} color="#CBD5E1" strokeWidth={2} />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Let's Have A Conversation - Therapist Section */}
                {doctors.length > 0 && (
                    <View style={styles.therapistSection}>
                        <Text style={styles.sectionTitle}>Let's Have A Conversation</Text>
                        <Text style={styles.sectionSubtitle}>
                            Chat with our therapist and help us understand what you need.
                        </Text>

                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.therapistScroll}
                            snapToInterval={SCREEN_WIDTH * 0.70 + 12}
                            decelerationRate="fast"
                            scrollEventThrottle={16}
                        >
                            {infiniteDoctors.map((doctor, index) => (
                                <View key={`${doctor._id}-${index}`} style={styles.therapistCardWrapper}>
                                    <TouchableOpacity
                                        style={styles.therapistCard}
                                        onPress={() => router.push(`/doctors/${doctor._id}`)}
                                        activeOpacity={0.9}
                                    >
                                        {/* Profile Image with gradient border */}
                                        <View style={styles.therapistImgWrapper}>
                                            <LinearGradient
                                                colors={["#F97316", "#FB923C", "#FDBA74"]}
                                                style={styles.therapistImgBorder}
                                            >
                                                <Image
                                                    source={{ uri: doctor.image || "https://via.placeholder.com/80" }}
                                                    style={styles.therapistImg}
                                                />
                                            </LinearGradient>
                                        </View>

                                        {/* Info */}
                                        <View style={styles.therapistInfo}>
                                            <Text style={styles.therapistName} numberOfLines={1}>
                                                {doctor.name}
                                            </Text>
                                            <View style={styles.therapistDetail}>
                                                <GraduationCap size={14} color="#0D9488" />
                                                <Text style={styles.therapistDetailText} numberOfLines={1}>
                                                    {doctor.qualification || "M.Phil Clinical Psychology, M.Sc ..."}
                                                </Text>
                                            </View>
                                            <View style={styles.therapistDetail}>
                                                <Clock size={14} color="#0D9488" />
                                                <Text style={styles.therapistDetailText}>
                                                    {doctor.experience || "3 yrs. exp."}
                                                </Text>
                                            </View>
                                            <View style={styles.therapistDetail}>
                                                <Languages size={14} color="#0D9488" />
                                                <Text style={styles.therapistDetailText}>
                                                    {doctor.languages || "English, Hindi"}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Chevron */}
                                        <ChevronRight size={20} color="#94A3B8" />
                                    </TouchableOpacity>

                                    {/* LET'S CHAT Button */}
                                    <TouchableOpacity
                                        style={styles.chatBtn}
                                        onPress={() => router.push(`/doctors/${doctor._id}`)}
                                    >
                                        <Text style={styles.chatBtnText}>LET'S CHAT</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Quick Actions - Premium */}
                <View style={styles.quickActionsSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionHeaderTitle}>Quick Actions</Text>
                        <Sparkles size={18} color="#F59E0B" strokeWidth={2.5} />
                    </View>

                    <View style={styles.quickActionsGrid}>
                        {/* Raska AI */}
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/(tabs)/chat")}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#8B5CF6", "#6366F1", "#4F46E5"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.quickActionGradient}
                            >
                                <View style={styles.quickActionIconCircle}>
                                    <Brain size={36} color="#FFFFFF" strokeWidth={2} />
                                </View>
                                <View style={styles.quickActionContent}>
                                    <Text style={styles.quickActionTitle}>Raska AI</Text>
                                    <Text style={styles.quickActionSubtitle}>Chat now</Text>
                                </View>
                                <View style={styles.quickActionShimmer} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Notes */}
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/notes")}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#EC4899", "#DB2777", "#BE185D"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.quickActionGradient}
                            >
                                <View style={styles.quickActionIconCircle}>
                                    <BookOpen size={36} color="#FFFFFF" strokeWidth={2} />
                                </View>
                                <View style={styles.quickActionContent}>
                                    <Text style={styles.quickActionTitle}>Notes</Text>
                                    <Text style={styles.quickActionSubtitle}>Write down</Text>
                                </View>
                                <View style={styles.quickActionShimmer} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Breathe */}
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/wellness/breathing")}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#06B6D4", "#0891B2", "#0E7490"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.quickActionGradient}
                            >
                                <View style={styles.quickActionIconCircle}>
                                    <Wind size={36} color="#FFFFFF" strokeWidth={2} />
                                </View>
                                <View style={styles.quickActionContent}>
                                    <Text style={styles.quickActionTitle}>Breathe</Text>
                                    <Text style={styles.quickActionSubtitle}>3 min relax</Text>
                                </View>
                                <View style={styles.quickActionShimmer} />
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Assess */}
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => router.push("/(tabs)/assessment")}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={["#F59E0B", "#D97706", "#B45309"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.quickActionGradient}
                            >
                                <View style={styles.quickActionIconCircle}>
                                    <Target size={36} color="#FFFFFF" strokeWidth={2} />
                                </View>
                                <View style={styles.quickActionContent}>
                                    <Text style={styles.quickActionTitle}>Assess</Text>
                                    <Text style={styles.quickActionSubtitle}>Track progress</Text>
                                </View>
                                <View style={styles.quickActionShimmer} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Journal Section Header */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderTitle}>Journal</Text>
                </View>

                {/* Journal Card - Illustrated */}
                <TouchableOpacity style={styles.journalCard} activeOpacity={0.95} onPress={() => router.push("/notes")}>
                    <View style={styles.journalBg}>
                        <View style={styles.journalSky} />
                        <View style={[styles.mountain, { left: 0, bottom: 0, borderLeftWidth: 100, borderRightWidth: 80, borderBottomWidth: 80, borderBottomColor: "#7CB89E" }]} />
                        <View style={[styles.mountain, { left: 60, bottom: 0, borderLeftWidth: 70, borderRightWidth: 60, borderBottomWidth: 60, borderBottomColor: "#5A9A7B" }]} />
                        <View style={[styles.mountain, { right: 0, bottom: 0, borderLeftWidth: 90, borderRightWidth: 70, borderBottomWidth: 70, borderBottomColor: "#6BAA8A" }]} />
                        <View style={[styles.tree, { left: 30, bottom: 10 }]}>
                            <View style={styles.treeTop} />
                            <View style={styles.treeTrunk} />
                        </View>
                        <View style={[styles.tree, { right: 40, bottom: 15, transform: [{ scale: 0.8 }] }]}>
                            <View style={styles.treeTop} />
                            <View style={styles.treeTrunk} />
                        </View>
                        <View style={[styles.tree, { right: 80, bottom: 5, transform: [{ scale: 0.6 }] }]}>
                            <View style={styles.treeTop} />
                            <View style={styles.treeTrunk} />
                        </View>
                    </View>
                    <View style={styles.journalContent}>
                        <View style={styles.journalNotebook}>
                            <Text style={styles.journalLabel}>YOUR</Text>
                            <Text style={styles.journalTitle}>JOURNAL</Text>
                            <View style={styles.journalLine} />
                            <View style={styles.journalLine} />
                            <View style={styles.journalLine} />
                        </View>
                    </View>
                    <View style={styles.journalBottom}>
                        <Text style={styles.journalQuestion}>Today's Question:</Text>
                        <Text style={styles.journalPrompt}>What are the three things{'\n'}that you are grateful for today?</Text>
                        <View style={styles.journalBtn}>
                            <Text style={styles.journalBtnText}>TAP TO BEGIN</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Daily Wellness */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <TrendingUp size={20} color="#10B981" />
                        <Text style={styles.cardTitle}>Today's Wellness</Text>
                    </View>
                    <View style={styles.wellnessGrid}>
                        <TouchableOpacity style={styles.wellnessItem} onPress={() => router.push("/wellness/water")}>
                            <View style={[styles.wellnessIcon, { backgroundColor: "#DBEAFE" }]}>
                                <Droplets size={22} color="#2563EB" />
                            </View>
                            <View style={styles.wellnessInfo}>
                                <Text style={styles.wellnessValue}>{waterToday}ml</Text>
                                <Text style={styles.wellnessLabel}>Water</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${waterProgress * 100}%`, backgroundColor: "#2563EB" }]} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessItem} onPress={() => router.push("/wellness/sleep")}>
                            <View style={[styles.wellnessIcon, { backgroundColor: "#F3E8FF" }]}>
                                <Moon size={22} color="#9333EA" />
                            </View>
                            <View style={styles.wellnessInfo}>
                                <Text style={styles.wellnessValue}>{sleep.today}h</Text>
                                <Text style={styles.wellnessLabel}>Sleep</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${sleepProgress * 100}%`, backgroundColor: "#9333EA" }]} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessItem} onPress={() => router.push("/wellness/breathing")}>
                            <View style={[styles.wellnessIcon, { backgroundColor: "#CCFBF1" }]}>
                                <Wind size={22} color="#0D9488" />
                            </View>
                            <View style={styles.wellnessInfo}>
                                <Text style={styles.wellnessValue}>{breathingToday}/3</Text>
                                <Text style={styles.wellnessLabel}>Breathing</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${breathingProgress * 100}%`, backgroundColor: "#0D9488" }]} />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.wellnessItem} onPress={() => router.push("/wellness/habits")}>
                            <View style={[styles.wellnessIcon, { backgroundColor: "#FEF3C7" }]}>
                                <CheckSquare size={22} color="#D97706" />
                            </View>
                            <View style={styles.wellnessInfo}>
                                <Text style={styles.wellnessValue}>{completedHabits}/{totalHabits}</Text>
                                <Text style={styles.wellnessLabel}>Habits</Text>
                            </View>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${habitsProgress * 100}%`, backgroundColor: "#D97706" }]} />
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Goals Card */}
                <TouchableOpacity style={styles.card} onPress={() => router.push("/goals")}>
                    <View style={styles.goalsRow}>
                        <View style={styles.goalsIconBox}>
                            <Target size={26} color="#6366F1" />
                        </View>
                        <View style={styles.goalsText}>
                            <Text style={styles.goalsTitle}>Goals & Habits</Text>
                            <Text style={styles.goalsSubtitle}>Track your daily progress</Text>
                        </View>
                        <ChevronRight size={22} color="#94A3B8" />
                    </View>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.sectionDivider} />

                {/* Community */}
                <TouchableOpacity style={styles.communityCard} onPress={() => router.push("/(tabs)/community")}>
                    <LinearGradient colors={["#EEF2FF", "#E0E7FF"]} style={styles.communityGradient}>
                        <View style={styles.handsRow}>
                            <View style={[styles.handShape, { backgroundColor: "#FBBF24" }]} />
                            <View style={[styles.handShape, { backgroundColor: "#F472B6" }]} />
                            <View style={[styles.handShape, { backgroundColor: "#60A5FA" }]} />
                            <View style={[styles.handShape, { backgroundColor: "#34D399" }]} />
                        </View>
                        <Text style={styles.communityTitle}>Join Our Community</Text>
                        <Text style={styles.communitySubtitle}>Connect with others on the same journey</Text>
                        <View style={styles.communityBtn}>
                            <Text style={styles.communityBtnText}>EXPLORE</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>

            {/* Language Modal */}
            <Modal visible={showLanguageModal} transparent animationType="fade" onRequestClose={() => setShowLanguageModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[styles.langOption, i18n.language === lang.code && styles.langOptionActive]}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <Text style={[styles.langText, i18n.language === lang.code && styles.langTextActive]}>
                                    {lang.native} ({lang.label})
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLanguageModal(false)}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },

    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatarContainer: {
        position: "relative",
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#E2E8F0",
        borderWidth: 2,
        borderColor: "#E2E8F0",
    },
    onlineDot: {
        position: "absolute",
        bottom: 2,
        right: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#22C55E",
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    greetingBox: {
        gap: 1,
    },
    greetingText: {
        fontSize: 12,
        color: "#94A3B8",
        fontWeight: "400",
        fontStyle: "italic",
    },
    userName: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        letterSpacing: -0.5,
    },
    dateText: {
        fontSize: 11,
        color: "#94A3B8",
        fontWeight: "300",
        marginTop: 3,
        letterSpacing: 0.3,
    },
    headerRight: {
        flexDirection: "row",
        gap: 8,
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    notifBadge: {
        position: "absolute",
        top: 10,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
        zIndex: 1,
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },

    // Card Base
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
    },
    cardTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
    },
    viewAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#6366F1",
        fontStyle: "italic",
    },

    // Section Divider
    sectionDivider: {
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 8,
    },

    // Mood Card - Enhanced
    moodCard: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    moodGradient: {
        padding: 22,
    },
    moodHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 18,
    },
    moodHeaderLeft: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
        flex: 1,
    },
    moodTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 3,
        letterSpacing: -0.2,
    },
    moodSubtitle: {
        fontSize: 13,
        color: "#94A3B8",
        fontWeight: "400",
        fontStyle: "italic",
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 10,
    },
    streakText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#D97706",
    },
    moodRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
    },
    moodItem: {
        alignItems: "center",
        gap: 8,
        flex: 1,
    },
    moodCircle: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    moodEmoji: {
        fontSize: 28,
    },
    moodLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#64748B",
        letterSpacing: 0.2,
    },
    insightBtn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 13,
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    insightText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#64748B",
        fontStyle: "italic",
    },

    // Quick Actions - Premium
    quickActionsSection: {
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionHeaderTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        letterSpacing: -0.3,
    },
    quickActionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    quickActionCard: {
        width: (SCREEN_WIDTH - 32 - 12) / 2,
        height: 140,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    quickActionGradient: {
        flex: 1,
        padding: 18,
        justifyContent: "space-between",
        position: "relative",
    },
    quickActionIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    quickActionContent: {
        gap: 3,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    quickActionSubtitle: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 0.2,
    },
    quickActionShimmer: {
        position: "absolute",
        top: 0,
        right: 0,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        transform: [{ translateX: 20 }, { translateY: -20 }],
    },

    // Journal
    journalCard: {
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#87CEAA",
        borderWidth: 1,
        borderColor: "#6BAA8A",
        marginHorizontal: SCREEN_WIDTH * 0.075,
    },
    journalBg: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 130,
        overflow: "hidden",
    },
    journalSky: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: "#B5E5C9",
    },
    mountain: {
        position: "absolute",
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    tree: {
        position: "absolute",
        alignItems: "center",
    },
    treeTop: {
        width: 0,
        height: 0,
        borderLeftWidth: 15,
        borderRightWidth: 15,
        borderBottomWidth: 30,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderBottomColor: "#2D5A3D",
    },
    treeTrunk: {
        width: 6,
        height: 10,
        backgroundColor: "#8B4513",
    },
    journalContent: {
        paddingTop: 90,
        paddingHorizontal: 20,
        alignItems: "center",
    },
    journalNotebook: {
        backgroundColor: "#FFF9F0",
        width: 130,
        padding: 18,
        borderRadius: 8,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 2, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 4,
    },
    journalLabel: {
        fontSize: 9,
        fontWeight: "600",
        color: "#94A3B8",
        letterSpacing: 2,
    },
    journalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#6366F1",
        marginBottom: 10,
    },
    journalLine: {
        width: "100%",
        height: 1,
        backgroundColor: "#E2E8F0",
        marginVertical: 5,
    },
    journalBottom: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        alignItems: "center",
    },
    journalQuestion: {
        fontSize: 10,
        fontWeight: "600",
        color: "#1E293B",
        letterSpacing: 0.5,
        textTransform: "uppercase",
        marginBottom: 6,
    },
    journalPrompt: {
        fontSize: 15,
        color: "#334155",
        textAlign: "center",
        lineHeight: 22,
        marginBottom: 14,
        fontWeight: "300",
        fontStyle: "italic",
    },
    journalBtn: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 22,
        paddingVertical: 10,
        borderRadius: 20,
    },
    journalBtnText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#6366F1",
        letterSpacing: 0.5,
    },

    // Therapist Section
    therapistSection: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "400",
        lineHeight: 20,
        marginBottom: 20,
    },
    therapistScroll: {
        paddingLeft: SCREEN_WIDTH * 0.12,
        paddingRight: SCREEN_WIDTH * 0.15,
        gap: 12,
    },
    therapistCardWrapper: {
        width: SCREEN_WIDTH * 0.70,
        alignItems: "center",
    },
    therapistCard: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 12,
    },
    therapistImgWrapper: {
        alignItems: "center",
        justifyContent: "center",
    },
    therapistImgBorder: {
        width: 74,
        height: 74,
        borderRadius: 37,
        padding: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    therapistImg: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: "#FFFFFF",
    },
    therapistInfo: {
        flex: 1,
        gap: 6,
    },
    therapistName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 2,
    },
    therapistDetail: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    therapistDetailText: {
        fontSize: 12,
        color: "#475569",
        fontWeight: "400",
        flex: 1,
    },
    chatBtn: {
        backgroundColor: "#0D9488",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 28,
        marginTop: 18,
        shadowColor: "#0D9488",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    chatBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 1,
    },

    // Wellness
    wellnessGrid: {
        gap: 14,
    },
    wellnessItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        backgroundColor: "#F8FAFC",
        padding: 14,
        borderRadius: 14,
    },
    wellnessIcon: {
        width: 50,
        height: 50,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    wellnessInfo: {
        flex: 1,
    },
    wellnessValue: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1E293B",
    },
    wellnessLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "400",
        fontStyle: "italic",
    },
    progressBar: {
        width: 70,
        height: 8,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
    },

    // Goals
    goalsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    goalsIconBox: {
        width: 54,
        height: 54,
        borderRadius: 16,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
    },
    goalsText: {
        flex: 1,
    },
    goalsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 2,
    },
    goalsSubtitle: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "300",
        fontStyle: "italic",
    },

    // Community
    communityCard: {
        borderRadius: 22,
        overflow: "hidden",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    communityGradient: {
        padding: 28,
        alignItems: "center",
    },
    handsRow: {
        flexDirection: "row",
        gap: 14,
        marginBottom: 20,
    },
    handShape: {
        width: 36,
        height: 54,
        borderRadius: 18,
        transform: [{ rotate: "8deg" }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    communityTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1E293B",
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    communitySubtitle: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 18,
        fontWeight: "300",
        fontStyle: "italic",
    },
    communityBtn: {
        backgroundColor: "#6366F1",
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 25,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    communityBtnText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },

    // Appointments
    appointmentRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#F1F5F9",
    },
    appointmentIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
    },
    appointmentInfo: {
        flex: 1,
    },
    appointmentDoc: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
    },
    appointmentTime: {
        fontSize: 12,
        color: "#64748B",
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        maxWidth: 320,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 16,
        textAlign: "center",
    },
    langOption: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#F8FAFC",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    langOptionActive: {
        backgroundColor: "#EEF2FF",
        borderColor: "#6366F1",
    },
    langText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#475569",
        textAlign: "center",
    },
    langTextActive: {
        color: "#6366F1",
    },
    modalCancel: {
        marginTop: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#64748B",
    },
});