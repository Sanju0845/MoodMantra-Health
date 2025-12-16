import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Moon, Sun, Plus, Minus, TrendingUp } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path } from "react-native-svg";

const SLEEP_GOAL = 8;
const SCREEN_WIDTH = Dimensions.get("window").width;

export default function SleepTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [hoursToday, setHoursToday] = useState(0);
    const [quality, setQuality] = useState(3);
    const [history, setHistory] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [selectedTab, setSelectedTab] = useState("journal");

    const dialAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    useEffect(() => {
        loadSleepData();
    }, []);

    useEffect(() => {
        Animated.spring(dialAnim, {
            toValue: hoursToday,
            useNativeDriver: true,
            tension: 20,
            friction: 7,
        }).start();

        if (hoursToday >= SLEEP_GOAL && quality >= 4 && !showConfetti) {
            triggerConfetti();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [hoursToday, quality]);

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim) => {
            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: 300,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]).start();
        });
        setTimeout(() => setShowConfetti(false), 3000);
    };

    const loadSleepData = async () => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("sleepData");

            if (storedData) {
                const data = JSON.parse(storedData);
                const todayData = data.find(d => d.date === today);
                setHoursToday(todayData?.hours || 0);
                setQuality(todayData?.quality || 3);
                setHistory(data.slice(0, 30));
            }
        } catch (error) {
            console.error("Error loading sleep data:", error);
        }
    };

    const saveSleepData = async (hours, sleepQuality) => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("sleepData");
            let data = storedData ? JSON.parse(storedData) : [];

            const todayIndex = data.findIndex(d => d.date === today);

            if (todayIndex >= 0) {
                data[todayIndex] = { date: today, hours, quality: sleepQuality, timestamp: new Date().toISOString() };
            } else {
                data.unshift({ date: today, hours, quality: sleepQuality, timestamp: new Date().toISOString() });
            }

            data = data.slice(0, 30);

            await AsyncStorage.setItem("sleepData", JSON.stringify(data));
            setHoursToday(hours);
            setQuality(sleepQuality);
            setHistory(data.slice(0, 30));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error("Error saving sleep data:", error);
        }
    };

    const adjustHours = (delta) => {
        const newHours = Math.max(0, Math.min(12, hoursToday + delta));
        saveSleepData(newHours, quality);
    };

    const progress = Math.min(hoursToday / SLEEP_GOAL, 1);
    const angle = progress * 270; // 270 degrees for 3/4 circle

    const getCalendarDays = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = new Date(year, month, day).toDateString();
            const dayData = history.find(h => h.date === dateStr);
            days.push({
                day,
                completed: dayData && dayData.hours >= SLEEP_GOAL,
                hours: dayData?.hours || 0,
            });
        }
        return days;
    };

    const calendarDays = getCalendarDays();
    const avgSleep = history.length > 0 ? (history.reduce((sum, d) => sum + d.hours, 0) / history.length).toFixed(1) : "0";

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Confetti */}
            {showConfetti && (
                <View style={styles.confettiContainer}>
                    {confettiAnims.map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.confetti,
                                {
                                    left: `${(i / confettiAnims.length) * 100}%`,
                                    backgroundColor: ["#4A9B7F", "#16A34A", "#14B8A6"][i % 3],
                                    transform: [{ translateY: anim.y }],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Sleep Tracker</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                {/* Today Card */}
                <View style={styles.todayCard}>
                    <View>
                        <Text style={styles.todayLabel}>Today</Text>
                        <Text style={styles.todayDate}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.emojiCircle}>
                        <Text style={styles.emoji}>😴</Text>
                    </View>
                </View>

                {/* Circular Dial */}
                <View style={styles.dialContainer}>
                    <Svg width={240} height={240} viewBox="0 0 240 240">
                        {/* Background circle */}
                        <Circle
                            cx="120"
                            cy="120"
                            r="100"
                            stroke="#E5E7EB"
                            strokeWidth="20"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="471"
                            strokeDashoffset="118"
                            transform="rotate(-225 120 120)"
                        />
                        {/* Progress circle */}
                        <Circle
                            cx="120"
                            cy="120"
                            r="100"
                            stroke="#3B82F6"
                            strokeWidth="20"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="471"
                            strokeDashoffset={471 - (angle / 360) * 471}
                            transform="rotate(-225 120 120)"
                        />
                    </Svg>

                    <View style={styles.dialCenter}>
                        <Text style={styles.dialHours}>{hoursToday.toFixed(1)}hr</Text>
                        <Text style={styles.dialLabel}>of {SLEEP_GOAL}hr</Text>
                    </View>

                    {/* +/- Buttons on dial */}
                    <TouchableOpacity
                        style={[styles.dialButton, styles.dialButtonLeft]}
                        onPress={() => adjustHours(-0.5)}
                    >
                        <Minus size={20} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.dialButton, styles.dialButtonRight]}
                        onPress={() => adjustHours(0.5)}
                    >
                        <Plus size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Log Sleep Button */}
                <TouchableOpacity style={styles.logButton}>
                    <LinearGradient
                        colors={["#3B82F6", "#2563EB"]}
                        style={styles.logButtonGradient}
                    >
                        <Text style={styles.logButtonText}>Log sleep</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Moon size={16} color="#4A9B7F" />
                        <Text style={styles.statValue}>{hoursToday.toFixed(1)}hr</Text>
                        <Text style={styles.statLabel}>Last night</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Sun size={16} color="#F59E0B" />
                        <Text style={styles.statValue}>{avgSleep}hr</Text>
                        <Text style={styles.statLabel}>Avg</Text>
                    </View>
                    <View style={styles.statBox}>
                        <TrendingUp size={16} color="#10B981" />
                        <Text style={styles.statValue}>{SLEEP_GOAL}hr</Text>
                        <Text style={styles.statLabel}>Goal</Text>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === "journal" && styles.tabActive]}
                        onPress={() => setSelectedTab("journal")}
                    >
                        <Text style={[styles.tabText, selectedTab === "journal" && styles.tabTextActive]}>
                            Journal
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === "statistics" && styles.tabActive]}
                        onPress={() => setSelectedTab("statistics")}
                    >
                        <Text style={[styles.tabText, selectedTab === "statistics" && styles.tabTextActive]}>
                            Statistics
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Sleep History Chart */}
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Last 7 days</Text>
                    <View style={styles.chart}>
                        {history.slice(0, 7).reverse().map((day, i) => {
                            const height = Math.min((day.hours / 12) * 100, 100);
                            return (
                                <View key={i} style={styles.chartBarContainer}>
                                    <View style={[styles.chartBar, { height: `${height}%` }]}>
                                        <LinearGradient
                                            colors={day.hours >= SLEEP_GOAL ? ["#4A9B7F", "#16A34A"] : ["#93C5FD", "#3B82F6"]}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                        {/* Fill empty days if less than 7 */}
                        {Array.from({ length: Math.max(0, 7 - history.length) }).map((_, i) => (
                            <View key={`empty-${i}`} style={styles.chartBarContainer}>
                                <View style={[styles.chartBar, { height: "10%", backgroundColor: "#E5E7EB" }]} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartLabels}>
                        {history.slice(0, 7).reverse().map((day, i) => {
                            const date = new Date(day.date);
                            return (
                                <Text key={i} style={styles.chartLabel}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                                </Text>
                            );
                        })}
                        {Array.from({ length: Math.max(0, 7 - history.length) }).map((_, i) => (
                            <Text key={`empty-label-${i}`} style={styles.chartLabel}>-</Text>
                        ))}
                    </View>
                    <View style={styles.chartValues}>
                        {history.slice(0, 7).reverse().map((day, i) => (
                            <Text key={i} style={styles.chartValue}>
                                {day.hours.toFixed(1)}h
                            </Text>
                        ))}
                        {Array.from({ length: Math.max(0, 7 - history.length) }).map((_, i) => (
                            <Text key={`empty-value-${i}`} style={styles.chartValue}>-</Text>
                        ))}
                    </View>
                </View>

                {/* Sleep Tips */}
                <View style={styles.tipsSection}>
                    <Text style={styles.tipsTitle}>Sleep tips</Text>
                    <View style={styles.tipCard}>
                        <View style={styles.tipIcon}>
                            <Text style={styles.tipEmoji}>☁️</Text>
                        </View>
                        <View style={styles.tipContent}>
                            <Text style={styles.tipHeading}>Create ideal environment</Text>
                            <Text style={styles.tipDescription}>
                                Keep your bedroom cool, dark, and quiet for better sleep quality
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Mini Calendar */}
                <View style={styles.calendarContainer}>
                    <Text style={styles.calendarTitle}>This Month</Text>
                    <View style={styles.calendarGrid}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                            <Text key={i} style={styles.calendarDayHeader}>{day}</Text>
                        ))}
                        {calendarDays.map((day, i) => (
                            <View key={i} style={styles.calendarDay}>
                                {day && (
                                    <>
                                        <Text style={[styles.calendarDayText, day.completed && styles.calendarDayCompleted]}>
                                            {day.day}
                                        </Text>
                                        {day.completed && (
                                            <View style={styles.calendarDot} />
                                        )}
                                    </>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    confettiContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "100%",
        zIndex: 1000,
        pointerEvents: "none",
    },
    confetti: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    todayCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        padding: 20,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    todayLabel: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    todayDate: {
        fontSize: 14,
        color: "#6B7280",
    },
    emojiCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
    },
    emoji: {
        fontSize: 24,
    },
    dialContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 32,
        position: "relative",
    },
    dialCenter: {
        position: "absolute",
        alignItems: "center",
    },
    dialHours: {
        fontSize: 48,
        fontWeight: "700",
        color: "#1F2937",
    },
    dialLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
    },
    dialButton: {
        position: "absolute",
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#3B82F6",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    dialButtonLeft: {
        left: 30,
    },
    dialButtonRight: {
        right: 30,
    },
    logButton: {
        marginHorizontal: 20,
        height: 56,
        borderRadius: 28,
        overflow: "hidden",
        marginBottom: 24,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    logButtonGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    logButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    statBox: {
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
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    tabsContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: "#F3F4F6",
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: "#FFFFFF",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#3B82F6",
    },
    chartContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
    },
    chart: {
        flexDirection: "row",
        height: 100,
        alignItems: "flex-end",
        gap: 4,
        marginBottom: 8,
    },
    chartBarContainer: {
        flex: 1,
        height: "100%",
        justifyContent: "flex-end",
    },
    chartBar: {
        backgroundColor: "#93C5FD",
        borderRadius: 4,
    },
    chartLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
    },
    chartLabel: {
        flex: 1,
        fontSize: 11,
        color: "#6B7280",
        textAlign: "center",
    },
    chartValues: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    chartValue: {
        flex: 1,
        fontSize: 10,
        color: "#3B82F6",
        fontWeight: "600",
        textAlign: "center",
    },
    tipsSection: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    tipCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    tipIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    tipEmoji: {
        fontSize: 24,
    },
    tipContent: {
        flex: 1,
    },
    tipHeading: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    tipDescription: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 18,
    },
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 16,
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    calendarDayHeader: {
        width: "14.28%",
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 8,
    },
    calendarDay: {
        width: "14.28%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    calendarDayText: {
        fontSize: 14,
        color: "#6B7280",
    },
    calendarDayCompleted: {
        color: "#4A9B7F",
        fontWeight: "600",
    },
    calendarDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#4A9B7F",
    },
});
