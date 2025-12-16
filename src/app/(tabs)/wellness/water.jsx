import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Droplets, Plus, Minus } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const DAILY_GOAL = 2000; // 2000ml = 2L
const CUP_SIZE = 200; // 200ml per cup

export default function WaterTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [mlToday, setMlToday] = useState(0);
    const [history, setHistory] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);

    const fillAnim = useRef(new Animated.Value(0)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    useEffect(() => {
        loadWaterData();
        startWaveAnimation();
    }, []);

    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: mlToday,
            useNativeDriver: false,
            tension: 20,
            friction: 7,
        }).start();

        if (mlToday >= DAILY_GOAL && !showConfetti) {
            triggerConfetti();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [mlToday]);

    const startWaveAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(waveAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(waveAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

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

    const loadWaterData = async () => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("waterData");

            if (storedData) {
                const data = JSON.parse(storedData);
                const todayData = data.find(d => d.date === today);
                setMlToday(todayData?.ml || 0);
                setHistory(data.slice(0, 30));
            }
        } catch (error) {
            console.error("Error loading water data:", error);
        }
    };

    const saveWaterData = async (ml) => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("waterData");
            let data = storedData ? JSON.parse(storedData) : [];

            const todayIndex = data.findIndex(d => d.date === today);

            if (todayIndex >= 0) {
                data[todayIndex] = { date: today, ml, cups: Math.floor(ml / CUP_SIZE), timestamp: new Date().toISOString() };
            } else {
                data.unshift({ date: today, ml, cups: Math.floor(ml / CUP_SIZE), timestamp: new Date().toISOString() });
            }

            data = data.slice(0, 30);

            await AsyncStorage.setItem("waterData", JSON.stringify(data));
            setMlToday(ml);
            setHistory(data.slice(0, 30));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
            console.error("Error saving water data:", error);
        }
    };

    const addWater = (amount) => {
        const newAmount = Math.min(mlToday + amount, 5000);
        saveWaterData(newAmount);
    };

    const removeWater = (amount) => {
        const newAmount = Math.max(mlToday - amount, 0);
        saveWaterData(newAmount);
    };

    const progress = Math.min(mlToday / DAILY_GOAL, 1);
    const fillHeight = fillAnim.interpolate({
        inputRange: [0, DAILY_GOAL],
        outputRange: ["0%", "100%"],
    });

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
                completed: dayData && dayData.ml >= DAILY_GOAL,
                ml: dayData?.ml || 0,
            });
        }
        return days;
    };

    const calendarDays = getCalendarDays();
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

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
                                    backgroundColor: ["#3B82F6", "#60A5FA", "#2563EB", "#DBEAFE"][i % 4],
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
                <Text style={styles.headerTitle}>Water Tracker</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                {/* Time Card */}
                <View style={styles.timeCard}>
                    <View>
                        <Text style={styles.timeText}>{currentTime}</Text>
                        <Text style={styles.timeSubtext}>{mlToday}ml water</Text>
                    </View>
                    <TouchableOpacity style={styles.addNowButton} onPress={() => addWater(CUP_SIZE)}>
                        <Text style={styles.addNowText}>Add now</Text>
                    </TouchableOpacity>
                </View>

                {/* Water Bottle Visualization */}
                <View style={styles.bottleContainer}>
                    <View style={styles.bottleWrapper}>
                        {/* Bottle outline */}
                        <View style={styles.bottleOutline}>
                            <View style={styles.bottleNeck} />
                            <View style={styles.bottleBody}>
                                <Animated.View style={[styles.waterFill, { height: fillHeight }]}>
                                    <LinearGradient
                                        colors={["#60A5FA", "#3B82F6"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                                <View style={styles.bottleOverlay}>
                                    <Text style={styles.bottleText}>{mlToday}ml</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Progress Info */}
                    <View style={styles.progressInfo}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                        </View>
                        <View style={styles.progressStats}>
                            <View style={styles.progressStat}>
                                <Droplets size={16} color="#3B82F6" />
                                <Text style={styles.progressStatText}>{mlToday}ml</Text>
                            </View>
                            <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
                        </View>
                        <View style={styles.targetCard}>
                            <Text style={styles.targetLabel}>Target</Text>
                            <Text style={styles.targetValue}>{DAILY_GOAL}ml 💧</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddContainer}>
                    <TouchableOpacity style={styles.quickAddButton} onPress={() => removeWater(CUP_SIZE)}>
                        <Minus size={20} color="#EF4444" />
                        <Text style={styles.quickAddText}>-200ml</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.mainAddButton} onPress={() => addWater(CUP_SIZE)}>
                        <LinearGradient
                            colors={["#3B82F6", "#2563EB"]}
                            style={styles.mainAddGradient}
                        >
                            <Plus size={24} color="#FFFFFF" />
                            <Text style={styles.mainAddText}>Add 200ml</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickAddButton} onPress={() => addWater(CUP_SIZE)}>
                        <Plus size={20} color="#10B981" />
                        <Text style={styles.quickAddText}>+200ml</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{mlToday}ml</Text>
                        <Text style={styles.statLabel}>Today</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{Math.max(0, DAILY_GOAL - mlToday)}ml</Text>
                        <Text style={styles.statLabel}>Remaining</Text>
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

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💧 Hydration Tips</Text>
                    <Text style={styles.tipText}>• Drink water first thing in the morning</Text>
                    <Text style={styles.tipText}>• Keep a water bottle with you</Text>
                    <Text style={styles.tipText}>• Set reminders throughout the day</Text>
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
    timeCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        padding: 20,
        backgroundColor: "#DBEAFE",
        borderRadius: 20,
    },
    timeText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    timeSubtext: {
        fontSize: 14,
        color: "#6B7280",
    },
    addNowButton: {
        backgroundColor: "#1F2937",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    addNowText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "600",
    },
    bottleContainer: {
        marginHorizontal: 20,
        marginBottom: 32,
    },
    bottleWrapper: {
        alignItems: "center",
        marginBottom: 24,
    },
    bottleOutline: {
        alignItems: "center",
    },
    bottleNeck: {
        width: 40,
        height: 20,
        backgroundColor: "#E5E7EB",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    bottleBody: {
        width: 120,
        height: 200,
        backgroundColor: "#F3F4F6",
        borderRadius: 20,
        overflow: "hidden",
        position: "relative",
    },
    waterFill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    bottleOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    bottleText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    progressInfo: {
        gap: 12,
    },
    progressBar: {
        height: 8,
        backgroundColor: "#E5E7EB",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#F59E0B",
        borderRadius: 4,
    },
    progressStats: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    progressStat: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    progressStatText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    progressPercentage: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    targetCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    targetLabel: {
        fontSize: 14,
        color: "#6B7280",
    },
    targetValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    quickAddContainer: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    quickAddButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        paddingVertical: 14,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    quickAddText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    mainAddButton: {
        flex: 1.5,
        height: 56,
        borderRadius: 14,
        overflow: "hidden",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    mainAddGradient: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    mainAddText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    statsContainer: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "700",
        color: "#3B82F6",
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: "#6B7280",
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
        color: "#3B82F6",
        fontWeight: "600",
    },
    calendarDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#3B82F6",
    },
    tipsCard: {
        backgroundColor: "#EFF6FF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E40AF",
        marginBottom: 12,
    },
    tipText: {
        fontSize: 14,
        color: "#1E40AF",
        lineHeight: 22,
        marginBottom: 4,
    },
});
