import { useState, useEffect, useCallback } from "react";
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
    Globe,
    Flame,
    Menu,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { useWellness } from "@/context/WellnessContext";
import { supabase } from "../../utils/supabaseClient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Mood Options for Quick Access
const MOOD_OPTIONS = [
    { id: "great", emoji: "�", label: "Great", color: "#14B8A6" },
    { id: "good", emoji: "�", label: "Good", color: "#10B981" },
    { id: "okay", emoji: "�", label: "Okay", color: "#F59E0B" },
    { id: "bad", emoji: "😔", label: "Bad", color: "#3B82F6" },
    { id: "terrible", emoji: "😫", label: "Terrible", color: "#DC2626" },
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
    const [moodEntries, setMoodEntries] = useState([]);
    const [loggingStreak, setLoggingStreak] = useState(0);
    const [waterToday, setWaterToday] = useState(0);
    const [breathingToday, setBreathingToday] = useState(0);
    const [showLanguageModal, setShowLanguageModal] = useState(false);

    const todayDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    // Wellness progress calculations
    const waterProgress = waterToday / 2000;
    const sleepProgress = sleep.today / 8;
    const breathingProgress = breathingToday / 3;
    const completedHabits = habits.logs.find(l => l.date === new Date().toDateString())?.completedIds?.length || 0;
    const totalHabits = habits.list.length;
    const habitsProgress = totalHabits > 0 ? completedHabits / totalHabits : 0;

    useFocusEffect(
        useCallback(() => {
            loadData();
            refreshWellness();
        }, [])
    );

    const changeLanguage = async (langCode) => {
        await i18n.changeLanguage(langCode);
        await AsyncStorage.setItem('language', langCode);
        setShowLanguageModal(false);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');

            const [profileResponse, doctorsResponse, appointmentsResponse] = await Promise.all([
                api.getProfile().catch(() => ({ success: false })),
                api.getDoctors().catch(() => ({ doctors: [] })),
                api.getUserAppointments().catch(() => ({ appointments: [] })),
            ]);

            if (profileResponse.success) {
                setUser(profileResponse.user);
            }

            if (doctorsResponse.success && Array.isArray(doctorsResponse.doctors)) {
                setDoctors(doctorsResponse.doctors.slice(0, 3));
            }

            if (appointmentsResponse.success) {
                const upcoming = appointmentsResponse.appointments
                    .filter((apt) => !apt.cancelled && !apt.isCompleted)
                    .slice(0, 2);
                setAppointments(upcoming);
            }

            if (userId) {
                // Load water data
                try {
                    const { data: waterLogs } = await supabase
                        .from('water_logs')
                        .select('*')
                        .eq('user_id', userId);

                    if (waterLogs) {
                        const todayStr = new Date().toDateString();
                        const todayLogs = waterLogs.filter(log =>
                            new Date(log.logged_at).toDateString() === todayStr
                        );
                        const todayTotal = todayLogs.reduce((sum, log) => sum + log.amount_ml, 0);
                        setWaterToday(todayTotal);
                    }
                } catch (e) {
                    console.log("Error loading water:", e);
                }

                // Load breathing data
                try {
                    const { data: breathingSessions } = await supabase
                        .from('breathing_sessions')
                        .select('*')
                        .eq('user_id', userId);

                    if (breathingSessions) {
                        const today = new Date();
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const todaySessions = breathingSessions.filter(session => session.session_date === todayStr);
                        setBreathingToday(todaySessions.length);
                    }
                } catch (e) {
                    console.log("Error loading breathing:", e);
                }

                // Load mood data for streak
                try {
                    const weeklyData = await api.getWeeklyMoodAnalytics(userId);
                    let moodDataArray = weeklyData?.moodData || weeklyData?.moodEntries || weeklyData?.data || [];

                    if (moodDataArray.length > 0) {
                        const sortedEntries = [...moodDataArray].sort((a, b) =>
                            new Date(b.date || b.timestamp || b.createdAt) - new Date(a.date || a.timestamp || a.createdAt)
                        );
                        setMoodEntries(sortedEntries);

                        // Calculate streak
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
                            } else if (entryDate.getTime() < checkDate.getTime()) {
                                break;
                            }
                        }
                        setLoggingStreak(streak);
                    }
                } catch (e) {
                    console.log("Error loading mood:", e);
                }
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

    if (loading) {
        return (
            <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color="#14B8A6" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hi, {user?.name?.split(" ")[0] || "there"}!</Text>
                    <Text style={styles.dateText}>{todayDate}</Text>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.languageButton}
                        onPress={() => setShowLanguageModal(true)}
                    >
                        <Globe size={16} color="#64748B" />
                        <Text style={styles.languageText}>
                            {LANGUAGES.find(l => l.code === i18n.language)?.code?.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/(tabs)/profile")}>
                        <View style={styles.profilePic}>
                            <Text style={styles.profileInitial}>
                                {user?.name?.charAt(0) || "U"}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#14B8A6" />
                }
            >
                {/* Mood Tracker Card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>How are you feeling?</Text>
                    <Text style={styles.cardSubtitle}>
                        Track your mood to understand patterns
                    </Text>

                    <View style={styles.moodGrid}>
                        {MOOD_OPTIONS.map((mood) => (
                            <TouchableOpacity
                                key={mood.id}
                                style={styles.moodOption}
                                onPress={() => router.push("/(tabs)/journal")}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                <Text style={styles.moodLabel}>{mood.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loggingStreak > 0 && (
                        <View style={styles.streakBadge}>
                            <Flame size={16} color="#F59E0B" fill="#F59E0B" />
                            <Text style={styles.streakText}>{loggingStreak} day streak!</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => router.push("/mood/dashboard")}
                    >
                        <Activity size={18} color="#64748B" />
                        <Text style={styles.viewButtonText}>View Mood Insights</Text>
                        <ChevronRight size={18} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Wellness Overview */}
                <Text style={styles.sectionTitle}>Your Wellness</Text>

                <View style={styles.wellnessGrid}>
                    <TouchableOpacity
                        style={[styles.wellnessCard, { backgroundColor: '#E0F2FE' }]}
                        onPress={() => router.push("/wellness/water")}
                    >
                        <Droplets size={24} color="#0284C7" />
                        <Text style={styles.wellnessValue}>{waterToday}ml</Text>
                        <Text style={styles.wellnessLabel}>Water</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(waterProgress * 100, 100)}%`, backgroundColor: '#0284C7' }]} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.wellnessCard, { backgroundColor: '#F3E8FF' }]}
                        onPress={() => router.push("/wellness/sleep")}
                    >
                        <Moon size={24} color="#9333EA" />
                        <Text style={styles.wellnessValue}>{sleep.today}h</Text>
                        <Text style={styles.wellnessLabel}>Sleep</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(sleepProgress * 100, 100)}%`, backgroundColor: '#9333EA' }]} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.wellnessCard, { backgroundColor: '#DBEAFE' }]}
                        onPress={() => router.push("/wellness/breathing")}
                    >
                        <Wind size={24} color="#2563EB" />
                        <Text style={styles.wellnessValue}>{breathingToday}/3</Text>
                        <Text style={styles.wellnessLabel}>Breathing</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(breathingProgress * 100, 100)}%`, backgroundColor: '#2563EB' }]} />
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.wellnessCard, { backgroundColor: '#FEF3C7' }]}
                        onPress={() => router.push("/wellness/habits")}
                    >
                        <CheckSquare size={24} color="#D97706" />
                        <Text style={styles.wellnessValue}>{completedHabits}/{totalHabits}</Text>
                        <Text style={styles.wellnessLabel}>Habits</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(habitsProgress * 100, 100)}%`, backgroundColor: '#D97706' }]} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Notes Card */}
                <TouchableOpacity
                    style={styles.notesCard}
                    onPress={() => router.push("/notes")}
                >
                    <View style={styles.notesContent}>
                        <BookOpen size={28} color="#7C3AED" />
                        <View style={styles.notesText}>
                            <Text style={styles.notesTitle}>Your Notes</Text>
                            <Text style={styles.notesSubtitle}>
                                Capture your thoughts and reflections
                            </Text>
                        </View>
                    </View>
                    <ChevronRight size={24} color="#CBD5E1" />
                </TouchableOpacity>

                {/* Therapists Section */}
                {doctors.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Talk to a Therapist</Text>
                            <TouchableOpacity onPress={() => router.push("/(tabs)/doctors")}>
                                <Text style={styles.viewAll}>View All</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.doctorsScroll}
                        >
                            {doctors.map((doctor) => (
                                <TouchableOpacity
                                    key={doctor._id}
                                    style={styles.doctorCard}
                                    onPress={() => router.push(`/doctors/${doctor._id}`)}
                                >
                                    <Image
                                        source={{ uri: doctor.image || "https://via.placeholder.com/100" }}
                                        style={styles.doctorImage}
                                    />
                                    <Text style={styles.doctorName} numberOfLines={1}>
                                        {doctor.name}
                                    </Text>
                                    <Text style={styles.doctorSpecialty} numberOfLines={1}>
                                        {doctor.specialty}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Appointments */}
                {appointments.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                        {appointments.map((apt) => (
                            <View key={apt._id} style={styles.appointmentCard}>
                                <Calendar size={20} color="#14B8A6" />
                                <View style={styles.appointmentInfo}>
                                    <Text style={styles.appointmentDoctor}>{apt.doctorName}</Text>
                                    <Text style={styles.appointmentTime}>
                                        {apt.slotDate} - {apt.slotTime}
                                    </Text>
                                </View>
                                <ChevronRight size={20} color="#CBD5E1" />
                            </View>
                        ))}
                    </View>
                )}

                {/* Community Card */}
                <TouchableOpacity
                    style={styles.communityCard}
                    onPress={() => router.push("/(tabs)/community")}
                >
                    <Heart size={32} color="#059669" />
                    <View style={styles.communityContent}>
                        <Text style={styles.communityTitle}>Join the Community</Text>
                        <Text style={styles.communitySubtitle}>
                            Connect with others on a similar journey
                        </Text>
                    </View>
                    <ChevronRight size={24} color="#CBD5E1" />
                </TouchableOpacity>
            </ScrollView>

            {/* Language Modal */}
            <Modal
                visible={showLanguageModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLanguageModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Language</Text>
                        {LANGUAGES.map((lang) => (
                            <TouchableOpacity
                                key={lang.code}
                                style={[
                                    styles.languageOption,
                                    i18n.language === lang.code && styles.languageOptionActive
                                ]}
                                onPress={() => changeLanguage(lang.code)}
                            >
                                <Text style={[
                                    styles.languageOptionText,
                                    i18n.language === lang.code && styles.languageOptionTextActive
                                ]}>
                                    {lang.native} ({lang.label})
                                </Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => setShowLanguageModal(false)}
                        >
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
        backgroundColor: "#F9FAFB",
    },
    centered: {
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: "#FFFFFF",
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
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    languageButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    languageText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },
    profilePic: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
    },
    profileInitial: {
        fontSize: 18,
        fontWeight: "600",
        color: "#D97706",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 6,
    },
    cardSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 20,
    },
    moodGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    moodOption: {
        alignItems: "center",
        gap: 6,
    },
    moodEmoji: {
        fontSize: 36,
    },
    moodLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        marginBottom: 12,
    },
    streakText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#D97706",
    },
    viewButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        padding: 14,
        borderRadius: 12,
        gap: 10,
    },
    viewButtonText: {
        flex: 1,
        fontSize: 15,
        fontWeight: "500",
        color: "#1E293B",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    wellnessGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 20,
    },
    wellnessCard: {
        width: (SCREEN_WIDTH - 52) / 2,
        padding: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    wellnessValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1E293B",
        marginTop: 8,
    },
    wellnessLabel: {
        fontSize: 13,
        color: "#64748B",
        marginTop: 2,
        marginBottom: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: "rgba(0,0,0,0.1)",
        borderRadius: 2,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    notesCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 18,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    notesContent: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
        gap: 14,
    },
    notesText: {
        flex: 1,
    },
    notesTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    notesSubtitle: {
        fontSize: 13,
        color: "#6B7280",
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    viewAll: {
        fontSize: 14,
        fontWeight: "600",
        color: "#14B8A6",
    },
    doctorsScroll: {
        gap: 12,
    },
    doctorCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        width: 130,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    doctorImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 10,
        backgroundColor: "#F1F5F9",
    },
    doctorName: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 4,
        textAlign: "center",
    },
    doctorSpecialty: {
        fontSize: 12,
        color: "#64748B",
        textAlign: "center",
    },
    appointmentCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    appointmentInfo: {
        flex: 1,
    },
    appointmentDoctor: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 4,
    },
    appointmentTime: {
        fontSize: 13,
        color: "#64748B",
    },
    communityCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 18,
        borderRadius: 16,
        marginBottom: 20,
        gap: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    communityContent: {
        flex: 1,
    },
    communityTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    communitySubtitle: {
        fontSize: 13,
        color: "#6B7280",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        maxWidth: 300,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 16,
        textAlign: "center",
        color: "#1E293B",
    },
    languageOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    languageOptionActive: {
        backgroundColor: "#F0FDF4",
    },
    languageOptionText: {
        fontSize: 16,
        color: "#334155",
    },
    languageOptionTextActive: {
        fontWeight: "700",
        color: "#166534",
    },
    modalCancel: {
        marginTop: 8,
        padding: 12,
        alignItems: "center",
    },
    modalCancelText: {
        color: "#64748B",
        fontWeight: "600",
    },
});