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
import { ArrowLeft, Moon, Sun, Plus, Minus, TrendingUp, Star } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from "react-native-svg";
import { useWellness } from "@/context/WellnessContext";

const SLEEP_GOAL = 8;
const SCREEN_WIDTH = Dimensions.get("window").width;

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function SleepTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { sleep, updateSleep } = useWellness();
    
    // Derived state from context
    const hoursToday = sleep.today;
    const history = sleep.history;
    const [quality, setQuality] = useState(3);
    
    const [showConfetti, setShowConfetti] = useState(false);
    const [selectedTab, setSelectedTab] = useState("journal");

    const dialAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Button animations
    const minusBtnScale = useRef(new Animated.Value(1)).current;
    const plusBtnScale = useRef(new Animated.Value(1)).current;
    const logBtnScale = useRef(new Animated.Value(1)).current;

    const animateButton = (scaleAnim) => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
        ]).start();
    };
    
    useEffect(() => {
        const todayStr = new Date().toDateString();
        const todayEntry = history.find(h => h.date === todayStr);
        if (todayEntry) {
            setQuality(todayEntry.quality || 3);
        }
    }, [history]); 

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
            anim.y.setValue(0);
            anim.opacity.setValue(1);
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

    const adjustHours = (delta) => {
        const newHours = Math.max(0, Math.min(12, hoursToday + delta));
        updateSleep(newHours, quality);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        <View style={styles.container}>
            <LinearGradient
                colors={["#0F172A", "#1E1B4B", "#312E81"]}
                style={[styles.background, { paddingTop: insets.top }]}
            >
                <StatusBar style="light" />

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
                                        backgroundColor: ["#FDE68A", "#FCD34D", "#FFFFFF"][i % 3],
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
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Sleep Tracker</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                >
                    {/* Today Card */}
                    <View style={styles.todayCard}>
                        <View>
                            <Text style={styles.todayLabel}>Today's Sleep</Text>
                            <Text style={styles.todayDate}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                        </View>
                        <View style={styles.emojiCircle}>
                            <Moon size={24} color="#818CF8" fill="#818CF8" />
                        </View>
                    </View>

                    {/* Circular Dial */}
                    <View style={styles.dialContainer}>
                        <Svg width={280} height={280} viewBox="0 0 240 240">
                            <Defs>
                                <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                                    <Stop offset="0" stopColor="#818CF8" stopOpacity="1" />
                                    <Stop offset="1" stopColor="#C7D2FE" stopOpacity="1" />
                                </SvgLinearGradient>
                            </Defs>
                            {/* Background circle */}
                            <Circle
                                cx="120"
                                cy="120"
                                r="100"
                                stroke="#312E81"
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
                                stroke="url(#grad)"
                                strokeWidth="20"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray="471"
                                strokeDashoffset={471 - (angle / 360) * 471}
                                transform="rotate(-225 120 120)"
                            />
                        </Svg>

                        <View style={styles.dialCenter}>
                            <Text style={styles.dialHours}>{hoursToday.toFixed(1)}</Text>
                            <Text style={styles.dialUnit}>hours</Text>
                            <Text style={styles.dialLabel}>Goal: {SLEEP_GOAL}h</Text>
                        </View>

                        {/* +/- Buttons on dial */}
                        <AnimatedTouchable
                            style={[styles.dialButton, styles.dialButtonLeft, { transform: [{ scale: minusBtnScale }] }]}
                            onPress={() => {
                                animateButton(minusBtnScale);
                                adjustHours(-0.5);
                            }}
                        >
                            <Minus size={24} color="#FFFFFF" />
                        </AnimatedTouchable>

                        <AnimatedTouchable
                            style={[styles.dialButton, styles.dialButtonRight, { transform: [{ scale: plusBtnScale }] }]}
                            onPress={() => {
                                animateButton(plusBtnScale);
                                adjustHours(0.5);
                            }}
                        >
                            <Plus size={24} color="#FFFFFF" />
                        </AnimatedTouchable>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={styles.statBox}>
                            <Moon size={20} color="#818CF8" />
                            <Text style={styles.statValue}>{hoursToday.toFixed(1)}h</Text>
                            <Text style={styles.statLabel}>Duration</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Star size={20} color="#FCD34D" />
                            <Text style={styles.statValue}>{quality}/5</Text>
                            <Text style={styles.statLabel}>Quality</Text>
                        </View>
                        <View style={styles.statBox}>
                            <TrendingUp size={20} color="#34D399" />
                            <Text style={styles.statValue}>{avgSleep}h</Text>
                            <Text style={styles.statLabel}>Avg</Text>
                        </View>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsContainer}>
                        <TouchableOpacity
                            style={[styles.tab, selectedTab === "journal" && styles.tabActive]}
                            onPress={() => setSelectedTab("journal")}
                        >
                            <Text style={[styles.tabText, selectedTab === "journal" && styles.tabTextActive]}>
                                History
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
                        <Text style={styles.chartTitle}>Last 7 Nights</Text>
                        <View style={styles.chart}>
                            {history.slice(0, 7).reverse().map((day, i) => {
                                const height = Math.min((day.hours / 12) * 100, 100);
                                return (
                                    <View key={i} style={styles.chartBarContainer}>
                                        <View style={[styles.chartBar, { height: `${height}%` }]}>
                                            <LinearGradient
                                                colors={day.hours >= SLEEP_GOAL ? ["#818CF8", "#6366F1"] : ["#4B5563", "#374151"]}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        </View>
                                    </View>
                                );
                            })}
                            {/* Fill empty days if less than 7 */}
                            {Array.from({ length: Math.max(0, 7 - history.length) }).map((_, i) => (
                                <View key={`empty-${i}`} style={styles.chartBarContainer}>
                                    <View style={[styles.chartBar, { height: "10%", backgroundColor: "#1F2937" }]} />
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
                    </View>

                    {/* Sleep Tips */}
                    <View style={styles.tipsSection}>
                        <Text style={styles.tipsTitle}>Sleep Better</Text>
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
                        <View style={[styles.tipCard, { marginTop: 12 }]}>
                            <View style={styles.tipIcon}>
                                <Text style={styles.tipEmoji}>📱</Text>
                            </View>
                            <View style={styles.tipContent}>
                                <Text style={styles.tipHeading}>Limit screen time</Text>
                                <Text style={styles.tipDescription}>
                                    Avoid screens at least 1 hour before bedtime to help melatonin production
                                </Text>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F172A",
    },
    background: {
        flex: 1,
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
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    todayCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 20,
        marginTop: 10,
        marginBottom: 30,
        padding: 24,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    todayLabel: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    todayDate: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    emojiCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(129, 140, 248, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(129, 140, 248, 0.3)",
    },
    dialContainer: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 40,
        position: "relative",
    },
    dialCenter: {
        position: "absolute",
        alignItems: "center",
    },
    dialHours: {
        fontSize: 56,
        fontWeight: "700",
        color: "#FFFFFF",
        lineHeight: 60,
    },
    dialUnit: {
        fontSize: 16,
        color: "#818CF8",
        fontWeight: "600",
        marginBottom: 4,
    },
    dialLabel: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    dialButton: {
        position: "absolute",
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#4F46E5",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    dialButtonLeft: {
        left: 20,
        bottom: 20,
    },
    dialButtonRight: {
        right: 20,
        bottom: 20,
    },
    statsGrid: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 32,
    },
    statBox: {
        flex: 1,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 20,
        padding: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        marginTop: 8,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: "#9CA3AF",
    },
    tabsContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 16,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: "center",
        borderRadius: 12,
    },
    tabActive: {
        backgroundColor: "rgba(255, 255, 255, 0.1)",
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#FFFFFF",
    },
    chartContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 20,
    },
    chart: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 150,
        marginBottom: 12,
    },
    chartBarContainer: {
        width: 30,
        height: "100%",
        justifyContent: "flex-end",
        backgroundColor: "rgba(255, 255, 255, 0.02)",
        borderRadius: 15,
        overflow: "hidden",
    },
    chartBar: {
        width: "100%",
        borderRadius: 15,
        overflow: "hidden",
    },
    chartLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    chartLabel: {
        width: 30,
        textAlign: "center",
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    tipsSection: {
        marginHorizontal: 20,
        marginBottom: 32,
    },
    tipsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 16,
    },
    tipCard: {
        flexDirection: "row",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRadius: 20,
        padding: 16,
        gap: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    tipIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(129, 140, 248, 0.1)",
        justifyContent: "center",
        alignItems: "center",
    },
    tipEmoji: {
        fontSize: 24,
    },
    tipContent: {
        flex: 1,
    },
    tipHeading: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    tipDescription: {
        fontSize: 13,
        color: "#9CA3AF",
        lineHeight: 20,
    },
});
