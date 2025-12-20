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
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop, G, Text as SvgText } from "react-native-svg";
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
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true })
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
            tension: 25,
            friction: 8,
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
                                    backgroundColor: ["#818CF8", "#C7D2FE", "#A5B4FC"][i % 3],
                                    transform: [{ translateY: anim.y }],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1F2937" />
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
                    <LinearGradient
                        colors={["#818CF8", "#6366F1"]}
                        style={styles.emojiCircle}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Moon size={24} color="#FFFFFF" fill="#FFFFFF" />
                    </LinearGradient>
                </View>

                {/* Circular Dial */}
                <View style={styles.dialContainer}>
                    <Svg width={280} height={280} viewBox="0 0 240 240">
                        <Defs>
                            <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                                <Stop offset="0" stopColor="#818CF8" stopOpacity="1" />
                                <Stop offset="1" stopColor="#6366F1" stopOpacity="1" />
                            </SvgLinearGradient>
                        </Defs>
                        {/* Background circle */}
                        <Circle
                            cx="120"
                            cy="120"
                            r="100"
                            stroke="#E0E7FF"
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
                        <LinearGradient
                            colors={["#6366F1", "#4F46E5"]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Minus size={24} color="#FFFFFF" />
                    </AnimatedTouchable>

                    <AnimatedTouchable
                        style={[styles.dialButton, styles.dialButtonRight, { transform: [{ scale: plusBtnScale }] }]}
                        onPress={() => {
                            animateButton(plusBtnScale);
                            adjustHours(0.5);
                        }}
                    >
                        <LinearGradient
                            colors={["#6366F1", "#4F46E5"]}
                            style={StyleSheet.absoluteFill}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                        <Plus size={24} color="#FFFFFF" />
                    </AnimatedTouchable>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <View style={styles.statIconContainer}>
                            <Moon size={20} color="#6366F1" />
                        </View>
                        <Text style={styles.statValue}>{hoursToday.toFixed(1)}h</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconContainer, { backgroundColor: "#FEF3C7" }]}>
                            <Star size={20} color="#F59E0B" />
                        </View>
                        <Text style={styles.statValue}>{quality}/5</Text>
                        <Text style={styles.statLabel}>Quality</Text>
                    </View>
                    <View style={styles.statBox}>
                        <View style={[styles.statIconContainer, { backgroundColor: "#D1FAE5" }]}>
                            <TrendingUp size={20} color="#10B981" />
                        </View>
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

                {/* Sleep Trends Line Chart */}
                <View style={styles.trendsContainer}>
                    <View style={styles.trendsHeader}>
                        <TrendingUp size={20} color="#6366F1" />
                        <Text style={styles.trendsTitle}>Sleep Trends</Text>
                    </View>
                    <View style={styles.lineChartContainer}>
                        <Svg width={SCREEN_WIDTH - 80} height={120} viewBox="0 0 300 120">
                            <Defs>
                                <SvgLinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor="#818CF8" stopOpacity="0.3" />
                                    <Stop offset="1" stopColor="#818CF8" stopOpacity="0" />
                                </SvgLinearGradient>
                            </Defs>
                            {(() => {
                                const data = history.slice(0, 7).reverse();
                                if (data.length === 0) return null;

                                const maxValue = 12;
                                const width = 300;
                                const height = 100;
                                const padding = 10;
                                const stepX = (width - padding * 2) / Math.max(data.length - 1, 1);

                                // Generate points
                                const points = data.map((day, i) => {
                                    const x = padding + i * stepX;
                                    const normalizedValue = Math.min(day.hours / maxValue, 1);
                                    const y = height - (normalizedValue * (height - 20)) - 10;
                                    return { x, y, value: day.hours };
                                });

                                // Create smooth curve path using quadratic bezier
                                let pathData = `M ${points[0].x} ${points[0].y}`;
                                for (let i = 0; i < points.length - 1; i++) {
                                    const current = points[i];
                                    const next = points[i + 1];
                                    const controlX = (current.x + next.x) / 2;
                                    pathData += ` Q ${controlX} ${current.y}, ${next.x} ${next.y}`;
                                }

                                // Create area fill path
                                const areaPath = `${pathData} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

                                return (
                                    <G>
                                        {/* Area fill */}
                                        <Path
                                            d={areaPath}
                                            fill="url(#lineGrad)"
                                        />
                                        {/* Line */}
                                        <Path
                                            d={pathData}
                                            stroke="#6366F1"
                                            strokeWidth="3"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        {/* Dots */}
                                        {points.map((point, i) => (
                                            <Circle
                                                key={i}
                                                cx={point.x}
                                                cy={point.y}
                                                r="4"
                                                fill="#FFFFFF"
                                                stroke="#6366F1"
                                                strokeWidth="2"
                                            />
                                        ))}
                                    </G>
                                );
                            })()}
                        </Svg>
                        {/* Day labels */}
                        <View style={styles.lineChartLabels}>
                            {history.slice(0, 7).reverse().map((day, i) => {
                                const date = new Date(day.date);
                                return (
                                    <Text key={i} style={styles.lineChartLabel}>
                                        {date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                                    </Text>
                                );
                            })}
                            {Array.from({ length: Math.max(0, 7 - history.length) }).map((_, i) => (
                                <Text key={`empty-${i}`} style={styles.lineChartLabel}>-</Text>
                            ))}
                        </View>
                    </View>
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
                                            colors={day.hours >= SLEEP_GOAL ? ["#818CF8", "#6366F1"] : ["#D1D5DB", "#9CA3AF"]}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 0, y: 1 }}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
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
        paddingBottom: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
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
        marginBottom: 30,
        padding: 24,
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
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
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
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
        color: "#1F2937",
        lineHeight: 60,
    },
    dialUnit: {
        fontSize: 16,
        color: "#6366F1",
        fontWeight: "600",
        marginBottom: 4,
    },
    dialLabel: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    dialButton: {
        position: "absolute",
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
        overflow: "hidden",
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
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 4,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    tabsContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        marginBottom: 24,
        backgroundColor: "#F1F5F9",
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
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    tabText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    tabTextActive: {
        color: "#6366F1",
    },
    chartContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
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
        backgroundColor: "#F9FAFB",
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
        color: "#1F2937",
        marginBottom: 16,
    },
    tipCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 16,
        gap: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    tipIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EEF2FF",
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
        color: "#1F2937",
        marginBottom: 4,
    },
    tipDescription: {
        fontSize: 13,
        color: "#6B7280",
        lineHeight: 20,
    },
    trendsContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    trendsHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 20,
    },
    trendsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    lineChartContainer: {
        alignItems: "center",
    },
    lineChartLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: SCREEN_WIDTH - 80,
        marginTop: 8,
        paddingHorizontal: 10,
    },
    lineChartLabel: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "500",
    },
});
