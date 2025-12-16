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
import { ArrowLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const GOALS = ["Anger", "Anxiety", "Stress", "Sleep"];
const DURATIONS = [1, 2, 3, 4, 5, 6];

export default function BreathingExercise() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedGoal, setSelectedGoal] = useState("Anger");
    const [selectedDuration, setSelectedDuration] = useState(3);
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState("inhale");
    const [counter, setCounter] = useState(0);
    const [sessionsToday, setSessionsToday] = useState(0);
    const [history, setHistory] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);

    const breathAnim = useRef(new Animated.Value(0)).current;
    const petalAnims = useRef(
        Array.from({ length: 8 }, () => new Animated.Value(0))
    ).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    const BREATHING_PATTERN = { inhale: 4, hold: 4, exhale: 4, rest: 4 };

    useEffect(() => {
        loadBreathingData();
    }, []);

    useEffect(() => {
        if (isActive) {
            const timer = setInterval(() => {
                setCounter((prev) => {
                    const newCount = prev + 1;
                    const phaseDuration = BREATHING_PATTERN[phase];

                    if (newCount >= phaseDuration) {
                        const phases = ["inhale", "hold", "exhale", "rest"];
                        const currentIndex = phases.indexOf(phase);
                        const nextPhase = phases[(currentIndex + 1) % phases.length];
                        setPhase(nextPhase);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        return 0;
                    }
                    return newCount;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isActive, phase]);

    useEffect(() => {
        const targetValue = phase === "inhale" ? 1 : phase === "exhale" ? 0 : breathAnim._value;

        Animated.timing(breathAnim, {
            toValue: targetValue,
            duration: BREATHING_PATTERN[phase] * 1000,
            useNativeDriver: true,
        }).start();

        petalAnims.forEach((anim, i) => {
            Animated.timing(anim, {
                toValue: targetValue,
                duration: BREATHING_PATTERN[phase] * 1000,
                delay: i * 50,
                useNativeDriver: true,
            }).start();
        });
    }, [phase]);

    const loadBreathingData = async () => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("breathingData");

            if (storedData) {
                const data = JSON.parse(storedData);
                const todayData = data.find(d => d.date === today);
                setSessionsToday(todayData?.sessions || 0);
                setHistory(data.slice(0, 30));
            }
        } catch (error) {
            console.error("Error loading breathing data:", error);
        }
    };

    const saveBreathingSession = async () => {
        try {
            const today = new Date().toDateString();
            const storedData = await AsyncStorage.getItem("breathingData");
            let data = storedData ? JSON.parse(storedData) : [];

            const todayIndex = data.findIndex(d => d.date === today);
            const newSessions = sessionsToday + 1;

            if (todayIndex >= 0) {
                data[todayIndex] = { date: today, sessions: newSessions, timestamp: new Date().toISOString() };
            } else {
                data.unshift({ date: today, sessions: newSessions, timestamp: new Date().toISOString() });
            }

            data = data.slice(0, 30);

            await AsyncStorage.setItem("breathingData", JSON.stringify(data));
            setSessionsToday(newSessions);
            setHistory(data.slice(0, 30));

            if (newSessions >= 3) {
                triggerConfetti();
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error("Error saving breathing data:", error);
        }
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

    const toggleBreathing = () => {
        if (isActive) {
            setIsActive(false);
            saveBreathingSession();
        } else {
            setIsActive(true);
            setPhase("inhale");
            setCounter(0);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const getPhaseText = () => {
        switch (phase) {
            case "inhale": return "Breathe in";
            case "hold": return "Hold";
            case "exhale": return "Breathe out";
            case "rest": return "Rest";
            default: return "";
        }
    };

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
                completed: dayData && dayData.sessions >= 1,
                sessions: dayData?.sessions || 0,
            });
        }
        return days;
    };

    const calendarDays = getCalendarDays();

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
                                    backgroundColor: ["#3B82F6", "#60A5FA", "#93C5FD"][i % 3],
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
                <Text style={styles.headerTitle}>Breathing</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            >
                {/* Breathing Flower Mandala */}
                <View style={styles.flowerContainer}>
                    <View style={styles.flowerWrapper}>
                        {petalAnims.map((anim, i) => {
                            const angle = (i * 360) / 8;
                            const scale = anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.85, 1.15],
                            });

                            return (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.petal,
                                        {
                                            transform: [
                                                { rotate: `${angle}deg` },
                                                { scale },
                                            ],
                                        },
                                    ]}
                                >
                                    <View style={styles.petalCircle} />
                                </Animated.View>
                            );
                        })}

                        <Animated.View
                            style={[
                                styles.centerCircle,
                                {
                                    transform: [
                                        {
                                            scale: breathAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 1.2],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        />
                    </View>

                    {!isActive && (
                        <View style={styles.flowerOverlay}>
                            <Text style={styles.flowerText}>Breathe to reduce</Text>
                        </View>
                    )}

                    {isActive && (
                        <View style={styles.flowerOverlay}>
                            <Text style={styles.phaseText}>{getPhaseText()}</Text>
                            <Text style={styles.counterText}>{BREATHING_PATTERN[phase] - counter}</Text>
                        </View>
                    )}
                </View>

                {/* Goal Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Breath to reduce</Text>
                    <View style={styles.goalGrid}>
                        {GOALS.map((goal) => (
                            <TouchableOpacity
                                key={goal}
                                style={[
                                    styles.goalButton,
                                    selectedGoal === goal && styles.goalButtonActive,
                                ]}
                                onPress={() => setSelectedGoal(goal)}
                            >
                                <Text
                                    style={[
                                        styles.goalButtonText,
                                        selectedGoal === goal && styles.goalButtonTextActive,
                                    ]}
                                >
                                    {goal}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Duration Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Time</Text>
                    <View style={styles.durationGrid}>
                        {DURATIONS.map((duration) => (
                            <TouchableOpacity
                                key={duration}
                                style={[
                                    styles.durationButton,
                                    selectedDuration === duration && styles.durationButtonActive,
                                ]}
                                onPress={() => setSelectedDuration(duration)}
                            >
                                <Text
                                    style={[
                                        styles.durationButtonText,
                                        selectedDuration === duration && styles.durationButtonTextActive,
                                    ]}
                                >
                                    {duration} min
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Start Button */}
                <TouchableOpacity style={styles.startButton} onPress={toggleBreathing}>
                    <LinearGradient
                        colors={["#3B82F6", "#2563EB"]}
                        style={styles.startButtonGradient}
                    >
                        <Text style={styles.startButtonText}>
                            {isActive ? "Stop breathing" : "Start breathing"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>{sessionsToday}</Text>
                        <Text style={styles.statLabel}>Sessions Today</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statValue}>
                            {history.length > 0
                                ? Math.round(history.reduce((sum, d) => sum + d.sessions, 0) / history.length)
                                : 0}
                        </Text>
                        <Text style={styles.statLabel}>Daily Average</Text>
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
    flowerContainer: {
        marginHorizontal: 20,
        marginTop: 32,
        marginBottom: 32,
        height: 280,
        justifyContent: "center",
        alignItems: "center",
    },
    flowerWrapper: {
        width: 280,
        height: 280,
        justifyContent: "center",
        alignItems: "center",
    },
    petal: {
        position: "absolute",
        width: 280,
        height: 280,
        justifyContent: "flex-start",
        alignItems: "center",
    },
    petalCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#BFDBFE",
        opacity: 0.6,
        marginTop: 20,
    },
    centerCircle: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#3B82F6",
        opacity: 0.8,
    },
    flowerOverlay: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    flowerText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    phaseText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 8,
    },
    counterText: {
        fontSize: 48,
        fontWeight: "700",
        color: "#3B82F6",
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 12,
    },
    goalGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    goalButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    goalButtonActive: {
        backgroundColor: "#3B82F6",
        borderColor: "#3B82F6",
    },
    goalButtonText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#6B7280",
    },
    goalButtonTextActive: {
        color: "#FFFFFF",
    },
    durationGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    durationButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
    },
    durationButtonActive: {
        backgroundColor: "#3B82F6",
    },
    durationButtonText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#6B7280",
    },
    durationButtonTextActive: {
        color: "#FFFFFF",
    },
    startButton: {
        marginHorizontal: 20,
        height: 56,
        borderRadius: 28,
        overflow: "hidden",
        marginBottom: 32,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    startButtonGradient: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    startButtonText: {
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
        fontSize: 32,
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
});
