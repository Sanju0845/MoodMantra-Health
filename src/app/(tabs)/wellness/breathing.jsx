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
import { ArrowLeft, Wind, Play, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";

const { width, height } = Dimensions.get("window");

const EXERCISES = [
    { id: 1, name: "Calm Breathing", duration: 3, color: "#818CF8", emoji: "☮️", gradient: ["#818CF8", "#6366F1"] },
    { id: 2, name: "Deep Focus", duration: 5, color: "#A78BFA", emoji: "🎯", gradient: ["#A78BFA", "#8B5CF6"] },
    { id: 3, name: "Sleep Ready", duration: 7, color: "#FB7185", emoji: "🌙", gradient: ["#FB7185", "#F43F5E"] },
];

const DAILY_GOAL = 3; // 3 sessions per day

export default function BreathingExercise() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { breathing, updateBreathing } = useWellness();

    const [selectedExercise, setSelectedExercise] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState("inhale");
    const [counter, setCounter] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    const breathScale = useRef(new Animated.Value(1)).current;
    const bloomOpacity1 = useRef(new Animated.Value(0)).current;
    const bloomOpacity2 = useRef(new Animated.Value(0)).current;
    const bloomOpacity3 = useRef(new Animated.Value(0)).current;

    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    const BREATHING_PATTERN = { inhale: 4, hold: 2, exhale: 6, rest: 2 };

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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        return 0;
                    }
                    return newCount;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isActive, phase]);

    useEffect(() => {
        const duration = BREATHING_PATTERN[phase] * 1000;

        if (phase === "inhale") {
            Animated.parallel([
                Animated.timing(breathScale, {
                    toValue: 2.2,
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(bloomOpacity1, {
                        toValue: 0.6,
                        duration: duration / 3,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bloomOpacity2, {
                        toValue: 0.4,
                        duration: duration / 3,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bloomOpacity3, {
                        toValue: 0.2,
                        duration: duration / 3,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        } else if (phase === "exhale") {
            Animated.parallel([
                Animated.timing(breathScale, {
                    toValue: 1,
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.parallel([
                    Animated.timing(bloomOpacity1, {
                        toValue: 0,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bloomOpacity2, {
                        toValue: 0,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bloomOpacity3, {
                        toValue: 0,
                        duration: duration,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }
    }, [phase]);

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim) => {
            anim.y.setValue(0);
            anim.opacity.setValue(1);
            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: height,
                    duration: 3000 + Math.random() * 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 3000,
                    useNativeDriver: true,
                }),
            ]).start();
        });
        setTimeout(() => setShowConfetti(false), 5000);
    };

    const handleExerciseSelect = (exercise) => {
        setSelectedExercise(exercise);
        setIsActive(true);
        setPhase("inhale");
        setCounter(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleEnd = () => {
        setIsActive(false);
        setSelectedExercise(null);
        const newCount = breathing.today + 1;
        updateBreathing(newCount);

        // Trigger confetti if goal reached
        if (newCount >= DAILY_GOAL && !showConfetti) {
            triggerConfetti();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Animated.parallel([
            Animated.timing(breathScale, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(bloomOpacity1, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(bloomOpacity2, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(bloomOpacity3, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    };

    const getPhaseText = () => {
        switch (phase) {
            case "inhale": return "Breathe In";
            case "hold": return "Hold";
            case "exhale": return "Breathe Out";
            case "rest": return "Rest";
            default: return "";
        }
    };

    const progress = Math.min(breathing.today / DAILY_GOAL, 1);

    // Fullscreen breathing view
    if (isActive && selectedExercise) {
        return (
            <View style={styles.fullscreen}>
                <StatusBar style="dark" />

                <TouchableOpacity
                    style={[styles.exitBtn, { top: insets.top + 20 }]}
                    onPress={handleEnd}
                >
                    <X size={24} color="#1F2937" />
                </TouchableOpacity>

                <View style={styles.breathContainer}>
                    {/* Bloom layers */}
                    <Animated.View
                        style={[
                            styles.bloomCircle,
                            {
                                backgroundColor: selectedExercise.color,
                                opacity: bloomOpacity3,
                                transform: [{ scale: breathScale }],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.bloomCircle,
                            {
                                backgroundColor: selectedExercise.color,
                                opacity: bloomOpacity2,
                                transform: [{ scale: Animated.multiply(breathScale, 0.85) }],
                            },
                        ]}
                    />
                    <Animated.View
                        style={[
                            styles.bloomCircle,
                            {
                                backgroundColor: selectedExercise.color,
                                opacity: bloomOpacity1,
                                transform: [{ scale: Animated.multiply(breathScale, 0.7) }],
                            },
                        ]}
                    />

                    <View style={styles.centerContent}>
                        <Text style={styles.phaseText}>{getPhaseText()}</Text>
                        <Text style={styles.counterText}>
                            {Math.ceil(BREATHING_PATTERN[phase] - counter)}
                        </Text>
                    </View>
                </View>

                <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseNameFullscreen}>{selectedExercise.name}</Text>
                    <Text style={styles.exerciseDurationFullscreen}>{selectedExercise.duration} min session</Text>
                </View>
            </View>
        );
    }

    // Selection screen
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
                                    backgroundColor: ["#818CF8", "#A78BFA", "#FB7185", "#F472B6"][i % 4],
                                    transform: [{ translateY: anim.y }],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Breathing</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
            >
                {/* Progress Card */}
                <LinearGradient
                    colors={["#818CF8", "#6366F1"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.progressCard}
                >
                    <View>
                        <Text style={styles.progressTitle}>Daily Sessions</Text>
                        <Text style={styles.progressSubtitle}>{breathing.today}/{DAILY_GOAL} completed today</Text>
                    </View>
                    <View style={styles.percentageCircle}>
                        <Text style={styles.percentageText}>{Math.round(progress * 100)}%</Text>
                    </View>
                </LinearGradient>

                {/* Visual Progress */}
                <View style={styles.visualProgressCard}>
                    <View style={styles.dotsRow}>
                        {[1, 2, 3].map(session => (
                            <View
                                key={session}
                                style={[
                                    styles.sessionDot,
                                    breathing.today >= session && styles.sessionDotComplete
                                ]}
                            >
                                {breathing.today >= session && (
                                    <Wind size={16} color="#FFF" />
                                )}
                            </View>
                        ))}
                    </View>
                    <Text style={styles.goalText}>
                        {breathing.today >= DAILY_GOAL ? "🎉 Goal reached!" : `${DAILY_GOAL - breathing.today} more to go!`}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Choose Exercise</Text>

                {EXERCISES.map((exercise) => (
                    <TouchableOpacity
                        key={exercise.id}
                        style={styles.exerciseCard}
                        onPress={() => handleExerciseSelect(exercise)}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={exercise.gradient}
                            style={styles.exerciseGradient}
                        >
                            <View style={styles.exerciseIconBox}>
                                <Text style={styles.exerciseEmoji}>{exercise.emoji}</Text>
                            </View>
                            <View style={styles.exerciseDetails}>
                                <Text style={styles.exerciseName}>{exercise.name}</Text>
                                <Text style={styles.exerciseDuration}>{exercise.duration} minutes</Text>
                            </View>
                            <View style={styles.playButton}>
                                <Play size={20} color="#FFF" fill="#FFF" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💨 Breathing Tips</Text>
                    <Text style={styles.tipText}>• Find a quiet, comfortable space</Text>
                    <Text style={styles.tipText}>• Practice at the same time daily</Text>
                    <Text style={styles.tipText}>• Focus on slow, deep breaths</Text>
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
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    progressCard: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 24,
        borderRadius: 20,
        shadowColor: "#818CF8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFF",
        marginBottom: 4,
    },
    progressSubtitle: {
        fontSize: 14,
        color: "#E0E7FF",
        fontWeight: "500",
    },
    percentageCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.4)",
    },
    percentageText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
    visualProgressCard: {
        backgroundColor: "#FFF",
        marginHorizontal: 20,
        marginBottom: 24,
        padding: 24,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        alignItems: "center",
    },
    dotsRow: {
        flexDirection: "row",
        gap: 20,
        marginBottom: 16,
    },
    sessionDot: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#F3F4F6",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
    },
    sessionDotComplete: {
        backgroundColor: "#818CF8",
        borderColor: "#818CF8",
    },
    goalText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
        marginHorizontal: 20,
    },
    exerciseCard: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    exerciseGradient: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
    },
    exerciseIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    exerciseEmoji: {
        fontSize: 28,
    },
    exerciseDetails: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFF",
        marginBottom: 4,
    },
    exerciseDuration: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.8)",
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    tipsCard: {
        backgroundColor: "#EEF2FF",
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: "#C7D2FE",
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#4338CA",
        marginBottom: 12,
    },
    tipText: {
        fontSize: 14,
        color: "#4338CA",
        lineHeight: 24,
        marginBottom: 4,
        fontWeight: "500",
    },
    fullscreen: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
    },
    exitBtn: {
        position: "absolute",
        right: 20,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    breathContainer: {
        width: width,
        height: width,
        justifyContent: "center",
        alignItems: "center",
    },
    bloomCircle: {
        position: "absolute",
        width: 150,
        height: 150,
        borderRadius: 75,
    },
    centerContent: {
        alignItems: "center",
        zIndex: 5,
    },
    phaseText: {
        fontSize: 24,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    counterText: {
        fontSize: 80,
        fontWeight: "200",
        color: "#1F2937",
    },
    exerciseInfo: {
        alignItems: "center",
        marginTop: 40,
    },
    exerciseNameFullscreen: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    exerciseDurationFullscreen: {
        fontSize: 14,
        color: "#6B7280",
    },
});