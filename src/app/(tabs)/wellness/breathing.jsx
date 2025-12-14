import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Platform,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Play, Pause, RotateCcw, Check } from "lucide-react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import * as Haptics from "expo-haptics";

import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Breathing Patterns
const PATTERNS = [
    { id: "box", name: "Box", desc: "Calm anxiety", inhale: 4, hold1: 4, exhale: 4, hold2: 4, color: "#4A9B7F", emoji: "🧘" },
    { id: "478", name: "4-7-8", desc: "Sleep better", inhale: 4, hold1: 7, exhale: 8, hold2: 0, color: "#8B5CF6", emoji: "😴" },
    { id: "energy", name: "Energy", desc: "Wake up", inhale: 4, hold1: 0, exhale: 4, hold2: 0, color: "#F59E0B", emoji: "⚡" },
    { id: "calm", name: "Relax", desc: "De-stress", inhale: 5, hold1: 2, exhale: 7, hold2: 0, color: "#EC4899", emoji: "🌸" },
];

const PHASE = { IN: 0, HOLD1: 1, OUT: 2, HOLD2: 3 };
const PHASE_NAMES = ["Breathe In", "Hold", "Breathe Out", "Hold"];

export default function BreathingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [pattern, setPattern] = useState(PATTERNS[0]);
    const [running, setRunning] = useState(false);
    const [phase, setPhase] = useState(PHASE.IN);
    const [count, setCount] = useState(0);
    const [breaths, setBreaths] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [completed, setCompleted] = useState(false);

    const scale = useRef(new Animated.Value(0.6)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const progress = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);
    const sessionRef = useRef(null);

    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            clearInterval(sessionRef.current);
        };
    }, []);

    const haptic = () => {
        if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        }
    };

    const getDuration = (p) => {
        switch (p) {
            case PHASE.IN: return pattern.inhale;
            case PHASE.HOLD1: return pattern.hold1;
            case PHASE.OUT: return pattern.exhale;
            case PHASE.HOLD2: return pattern.hold2;
            default: return 0;
        }
    };

    const nextPhase = (current) => {
        if (current === PHASE.IN) return pattern.hold1 > 0 ? PHASE.HOLD1 : PHASE.OUT;
        if (current === PHASE.HOLD1) return PHASE.OUT;
        if (current === PHASE.OUT) return pattern.hold2 > 0 ? PHASE.HOLD2 : PHASE.IN;
        return PHASE.IN;
    };

    const animate = (p, dur) => {
        if (p === PHASE.IN) {
            Animated.parallel([
                Animated.timing(scale, { toValue: 1, duration: dur * 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 1, duration: dur * 1000, useNativeDriver: true }),
            ]).start();
        } else if (p === PHASE.OUT) {
            Animated.parallel([
                Animated.timing(scale, { toValue: 0.6, duration: dur * 1000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(glow, { toValue: 0, duration: dur * 1000, useNativeDriver: true }),
            ]).start();
        }
    };

    const start = () => {
        setRunning(true);
        setCompleted(false);
        setBreaths(0);
        setSeconds(0);
        setPhase(PHASE.IN);
        setCount(getDuration(PHASE.IN));
        animate(PHASE.IN, pattern.inhale);
        haptic();

        sessionRef.current = setInterval(() => setSeconds(s => s + 1), 1000);

        timerRef.current = setInterval(() => {
            setCount(prev => {
                if (prev <= 1) {
                    setPhase(curr => {
                        const next = nextPhase(curr);
                        if (next === PHASE.IN) setBreaths(b => b + 1);
                        haptic();
                        animate(next, getDuration(next));
                        setCount(getDuration(next));
                        return next;
                    });
                    return getDuration(nextPhase(phase));
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stop = async () => {
        setRunning(false);
        clearInterval(timerRef.current);
        clearInterval(sessionRef.current);

        if (breaths >= 3) {
            setCompleted(true);
            haptic();

            // Sync to Supabase
            try {
                const userId = await AsyncStorage.getItem("userId");
                if (userId) {
                    api.syncBreathing(userId, seconds);
                }
            } catch (e) { console.error("Sync error", e); }
        }
    };

    const reset = () => {
        stop();
        setPhase(PHASE.IN);
        setCount(0);
        setBreaths(0);
        setSeconds(0);
        setCompleted(false);
        scale.setValue(0.6);
        glow.setValue(0);
    };

    const formatTime = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

    const bottomPad = insets.bottom + 90;

    // Circle dimensions
    const CIRCLE_SIZE = Math.min(SCREEN_WIDTH - 80, 220);
    const INNER_SIZE = CIRCLE_SIZE - 40;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>Breathe</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                    <RotateCcw size={18} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <View style={[styles.content, { paddingBottom: bottomPad }]}>
                {/* Pattern Pills */}
                <View style={styles.pillsRow}>
                    {PATTERNS.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.pill, pattern.id === p.id && { backgroundColor: p.color, borderColor: p.color }]}
                            onPress={() => !running && setPattern(p)}
                            disabled={running}
                        >
                            <Text style={styles.pillEmoji}>{p.emoji}</Text>
                            <Text style={[styles.pillText, pattern.id === p.id && styles.pillTextActive]}>{p.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Pattern Info */}
                <View style={styles.patternInfo}>
                    <Text style={[styles.patternDesc, { color: pattern.color }]}>{pattern.desc}</Text>
                    <Text style={styles.patternTiming}>
                        Inhale {pattern.inhale}s • {pattern.hold1 > 0 ? `Hold ${pattern.hold1}s • ` : ""}
                        Exhale {pattern.exhale}s{pattern.hold2 > 0 ? ` • Hold ${pattern.hold2}s` : ""}
                    </Text>
                </View>

                {/* Breathing Circle */}
                <View style={styles.circleWrapper}>
                    {/* Outer glow */}
                    <Animated.View
                        style={[
                            styles.outerGlow,
                            {
                                width: CIRCLE_SIZE + 30,
                                height: CIRCLE_SIZE + 30,
                                borderRadius: (CIRCLE_SIZE + 30) / 2,
                                backgroundColor: pattern.color,
                                opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.25] }),
                                transform: [{ scale: scale.interpolate({ inputRange: [0.6, 1], outputRange: [0.8, 1.1] }) }],
                            },
                        ]}
                    />

                    {/* Main circle */}
                    <Animated.View
                        style={[
                            styles.mainCircle,
                            {
                                width: CIRCLE_SIZE,
                                height: CIRCLE_SIZE,
                                borderRadius: CIRCLE_SIZE / 2,
                                borderColor: pattern.color + "40",
                                transform: [{ scale }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[pattern.color, pattern.color + "CC"]}
                            style={[styles.innerCircle, { width: INNER_SIZE, height: INNER_SIZE, borderRadius: INNER_SIZE / 2 }]}
                        >
                            <Text style={styles.phaseLabel}>{running ? PHASE_NAMES[phase] : "Ready"}</Text>
                            <Text style={styles.countNumber}>{running ? count : pattern.inhale}</Text>
                            {!running && <Text style={styles.tapHint}>Tap Start</Text>}
                        </LinearGradient>
                    </Animated.View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: pattern.color }]}>{breaths}</Text>
                        <Text style={styles.statLabel}>Breaths</Text>
                    </View>
                    <View style={[styles.statBox, styles.statBorder]}>
                        <Text style={[styles.statNum, { color: pattern.color }]}>{formatTime(seconds)}</Text>
                        <Text style={styles.statLabel}>Duration</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statNum, { color: pattern.color }]}>{pattern.name}</Text>
                        <Text style={styles.statLabel}>Pattern</Text>
                    </View>
                </View>

                {/* Completion Message */}
                {completed && (
                    <View style={[styles.completedCard, { backgroundColor: pattern.color + "15" }]}>
                        <Check size={20} color={pattern.color} />
                        <Text style={[styles.completedText, { color: pattern.color }]}>
                            Great job! {breaths} breaths completed 🎉
                        </Text>
                    </View>
                )}

                {/* Control Button */}
                <TouchableOpacity
                    style={styles.controlBtn}
                    onPress={running ? stop : start}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={running ? ["#6B7280", "#4B5563"] : [pattern.color, pattern.color + "DD"]}
                        style={styles.controlGradient}
                    >
                        {running ? (
                            <Pause size={26} color="#FFF" fill="#FFF" />
                        ) : (
                            <Play size={26} color="#FFF" fill="#FFF" style={{ marginLeft: 4 }} />
                        )}
                        <Text style={styles.controlText}>{running ? "Pause" : "Start"}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAFAFA" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    resetBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    title: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },

    // Pills
    pillsRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 12 },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#FFF",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        gap: 4,
    },
    pillEmoji: { fontSize: 14 },
    pillText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
    pillTextActive: { color: "#FFF" },

    // Pattern Info
    patternInfo: { alignItems: "center", marginBottom: 16 },
    patternDesc: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
    patternTiming: { fontSize: 11, color: "#9CA3AF" },

    // Circle
    circleWrapper: { alignItems: "center", justifyContent: "center", height: 240, marginBottom: 16 },
    outerGlow: { position: "absolute" },
    mainCircle: {
        backgroundColor: "#FFF",
        borderWidth: 3,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    innerCircle: {
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    phaseLabel: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.85)", marginBottom: 2 },
    countNumber: { fontSize: 52, fontWeight: "800", color: "#FFF" },
    tapHint: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 },

    // Stats
    statsRow: {
        flexDirection: "row",
        backgroundColor: "#FFF",
        borderRadius: 16,
        paddingVertical: 14,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statBox: { flex: 1, alignItems: "center" },
    statBorder: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#F3F4F6" },
    statNum: { fontSize: 18, fontWeight: "700" },
    statLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },

    // Completed
    completedCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        marginBottom: 16,
    },
    completedText: { fontSize: 14, fontWeight: "600" },

    // Control
    controlBtn: { alignItems: "center" },
    controlGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    controlText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
});
