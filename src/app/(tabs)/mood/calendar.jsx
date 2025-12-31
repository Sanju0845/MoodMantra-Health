import { useState, useEffect, useRef, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Animated,
    Dimensions,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus, Grid, Calendar } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Days of the week
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Mood colors based on mood labels (matching journal.jsx)
const MOOD_COLORS = {
    // Positive
    "Joyful": "#4A9B7F",
    "Happy": "#16A34A",
    "Calm": "#14B8A6",
    "Grateful": "#F59E0B",
    "Motivated": "#10B981",
    "Loved": "#EC4899",
    "Inspired": "#6366F1",
    // Negative
    "Sad": "#3B82F6",
    "Angry": "#EF4444",
    "Anxious": "#F59E0B",
    "Tired": "#94A3B8",
    "Overwhelmed": "#F97316",
    "Awful": "#A855F7",
    // Neutral
    "Neutral": "#64748B",
    "Confused": "#8B5CF6",
    "Bored": "#6B7280",
    "Okay": "#22C55E",
    // Complex
    "Nostalgic": "#EC4899",
    "Hopeful": "#10B981",
    "Guilty": "#F59E0B",
    "Ashamed": "#EF4444",
};

// Mood emojis (matching journal.jsx)
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

export default function MoodCalendarScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;

    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [moodEntries, setMoodEntries] = useState([]);
    const [entriesByDay, setEntriesByDay] = useState({});
    const [selectedDay, setSelectedDay] = useState(null);
    const [userId, setUserId] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [viewMode, setViewMode] = useState("month"); // "month" or "year"

    // Reset and reload when screen is focused
    useFocusEffect(
        useCallback(() => {
            // Reset slide animation
            slideAnim.setValue(SCREEN_WIDTH);
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                speed: 15,
                bounciness: 5,
            }).start();

            // Load data
            loadUserId();

            return () => {
                // Cleanup on blur
            };
        }, [])
    );

    useEffect(() => {
        if (userId) {
            loadMoodData();
        }
    }, [userId, currentDate]);

    const loadUserId = async () => {
        try {
            const id = await AsyncStorage.getItem("userId");
            if (id) {
                setUserId(id);
            } else {
                Alert.alert("Error", "Please login to view your mood calendar");
                router.back();
            }
        } catch (error) {
            console.error("Error loading userId:", error);
        }
    };

    const loadMoodData = async () => {
        setLoading(true);
        try {
            // Use SAME API as dashboard
            const weeklyMoodRes = await api.getWeeklyMoodAnalytics(userId);
            console.log("[Calendar] Weekly Mood API Response:", JSON.stringify(weeklyMoodRes, null, 2));

            // Extract mood entries (same as dashboard line 144)
            const entries = weeklyMoodRes?.moodEntries || [];
            setMoodEntries(entries);

            // Filter entries for current month and organize by day
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();

            const byDay = {};
            entries.forEach((entry) => {
                const entryDate = new Date(entry.date || entry.timestamp || entry.created_at || entry.createdAt);
                if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
                    const day = entryDate.getDate();
                    if (!byDay[day]) {
                        byDay[day] = [];
                    }
                    // Map 'mood' field to 'moodLabel' for consistency
                    byDay[day].push({
                        ...entry,
                        moodLabel: entry.mood || entry.moodLabel,
                    });
                }
            });
            setEntriesByDay(byDay);
            console.log("[Calendar] Entries for month:", Object.keys(byDay).length);
            console.log("[Calendar] Total entries:", entries.length);

        } catch (error) {
            console.log("[Calendar] Error loading mood data:", error.message);
            setMoodEntries([]);
            setEntriesByDay({});
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_WIDTH,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            router.back();
        });
    };

    const previousMonth = () => {
        setSelectedDay(null);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setSelectedDay(null);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getDaysInMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];

        // Empty cells removed for cleaner calendar layout

        // Add actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEntries = entriesByDay[day] || [];
            const firstEntry = dayEntries[0] || null;
            days.push({
                day,
                key: `day-${day}`,
                moodScore: firstEntry?.moodScore || null,
                moodLabel: firstEntry?.moodLabel || null,
                entry: firstEntry,
                entriesCount: dayEntries.length,
            });
        }

        return days;
    };

    const formatMonth = () => {
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    };

    const isToday = (day) => {
        if (!day) return false;
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    const getMoodEmoji = (entry) => {
        if (!entry) return null;
        const label = entry.moodLabel;
        return MOOD_EMOJIS[label] || "😊";
    };

    const getMoodColor = (entry) => {
        if (!entry) return null;
        const label = entry.moodLabel;
        return MOOD_COLORS[label] || "#9CA3AF";
    };

    const getTrendIcon = () => {
        const trend = analytics?.trend;
        if (trend === "improving") return <TrendingUp size={16} color="#22C55E" />;
        if (trend === "declining") return <TrendingDown size={16} color="#EF4444" />;
        return <Minus size={16} color="#6B7280" />;
    };

    const days = getDaysInMonth();
    const daysTracked = Object.keys(entriesByDay).length;
    const entriesCount = Object.values(entriesByDay).reduce((sum, arr) => sum + arr.length, 0);
    const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const trackingPercentage = Math.round((daysTracked / daysInCurrentMonth) * 100);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            <StatusBar style="light" />

            {/* Gradient Header */}
            <LinearGradient
                colors={["#4A9B7F", "#14B8A6"]}
                start={[0, 0]}
                end={[1, 1]}
                style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={goBack} style={styles.backButtonGradient}>
                        <ArrowLeft size={22} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitleGradient}>
                            Mood Tracker
                        </Text>
                        <Text style={styles.headerSubtitle}>
                            Track your emotional journey
                        </Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            {/* Sliding Tab Menu */}
            <View style={styles.tabMenuContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, viewMode === "month" && styles.tabButtonActive]}
                    onPress={() => setViewMode("month")}
                    activeOpacity={0.7}
                >
                    <Calendar size={18} color={viewMode === "month" ? "#FFFFFF" : "#4A9B7F"} />
                    <Text style={[styles.tabButtonText, viewMode === "month" && styles.tabButtonTextActive]}>
                        Calendar
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, viewMode === "year" && styles.tabButtonActive]}
                    onPress={() => setViewMode("year")}
                    activeOpacity={0.7}
                >
                    <Grid size={18} color={viewMode === "year" ? "#FFFFFF" : "#4A9B7F"} />
                    <Text style={[styles.tabButtonText, viewMode === "year" && styles.tabButtonTextActive]}>
                        Year in Pixels
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Month Navigation - outside gradient */}
            {viewMode === "month" && (
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
                        <ChevronLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.monthText}>{formatMonth()}</Text>
                    <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
                        <ChevronRight size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Year Navigation - outside gradient */}
            {viewMode === "year" && (
                <View style={styles.monthNav}>
                    <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1))} style={styles.navButton}>
                        <ChevronLeft size={24} color="#1F2937" />
                    </TouchableOpacity>
                    <Text style={styles.monthText}>{currentDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1))} style={styles.navButton}>
                        <ChevronRight size={24} color="#1F2937" />
                    </TouchableOpacity>
                </View>
            )}

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4A9B7F" />
                    <Text style={styles.loadingText}>Loading mood data...</Text>
                </View>
            ) : viewMode === "year" ? (
                /* Year in Pixels View */
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.yearPixelsContainer}>
                        {/* Generate 12 months */}
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((monthIndex) => {
                            const year = currentDate.getFullYear();
                            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                            const monthName = new Date(year, monthIndex, 1).toLocaleDateString('en', { month: 'short' });

                            return (
                                <View key={monthIndex} style={styles.pixelMonth}>
                                    <Text style={styles.pixelMonthLabel}>{monthName}</Text>
                                    <View style={styles.pixelGrid}>
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const day = i + 1;
                                            const entry = moodEntries.find(e => {
                                                const d = new Date(e.date || e.timestamp || e.createdAt);
                                                return d.getFullYear() === year && d.getMonth() === monthIndex && d.getDate() === day;
                                            });
                                            const moodLabel = entry?.mood || entry?.moodLabel;
                                            const color = moodLabel ? MOOD_COLORS[moodLabel] || "#E5E7EB" : "#F3F4F6";
                                            const isToday = new Date().getFullYear() === year &&
                                                new Date().getMonth() === monthIndex &&
                                                new Date().getDate() === day;
                                            return (
                                                <View
                                                    key={day}
                                                    style={[
                                                        styles.pixelDay,
                                                        { backgroundColor: color },
                                                        isToday && styles.pixelDayToday,
                                                    ]}
                                                />
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Legend */}
                    <View style={styles.legendContainer}>
                        <Text style={styles.legendTitle}>Mood Colors</Text>
                        <View style={styles.legendItems}>
                            {["Joyful", "Happy", "Calm", "Sad", "Anxious", "Tired"].map((mood) => (
                                <View key={mood} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: MOOD_COLORS[mood] }]} />
                                    <Text style={styles.legendLabel}>{MOOD_EMOJIS[mood]} {mood}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Year Stats */}
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsTitle}>Year Stats</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{moodEntries.length}</Text>
                                <Text style={styles.statLabel}>Total Entries</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>
                                    {moodEntries.length > 0
                                        ? (moodEntries.reduce((sum, e) => sum + (e.moodScore || 3), 0) / moodEntries.length).toFixed(1)
                                        : "-"
                                    }
                                </Text>
                                <Text style={styles.statLabel}>Avg Mood</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>
                                    {Math.round((new Set(moodEntries.map(e => {
                                        const d = new Date(e.timestamp || e.createdAt);
                                        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
                                    })).size / 365) * 100)}%
                                </Text>
                                <Text style={styles.statLabel}>Days Tracked</Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Calendar Grid */}
                    <View style={styles.calendarContainer}>
                        {/* Day Headers */}
                        <View style={styles.dayHeaders}>
                            {DAYS.map((day) => (
                                <Text key={day} style={styles.dayHeader}>{day}</Text>
                            ))}
                        </View>

                        {/* Calendar Days */}
                        <View style={styles.daysGrid}>
                            {days.map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[
                                        styles.dayCell,
                                        item.day && isToday(item.day) && styles.todayCell,
                                        selectedDay === item.day && styles.selectedCell,
                                    ]}
                                    onPress={() => item.day && setSelectedDay(item.day === selectedDay ? null : item.day)}
                                    disabled={!item.day}
                                >
                                    {item.day && (
                                        <>
                                            <Text style={[
                                                styles.dayNumber,
                                                isToday(item.day) && styles.todayNumber,
                                            ]}>
                                                {item.day}
                                            </Text>
                                            {item.moodLabel && (
                                                <View
                                                    style={[
                                                        styles.moodDot,
                                                        { backgroundColor: getMoodColor(item.entry) },
                                                    ]}
                                                />
                                            )}
                                        </>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Legend */}
                    <View style={styles.legendContainer}>
                        <Text style={styles.legendTitle}>Mood Color Guide</Text>
                        <Text style={styles.legendDescription}>Each colored dot represents your mood on that day. Tap any date to see detailed entries.</Text>
                        <View style={styles.legendItems}>
                            {["Joyful", "Happy", "Calm", "Sad", "Anxious", "Tired"].map((mood) => (
                                <View key={mood} style={styles.legendItem}>
                                    <View
                                        style={[styles.legendDot, { backgroundColor: MOOD_COLORS[mood] }]}
                                    />
                                    <Text style={styles.legendLabel}>{MOOD_EMOJIS[mood]} {mood}</Text>
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Selected Day Details - Show ALL entries */}
                    {selectedDay && entriesByDay[selectedDay]?.length > 0 && (
                        <View style={styles.detailsCard}>
                            <Text style={styles.detailsTitle}>
                                {new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                            </Text>
                            <Text style={styles.entriesCountBadge}>
                                {entriesByDay[selectedDay].length} {entriesByDay[selectedDay].length === 1 ? 'entry' : 'entries'}
                            </Text>

                            {entriesByDay[selectedDay].map((entry, index) => {
                                const entryTime = new Date(entry.timestamp || entry.createdAt);
                                return (
                                    <View key={entry._id || index} style={styles.entryItem}>
                                        <View style={styles.entryHeader}>
                                            <Text style={styles.entryEmoji}>
                                                {getMoodEmoji(entry)}
                                            </Text>
                                            <View style={styles.entryInfo}>
                                                <Text style={styles.entryMood}>
                                                    {entry.moodLabel || "Recorded"}
                                                </Text>
                                                <Text style={styles.entryTime}>
                                                    {entryTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                            <View style={[styles.entryScoreBadge, { backgroundColor: MOOD_COLORS[entry.moodLabel] || '#9CA3AF' }]}>
                                                <Text style={styles.entryScoreText}>{entry.moodLabel}</Text>
                                            </View>
                                        </View>
                                        {(entry.textFeedback || entry.notes) && (
                                            <Text style={styles.entryNotes} numberOfLines={2}>
                                                "{entry.textFeedback || entry.notes}"
                                            </Text>
                                        )}
                                        {entry.activities?.length > 0 && (
                                            <View style={styles.entryActivities}>
                                                {entry.activities.slice(0, 3).map((activity, i) => (
                                                    <View key={i} style={styles.activityTag}>
                                                        <Text style={styles.activityText}>{activity}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {/* Stats Summary */}
                    <View style={styles.statsContainer}>
                        <Text style={styles.statsTitle}>This Month</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{entriesCount}</Text>
                                <Text style={styles.statLabel}>Entries</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>
                                    {analytics?.basicStats?.averageScore?.toFixed(1) || "-"}
                                </Text>
                                <Text style={styles.statLabel}>Avg Mood</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{trackingPercentage}%</Text>
                                <Text style={styles.statLabel}>Tracked</Text>
                            </View>
                        </View>

                        {/* Trend indicator */}
                        {analytics?.trend && (
                            <View style={styles.trendContainer}>
                                {getTrendIcon()}
                                <Text style={styles.trendText}>
                                    Mood is {analytics.trend}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Empty state */}
                    {entriesCount === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyEmoji}>📅</Text>
                            <Text style={styles.emptyTitle}>No mood entries this month</Text>
                            <Text style={styles.emptyText}>
                                Start tracking your mood in the Journal tab to see your mood history here.
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => {
                                    goBack();
                                }}
                            >
                                <Text style={styles.emptyButtonText}>Log Your Mood</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    // New Gradient Header Styles
    headerGradient: {
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    backButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 12,
    },
    headerTitleGradient: {
        fontSize: 22,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        fontWeight: "500",
    },
    viewToggleGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    monthNavInHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginTop: 8,
    },
    navButtonGradient: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    monthTextGradient: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    // Tab Menu Styles
    tabMenuContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 16,
        borderRadius: 12,
        padding: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        gap: 8,
    },
    tabButtonActive: {
        backgroundColor: "#4A9B7F",
    },
    tabButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    tabButtonTextActive: {
        color: "#FFFFFF",
    },
    // Year in Pixels
    yearPixelsContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    pixelMonth: {
        marginBottom: 12,
    },
    pixelMonthLabel: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 6,
    },
    pixelGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 2,
    },
    pixelDay: {
        width: 8,
        height: 8,
        borderRadius: 2,
    },
    pixelDayToday: {
        borderWidth: 1,
        borderColor: "#1F2937",
    },
    monthNav: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: "transparent",
    },
    navButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    monthText: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: "#6B7280",
    },
    scrollView: {
        flex: 1,
    },
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    dayHeaders: {
        flexDirection: "row",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    dayHeader: {
        flex: 1,
        textAlign: "center",
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    daysGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 0.95,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 12,
        marginBottom: 2,
    },
    todayCell: {
        backgroundColor: "#E6F4F0",
    },
    selectedCell: {
        backgroundColor: "#E6F4F0",
        borderWidth: 1,
        borderColor: "#4A9B7F",
    },
    dayNumber: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    todayNumber: {
        color: "#4A9B7F",
        fontWeight: "800",
    },
    moodDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 4,
    },
    legendContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    legendTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    legendDescription: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
        marginBottom: 16,
    },
    legendItems: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    legendItem: {
        alignItems: "center",
        width: "30%",
    },
    legendDot: {
        width: 18,
        height: 18,
        borderRadius: 9,
        marginBottom: 6,
    },
    legendLabel: {
        fontSize: 10,
        color: "#6B7280",
        textAlign: "center",
    },
    detailsCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: "#4A9B7F",
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    detailsContent: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    detailsEmoji: {
        fontSize: 48,
        marginRight: 16,
    },
    detailsInfo: {
        flex: 1,
    },
    detailsMood: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        textTransform: "capitalize",
        marginBottom: 4,
    },
    detailsScore: {
        fontSize: 14,
        color: "#4A9B7F",
        fontWeight: "500",
        marginBottom: 8,
    },
    detailsNotes: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 8,
    },
    detailsActivities: {
        fontSize: 12,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    statsContainer: {
        backgroundColor: "#F9FAFB",
        marginHorizontal: 20,
        marginTop: 20,
        borderRadius: 20,
        padding: 20,
    },
    statsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    statValue: {
        fontSize: 28,
        fontWeight: "800",
        color: "#4A9B7F",
    },
    statLabel: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 6,
        fontWeight: "500",
    },
    trendContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        alignSelf: "center",
    },
    trendText: {
        fontSize: 13,
        color: "#6B7280",
        marginLeft: 6,
        textTransform: "capitalize",
    },
    emptyState: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 24,
        borderRadius: 20,
        padding: 32,
        alignItems: "center",
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 20,
        lineHeight: 20,
    },
    emptyButton: {
        backgroundColor: "#4A9B7F",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    // New entry item styles
    entriesCountBadge: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 16,
    },
    entryItem: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    entryHeader: {
        flexDirection: "row",
        alignItems: "center",
    },
    entryEmoji: {
        fontSize: 32,
        marginRight: 12,
    },
    entryInfo: {
        flex: 1,
    },
    entryMood: {
        fontSize: 15,
        fontWeight: "600",
        color: "#1F2937",
        textTransform: "capitalize",
    },
    entryTime: {
        fontSize: 12,
        color: "#6B7280",
        marginTop: 2,
    },
    entryScoreBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    entryScoreText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    entryNotes: {
        fontSize: 13,
        color: "#6B7280",
        fontStyle: "italic",
        marginTop: 10,
        lineHeight: 18,
    },
    entryActivities: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        marginTop: 10,
    },
    activityTag: {
        backgroundColor: "#E5E7EB",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    activityText: {
        fontSize: 11,
        color: "#4B5563",
        textTransform: "capitalize",
    },
});
