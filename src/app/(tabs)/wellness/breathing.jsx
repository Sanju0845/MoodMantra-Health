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
import { ArrowLeft, Wind, Heart, Clock, Play, Square } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";

const { width } = Dimensions.get("window");

const GOALS = [
    { id: "Anger", icon: "zap", color: "#EF4444" },
    { id: "Anxiety", icon: "activity", color: "#F59E0B" },
    { id: "Stress", icon: "cloud", color: "#8B5CF6" },
    { id: "Sleep", icon: "moon", color: "#3B82F6" },
];

const DURATIONS = [1, 2, 3, 4, 5, 6];

export default function BreathingExercise() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { breathing, updateBreathing } = useWellness();
    
    // Derived state from context
    const sessionsToday = breathing.today;
    const history = breathing.history;
    
    const [selectedGoal, setSelectedGoal] = useState("Stress");
    const [selectedDuration, setSelectedDuration] = useState(3);
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState("inhale");
    const [counter, setCounter] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);

    const breathAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const petalAnims = useRef(
        Array.from({ length: 8 }, () => new Animated.Value(0))
    ).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
            x: new Animated.Value(0),
        }))
    ).current;

    const BREATHING_PATTERN = { inhale: 4, hold: 4, exhale: 4, rest: 2 };

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
        const duration = BREATHING_PATTERN[phase] * 1000;

        Animated.parallel([
            Animated.timing(breathAnim, {
                toValue: targetValue,
                duration: duration,
                useNativeDriver: true,
                easing: phase === "hold" || phase === "rest" ? undefined : undefined, 
            }),
            ...petalAnims.map((anim, i) => 
                Animated.timing(anim, {
                    toValue: targetValue,
                    duration: duration,
                    delay: i * 50,
                    useNativeDriver: true,
                })
            )
        ]).start();
    }, [phase]);

    const saveBreathingSession = async () => {
        const newSessions = sessionsToday + 1;
        updateBreathing(newSessions);

        if (newSessions >= 1) { // Celebrate even small wins
            triggerConfetti();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim) => {
            anim.y.setValue(0);
            anim.opacity.setValue(1);
            anim.x.setValue(0);
            
            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: 500,
                    duration: 2500 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: (Math.random() - 0.5) * 200,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ]).start();
        });
        setTimeout(() => setShowConfetti(false), 3500);
    };

    const toggleBreathing = () => {
        if (isActive) {
            setIsActive(false);
            saveBreathingSession();
            // Reset animation
            Animated.timing(breathAnim, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        } else {
            setIsActive(true);
            setPhase("inhale");
            setCounter(0);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const getPhaseText = () => {
        switch (phase) {
            case "inhale": return "Breathe In";
            case "hold": return "Hold";
            case "exhale": return "Breathe Out";
            case "rest": return "Relax";
            default: return "";
        }
    };

    const getPhaseInstruction = () => {
        switch (phase) {
            case "inhale": return "Fill your lungs slowly";
            case "hold": return "Keep the air in";
            case "exhale": return "Release slowly";
            case "rest": return "Prepare for next breath";
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
    const currentGoalColor = GOALS.find(g => g.id === selectedGoal)?.color || "#3B82F6";

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* Background Gradient */}
            <LinearGradient
                colors={isActive ? ["#1E1B4B", "#312E81", "#4338CA"] : ["#F0F9FF", "#E0F2FE", "#BAE6FD"]}
                style={StyleSheet.absoluteFill}
            />

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
                                    backgroundColor: ["#FFD700", "#FF69B4", "#00CED1", "#FFFFFF"][i % 4],
                                    transform: [
                                        { translateY: anim.y },
                                        { translateX: anim.x },
                                        { rotate: anim.y.interpolate({
                                            inputRange: [0, 500],
                                            outputRange: ['0deg', '360deg']
                                        })}
                                    ],
                                    opacity: anim.opacity,
                                },
                            ]}
                        />
                    ))}
                </View>
            )}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity 
                    onPress={() => router.back()} 
                    style={[styles.backButton, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                    <ArrowLeft size={24} color={isActive ? "#FFF" : "#1F2937"} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isActive && { color: "#FFF" }]}>Breathing</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                {/* Visualization Area */}
                <View style={[styles.visualizationContainer, { height: isActive ? 500 : 400 }]}>
                    <View style={styles.flowerWrapper}>
                        {/* Outer glow */}
                        <Animated.View
                            style={[
                                styles.glowCircle,
                                {
                                    backgroundColor: currentGoalColor,
                                    opacity: breathAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.1, 0.3],
                                    }),
                                    transform: [{
                                        scale: breathAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [1, 2],
                                        })
                                    }]
                                }
                            ]}
                        />
                        
                        {/* Petals */}
                        {petalAnims.map((anim, i) => {
                            const angle = (i * 360) / 8;
                            const scale = anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.8],
                            });
                            const moveY = anim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -40], // Move outward
                            });

                            return (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.petal,
                                        {
                                            backgroundColor: isActive ? currentGoalColor : "#93C5FD",
                                            transform: [
                                                { rotate: `${angle}deg` },
                                                { translateY: moveY },
                                                { scale },
                                            ],
                                            opacity: isActive ? 0.8 : 0.6,
                                        },
                                    ]}
                                />
                            );
                        })}

                        {/* Center Circle */}
                        <Animated.View
                            style={[
                                styles.centerCircle,
                                {
                                    backgroundColor: isActive ? "#FFF" : "#FFFFFF",
                                    transform: [
                                        {
                                            scale: breathAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [1, 1.5],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                             {!isActive && <Wind size={32} color={currentGoalColor} />}
                        </Animated.View>
                    </View>

                    {isActive ? (
                        <View style={styles.textContainer}>
                            <Text style={styles.phaseText}>{getPhaseText()}</Text>
                            <Text style={styles.instructionText}>{getPhaseInstruction()}</Text>
                            <Text style={styles.counterText}>
                                {Math.ceil(BREATHING_PATTERN[phase] - counter)}
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.textContainer}>
                            <Text style={styles.promptText}>Ready to relax?</Text>
                            <Text style={styles.subPromptText}>Select a goal and duration below</Text>
                        </View>
                    )}
                </View>

                {/* Controls - Only show when not active */}
                {!isActive && (
                    <Animated.View style={{ opacity: isActive ? 0 : 1 }}>
                        {/* Goal Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>I want to reduce</Text>
                            <View style={styles.goalGrid}>
                                {GOALS.map((goal) => (
                                    <TouchableOpacity
                                        key={goal.id}
                                        style={[
                                            styles.goalButton,
                                            selectedGoal === goal.id && { backgroundColor: goal.color, borderColor: goal.color },
                                        ]}
                                        onPress={() => {
                                            setSelectedGoal(goal.id);
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.goalButtonText,
                                                selectedGoal === goal.id && styles.goalButtonTextActive,
                                            ]}
                                        >
                                            {goal.id}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Duration Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionLabel}>Duration (minutes)</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.durationScroll}>
                                {DURATIONS.map((duration) => (
                                    <TouchableOpacity
                                        key={duration}
                                        style={[
                                            styles.durationButton,
                                            selectedDuration === duration && { backgroundColor: currentGoalColor },
                                        ]}
                                        onPress={() => {
                                            setSelectedDuration(duration);
                                            Haptics.selectionAsync();
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.durationButtonText,
                                                selectedDuration === duration && styles.durationButtonTextActive,
                                            ]}
                                        >
                                            {duration}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Stats */}
                        <View style={styles.statsContainer}>
                            <LinearGradient
                                colors={["#FFFFFF", "#F3F4F6"]}
                                style={styles.statCard}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                                    <Wind size={20} color="#4F46E5" />
                                </View>
                                <View>
                                    <Text style={styles.statValue}>{sessionsToday}</Text>
                                    <Text style={styles.statLabel}>Sessions Today</Text>
                                </View>
                            </LinearGradient>
                            <LinearGradient
                                colors={["#FFFFFF", "#F3F4F6"]}
                                style={styles.statCard}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                                    <Clock size={20} color="#059669" />
                                </View>
                                <View>
                                    <Text style={styles.statValue}>
                                        {history.length > 0
                                            ? Math.round(history.reduce((sum, d) => sum + d.sessions, 0) / history.length)
                                            : 0}
                                    </Text>
                                    <Text style={styles.statLabel}>Avg Sessions/Day</Text>
                                </View>
                            </LinearGradient>
                        </View>
                    </Animated.View>
                )}

                {/* Start/Stop Button */}
                <TouchableOpacity 
                    style={[
                        styles.startButton,
                        isActive && { marginBottom: 60 } // Add margin when active to push it up
                    ]} 
                    onPress={toggleBreathing}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={isActive ? ["#EF4444", "#DC2626"] : [currentGoalColor, shadeColor(currentGoalColor, -20)]}
                        style={styles.startButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        {isActive ? (
                            <Square size={24} color="#FFF" fill="#FFF" />
                        ) : (
                            <Play size={24} color="#FFF" fill="#FFF" />
                        )}
                        <Text style={styles.startButtonText}>
                            {isActive ? "End Session" : "Start Exercise"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Calendar - Only show when not active */}
                {!isActive && (
                    <View style={styles.calendarContainer}>
                        <Text style={styles.calendarTitle}>This Month's Progress</Text>
                        <View style={styles.calendarGrid}>
                            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                                <Text key={i} style={styles.calendarDayHeader}>{day}</Text>
                            ))}
                            {calendarDays.map((day, i) => (
                                <View key={i} style={styles.calendarDay}>
                                    {day && (
                                        <>
                                            <View style={[
                                                styles.dayCircle,
                                                day.completed && { backgroundColor: currentGoalColor }
                                            ]}>
                                                <Text style={[
                                                    styles.calendarDayText, 
                                                    day.completed && styles.calendarDayCompleted
                                                ]}>
                                                    {day.day}
                                                </Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

// Helper to darken/lighten color
function shadeColor(color, percent) {
    var R = parseInt(color.substring(1,3),16);
    var G = parseInt(color.substring(3,5),16);
    var B = parseInt(color.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    visualizationContainer: {
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 20,
    },
    flowerWrapper: {
        width: 300,
        height: 300,
        justifyContent: "center",
        alignItems: "center",
    },
    glowCircle: {
        position: "absolute",
        width: 200,
        height: 200,
        borderRadius: 100,
    },
    petal: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        opacity: 0.6,
    },
    centerCircle: {
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    textContainer: {
        alignItems: "center",
        marginTop: 40,
        height: 100,
    },
    phaseText: {
        fontSize: 32,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 8,
    },
    instructionText: {
        fontSize: 16,
        color: "rgba(255,255,255,0.8)",
        marginBottom: 16,
    },
    counterText: {
        fontSize: 48,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    promptText: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    subPromptText: {
        fontSize: 16,
        color: "#6B7280",
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4B5563",
        marginBottom: 12,
    },
    goalGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    goalButton: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    goalButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    goalButtonTextActive: {
        color: "#FFFFFF",
    },
    durationScroll: {
        gap: 12,
        paddingRight: 20,
    },
    durationButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    durationButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    durationButtonTextActive: {
        color: "#FFFFFF",
    },
    startButton: {
        marginHorizontal: 20,
        height: 60,
        borderRadius: 30,
        overflow: "hidden",
        marginBottom: 32,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    startButtonGradient: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    startButtonText: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },
    statsContainer: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    statLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: "700",
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
        color: "#9CA3AF",
        marginBottom: 12,
    },
    calendarDay: {
        width: "14.28%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    dayCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    calendarDayText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#4B5563",
    },
    calendarDayCompleted: {
        color: "#FFFFFF",
        fontWeight: "700",
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
});