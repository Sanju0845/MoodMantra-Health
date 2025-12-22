import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Wind, Play, X, Heart, Brain, Moon, Zap, CloudRain, Sunset } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from '@/utils/supabaseClient';

const { width, height } = Dimensions.get("window");

const EXERCISES = [
    {
        id: 1,
        name: "Calm Breathing",
        color: "#818CF8",
        icon: "Wind",
        emoji: "🌬️",
        gradient: ["#818CF8", "#6366F1"],
        description: "Box breathing for calmness",
        instruction: "Equal inhale-hold-exhale-hold pattern to reduce stress and promote relaxation",
        pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
        animationSpeed: 1.0
    },
    {
        id: 2,
        name: "Deep Focus",
        color: "#A78BFA",
        icon: "Brain",
        emoji: "🧠",
        gradient: ["#A78BFA", "#8B5CF6"],
        description: "Enhance concentration",
        instruction: "Balanced breathing to sharpen mental clarity and boost focus",
        pattern: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
        animationSpeed: 1.2
    },
    {
        id: 3,
        name: "Sleep Ready",
        color: "#FB7185",
        icon: "Moon",
        emoji: "🌙",
        gradient: ["#FB7185", "#F43F5E"],
        description: "4-7-8 relaxation technique",
        instruction: "Extended exhale activates relaxation response, perfect for bedtime",
        pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
        animationSpeed: 0.7
    },
    {
        id: 4,
        name: "Energy Boost",
        color: "#34D399",
        icon: "Zap",
        emoji: "⚡",
        gradient: ["#34D399", "#10B981"],
        description: "Quick energizing breath",
        instruction: "Rapid breathing to increase alertness and invigorate your body",
        pattern: { inhale: 2, hold1: 1, exhale: 2, hold2: 1 },
        animationSpeed: 1.8
    },
    {
        id: 5,
        name: "Stress Relief",
        color: "#60A5FA",
        icon: "Heart",
        emoji: "💙",
        gradient: ["#60A5FA", "#3B82F6"],
        description: "Deep calming breaths",
        instruction: "Slow, deep breathing to lower heart rate and melt away tension",
        pattern: { inhale: 6, hold1: 2, exhale: 6, hold2: 2 },
        animationSpeed: 0.8
    },
    {
        id: 6,
        name: "Evening Wind Down",
        color: "#F59E0B",
        icon: "Sunset",
        emoji: "🌅",
        gradient: ["#F59E0B", "#D97706"],
        description: "Gentle evening relaxation",
        instruction: "Slow, rhythmic breathing to transition from day to restful evening",
        pattern: { inhale: 5, hold1: 3, exhale: 7, hold2: 0 },
        animationSpeed: 0.6
    },
];

const DAILY_GOAL = 3; // 3 sessions per day

// Helper function to get icon component
const getIcon = (iconName, props) => {
    const icons = { Wind, Brain, Moon, Zap, Heart, Sunset };
    const IconComponent = icons[iconName];
    return IconComponent ? <IconComponent {...props} /> : <Wind {...props} />;
};

export default function BreathingExercise() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { breathing, updateBreathing } = useWellness();

    const [selectedExercise, setSelectedExercise] = useState(null);
    const [isActive, setIsActive] = useState(false);
    const [phase, setPhase] = useState("inhale");
    const [counter, setCounter] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [sessionStartTime, setSessionStartTime] = useState(null);
    const [sessionDuration, setSessionDuration] = useState(0);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [breathingSessions, setBreathingSessions] = useState([]);
    const [userId, setUserId] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const breathScale = useRef(new Animated.Value(1)).current;
    const bloomOpacity1 = useRef(new Animated.Value(0)).current;
    const bloomOpacity2 = useRef(new Animated.Value(0)).current;
    const bloomOpacity3 = useRef(new Animated.Value(0)).current;

    const confettiAnims = useRef(
        Array.from({ length: 80 }, () => ({
            y: new Animated.Value(0),
            x: new Animated.Value(Math.random() * width),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Get breathing pattern from selected exercise
    const getBreathingPattern = () => {
        if (!selectedExercise) return { inhale: 4, hold1: 0, exhale: 4, hold2: 0 };
        return selectedExercise.pattern;
    };

    const BREATHING_PATTERN = getBreathingPattern();

    // Helper to get local date string (not UTC)
    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper function to show toast
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3000);
    };

    // Fetch user sessions on mount
    useEffect(() => {
        const fetchSessions = async () => {
            try {
                console.log('[Breathing] Fetching sessions on mount...');
                const userDataStr = await AsyncStorage.getItem("userData");
                console.log('[Breathing] UserData for fetch:', userDataStr);

                const user = userDataStr ? JSON.parse(userDataStr) : null;

                // Try to get user ID from different possible fields
                const userId = user?.userId || user?._id || user?.id || user?.mongo_id;
                console.log('[Breathing] UserId for fetch:', userId);

                if (userId) {
                    setUserId(userId);

                    const { data, error } = await supabase
                        .from('breathing_sessions')
                        .select('*')
                        .eq('user_id', userId)
                        .order('session_date', { ascending: false });

                    if (error) {
                        console.error('[Breathing] Error fetching sessions:', error);
                    } else {
                        console.log('[Breathing] Fetched sessions count:', data?.length);
                        console.log('[Breathing] Today local date:', getLocalDateString());
                        console.log('[Breathing] Sample session dates:', data?.slice(0, 3).map(s => s.session_date));
                        if (data) {
                            setBreathingSessions(data);
                        }
                    }
                } else {
                    console.log('[Breathing] No user ID found, cannot fetch sessions');
                }
            } catch (err) {
                console.error('[Breathing] Fetch error:', err);
            }
        };

        fetchSessions();
    }, []);

    // Session duration tracker
    useEffect(() => {
        let interval;
        if (sessionStartTime) {
            interval = setInterval(() => {
                setSessionDuration(Math.floor((Date.now() - sessionStartTime) / 1000));
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, sessionStartTime]);



    // Track elapsed time during session
    useEffect(() => {
        let interval;
        if (isActive && sessionStartTime) {
            interval = setInterval(() => {
                const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
                setSessionDuration(elapsed);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, sessionStartTime]);

    useEffect(() => {
        if (isActive) {
            const timer = setInterval(() => {
                setCounter((prev) => {
                    const newCount = prev + 1;
                    const phaseDuration = BREATHING_PATTERN[phase];

                    if (newCount >= phaseDuration) {
                        // Cycle through phases, skipping those with 0 duration
                        const phases = ["inhale", "hold1", "exhale", "hold2"];
                        let currentIndex = phases.indexOf(phase);
                        let nextPhase;

                        // Find next phase with duration > 0
                        do {
                            currentIndex = (currentIndex + 1) % phases.length;
                            nextPhase = phases[currentIndex];
                        } while (BREATHING_PATTERN[nextPhase] === 0 && phases.filter(p => BREATHING_PATTERN[p] > 0).length > 1);

                        setPhase(nextPhase);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        return 0;
                    }
                    return newCount;
                });
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [isActive, phase, selectedExercise]);

    useEffect(() => {
        const baseDuration = BREATHING_PATTERN[phase] * 1000;
        const animSpeed = selectedExercise?.animationSpeed || 1.0;
        const duration = baseDuration / animSpeed;

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
    }, [phase, selectedExercise]);

    const triggerConfetti = () => {
        setShowConfetti(true);
        const targetY = height * 0.75;

        confettiAnims.forEach((anim) => {
            const randomX = Math.random() * width;
            anim.y.setValue(0);
            anim.x.setValue(randomX);
            anim.rotate.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: targetY,
                    duration: 3500 + Math.random() * 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: Math.random() > 0.5 ? 720 : -720,
                    duration: 4000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(2000),
                    Animated.timing(anim.opacity, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        });
        setTimeout(() => setShowConfetti(false), 6000);
    };

    const saveSession = async () => {
        const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
        setSessionDuration(duration);

        // Save session to Supabase
        if (selectedExercise && duration > 0) {
            try {
                console.log('[Breathing] Starting session save...', {
                    exercise: selectedExercise.name,
                    duration
                });

                const token = await AsyncStorage.getItem("token");
                const userDataStr = await AsyncStorage.getItem("userData");
                console.log('[Breathing] Token exists:', !!token);
                console.log('[Breathing] UserData string:', userDataStr);

                const user = userDataStr ? JSON.parse(userDataStr) : null;
                console.log('[Breathing] Parsed user:', user);

                // Try to get user ID from different possible fields
                const userId = user?.userId || user?._id || user?.id || user?.mongo_id;
                console.log('[Breathing] Extracted userId:', userId);

                if (userId) {
                    const sessionData = {
                        user_id: userId,
                        exercise_type: selectedExercise.id.toString(),
                        exercise_name: selectedExercise.name,
                        exercise_emoji: selectedExercise.emoji,
                        duration_seconds: duration,
                        session_date: getLocalDateString(),
                        created_at: new Date().toISOString()
                    };

                    console.log('[Breathing] Attempting to insert session:', sessionData);

                    const { data, error } = await supabase
                        .from('breathing_sessions')
                        .insert(sessionData)
                        .select();

                    if (error) {
                        console.error('[Breathing] Supabase error:', error);
                        showToast(`Failed to save: ${error.message}`, 'error');
                    } else {
                        console.log('[Breathing] Session saved successfully:', data);
                        showToast('Session saved! ✓', 'success');

                        // Refresh sessions to update calendar immediately
                        const { data: updatedSessions, error: fetchError } = await supabase
                            .from('breathing_sessions')
                            .select('*')
                            .eq('user_id', userId)
                            .order('session_date', { ascending: false });

                        if (fetchError) {
                            console.error('[Breathing] Error fetching updated sessions:', fetchError);
                        } else {
                            console.log('[Breathing] Fetched sessions:', updatedSessions?.length);
                            if (updatedSessions) {
                                setBreathingSessions(updatedSessions);
                            }
                        }
                    }
                } else {
                    console.error('[Breathing] No user ID found in user data');
                    showToast('Please log in again to save sessions', 'error');
                }
            } catch (err) {
                console.error('[Breathing] Save error:', err);
                showToast(`Save error: ${err.message}`, 'error');
            }
        } else {
            console.log('[Breathing] Session not saved - no exercise or duration too short', {
                hasExercise: !!selectedExercise,
                duration
            });
        }

        setSelectedExercise(null);

        // Check if goal reached with real session count
        const today = getLocalDateString();
        const todaySessions = breathingSessions.filter(s => s.session_date === today).length;

        if (todaySessions >= DAILY_GOAL && !showConfetti) {
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

    const handleExerciseSelect = (exercise) => {
        setSelectedExercise(exercise);
        setIsActive(true);
        setPhase("inhale");
        setCounter(0);
        setSessionStartTime(Date.now());
        setSessionDuration(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleEnd = async () => {
        setIsActive(false);
        await saveSession();
        setPhase("inhale");
        setCounter(0);
    };

    const getPhaseText = () => {
        switch (phase) {
            case "inhale": return "Breathe In";
            case "hold1": return "Hold";
            case "exhale": return "Breathe Out";
            case "hold2": return "Hold";
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
                    <Text style={styles.exerciseDurationFullscreen}>
                        Elapsed: {Math.floor(sessionDuration / 60)}:{(sessionDuration % 60).toString().padStart(2, '0')}
                    </Text>
                </View>

                {/* Helpful Tip Card */}
                <View style={styles.tipCard}>
                    <View style={styles.tipHeader}>
                        <Wind size={16} color="#818CF8" />
                        <Text style={styles.tipLabel}>Breathing Tip</Text>
                    </View>
                    <Text style={styles.tipTextFullscreen}>
                        {(() => {
                            const tips = {
                                'inhale': 'Fill your lungs slowly and deeply through your nose',
                                'hold1': 'Gently hold the breath, stay relaxed',
                                'exhale': 'Release the air slowly through your mouth',
                                'hold2': 'Pause naturally, preparing for the next breath'
                            };
                            return tips[phase] || selectedExercise?.instruction || '';
                        })()}
                    </Text>
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
                    {confettiAnims.map((anim, i) => {
                        const colors = [
                            "#FF6B9D", "#C084FC", "#60A5FA", "#34D399",
                            "#FBBF24", "#F87171", "#A78BFA", "#FB923C",
                            "#EC4899", "#8B5CF6", "#10B981", "#F59E0B"
                        ];
                        const isCircle = i % 2 === 0;
                        const size = 8 + (i % 3) * 2;

                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    styles.confettiPiece,
                                    {
                                        width: size,
                                        height: size,
                                        backgroundColor: colors[i % colors.length],
                                        borderRadius: isCircle ? size / 2 : 0,
                                        transform: [
                                            { translateX: anim.x },
                                            { translateY: anim.y },
                                            {
                                                rotate: anim.rotate.interpolate({
                                                    inputRange: [0, 720],
                                                    outputRange: ['0deg', '720deg']
                                                })
                                            }
                                        ],
                                        opacity: anim.opacity,
                                    },
                                ]}
                            />
                        );
                    })}
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
                contentContainerStyle={{ paddingBottom: 100 }}
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
                        <Text style={styles.progressSubtitle}>
                            {(() => {
                                const today = getLocalDateString();
                                const todaySessions = breathingSessions.filter(s => s.session_date === today).length;
                                return `${todaySessions}/${DAILY_GOAL} completed today`;
                            })()}
                        </Text>
                    </View>
                    <View style={styles.percentageCircle}>
                        <Text style={styles.percentageText}>
                            {(() => {
                                const today = getLocalDateString();
                                const todaySessions = breathingSessions.filter(s => s.session_date === today).length;
                                return Math.round((todaySessions / DAILY_GOAL) * 100);
                            })()}%
                        </Text>
                    </View>
                </LinearGradient>

                {/* Visual Progress */}
                <View style={styles.visualProgressCard}>
                    <View style={styles.dotsRow}>
                        {[1, 2, 3].map(session => {
                            const today = getLocalDateString();
                            const todaySessions = breathingSessions.filter(s => s.session_date === today).length;

                            return (
                                <View
                                    key={session}
                                    style={[
                                        styles.sessionDot,
                                        todaySessions >= session && styles.sessionDotComplete
                                    ]}
                                >
                                    {todaySessions >= session && (
                                        <Text style={styles.checkmark}>✓</Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                    <Text style={styles.goalText}>
                        {(() => {
                            const today = getLocalDateString();
                            const todaySessions = breathingSessions.filter(s => s.session_date === today).length;
                            return todaySessions >= DAILY_GOAL ? "🎉 Goal reached!" : `${DAILY_GOAL - todaySessions} more to go!`;
                        })()}
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>Choose Exercise</Text>

                <View style={styles.exercisesGrid}>
                    {EXERCISES.map((exercise) => (
                        <TouchableOpacity
                            key={exercise.id}
                            style={styles.exerciseGridCard}
                            onPress={() => handleExerciseSelect(exercise)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={exercise.gradient}
                                style={styles.exerciseGridGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.exerciseGridIconBox}>
                                    {getIcon(exercise.icon, { size: 28, color: "#FFFFFF", strokeWidth: 2 })}
                                </View>
                                <Text style={styles.exerciseGridName}>{exercise.name}</Text>
                                <Text style={styles.exerciseGridDesc}>{exercise.description}</Text>
                                <View style={styles.exerciseGridPlayBtn}>
                                    <Play size={16} color="#FFF" fill="#FFF" />
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Weekly Calendar */}
                <View style={styles.calendarCard}>
                    <Text style={styles.calendarTitle}>📅 This Week</Text>
                    {/* DEBUG INFO */}
                    <Text style={{ fontSize: 10, color: '#666', marginBottom: 8, textAlign: 'center' }}>
                        Debug: Today is {getLocalDateString()} | Sessions: {breathingSessions.filter(s => s.session_date === getLocalDateString()).length}
                    </Text>
                    <View style={styles.weekRow}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, index) => {
                            // Force local timezone by manually getting date components
                            const now = new Date();
                            const localDateString = getLocalDateString(now);
                            const [year, month, dayNum] = localDateString.split('-').map(Number);

                            // Create a date from local components (month is 0-indexed in JS)
                            const localToday = new Date(year, month - 1, dayNum, 12, 0, 0); // Noon to avoid DST issues
                            const todayDayOfWeek = localToday.getDay(); // 0 = Sunday, 6 = Saturday

                            console.log('[Calendar] Local today:', localDateString, 'Day of week:', todayDayOfWeek);

                            // Calculate offset from Monday (0 = Mon, 6 = Sun)
                            const daysFromMonday = todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1;
                            const dayOffset = index - daysFromMonday;

                            // Calculate the date for this column
                            const columnDate = new Date(year, month - 1, dayNum + dayOffset, 12, 0, 0);
                            const dateStr = getLocalDateString(columnDate);

                            const isToday = dayOffset === 0;
                            const hasSession = breathingSessions.some(s => s.session_date === dateStr);

                            if (index === 0 || isToday) {
                                console.log(`[Calendar] ${dayName} (${index}): dateStr=${dateStr}, isToday=${isToday}, hasSession=${hasSession}`);
                            }

                            return (
                                <View key={dayName} style={styles.dayColumn}>
                                    <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                                        {dayName} ({columnDate.getDate()})
                                    </Text>
                                    <View style={[
                                        styles.dayCircle,
                                        isToday && styles.dayCircleToday,
                                        hasSession && styles.dayCircleComplete
                                    ]}>
                                        {isToday ? (
                                            <View style={styles.todayDot} />
                                        ) : hasSession ? (
                                            <Text style={styles.dayCheckmark}>✓</Text>
                                        ) : (
                                            <Text style={styles.dayNumber}>{columnDate.getDate()}</Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Monthly Calendar */}
                <View style={styles.calendarCard}>
                    <Text style={styles.calendarTitle}>📆 This Month</Text>
                    <View style={styles.monthGrid}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <Text key={i} style={styles.monthDayHeader}>{day}</Text>
                        ))}
                        {(() => {
                            const today = new Date();
                            const year = today.getFullYear();
                            const month = today.getMonth();
                            const firstDay = new Date(year, month, 1).getDay();
                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                            const days = [];

                            for (let i = 0; i < firstDay; i++) {
                                days.push(<View key={`empty-${i}`} style={styles.monthDayCell} />);
                            }

                            for (let day = 1; day <= daysInMonth; day++) {
                                const date = new Date(year, month, day);
                                const isToday = date.toDateString() === today.toDateString();
                                const dateStr = getLocalDateString(date);
                                const hasSession = breathingSessions.some(s => s.session_date === dateStr);

                                days.push(
                                    <TouchableOpacity
                                        key={day}
                                        style={styles.monthDayCell}
                                        onPress={() => {
                                            setSelectedDate(date);
                                            setShowDateModal(true);
                                        }}
                                    >
                                        <View style={[
                                            styles.monthDayCircle,
                                            isToday && styles.monthDayToday,
                                            hasSession && styles.monthDayComplete
                                        ]}>
                                            {hasSession && !isToday && <View style={styles.sessionDot} />}
                                            <Text style={[
                                                styles.monthDayText,
                                                isToday && styles.monthDayTextToday,
                                                hasSession && styles.monthDayTextComplete
                                            ]}>{day}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            }
                            return days;
                        })()}
                    </View>
                </View>

                {/* Weekly Session Bar Graph */}
                <View style={styles.graphCard}>
                    <Text style={styles.graphTitle}>📊 Weekly Activity</Text>
                    <View style={styles.graphContainer}>
                        {(() => {
                            const today = new Date();
                            const days = [];

                            // Get last 7 days
                            for (let i = 6; i >= 0; i--) {
                                const date = new Date(today);
                                date.setDate(today.getDate() - i);
                                const dateStr = getLocalDateString(date);
                                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

                                // Get sessions for this day, grouped by type
                                const daySessions = breathingSessions.filter(s => s.session_date === dateStr);
                                const exerciseTypes = {
                                    'Calm Breathing': { count: 0, color: '#818CF8' },
                                    'Deep Focus': { count: 0, color: '#A78BFA' },
                                    'Sleep Ready': { count: 0, color: '#FB7185' },
                                    'Energy Boost': { count: 0, color: '#34D399' },
                                    'Stress Relief': { count: 0, color: '#60A5FA' },
                                    'Evening Wind Down': { count: 0, color: '#F59E0B' }
                                };

                                daySessions.forEach(s => {
                                    if (exerciseTypes[s.exercise_name]) {
                                        exerciseTypes[s.exercise_name].count++;
                                    }
                                });

                                const totalCount = daySessions.length;
                                days.push({ dateStr, dayName, exerciseTypes, totalCount });
                            }

                            const maxCount = Math.max(...days.map(d => d.totalCount), 1);
                            const barMaxHeight = 120;

                            return (
                                <>
                                    <View style={styles.barsRow}>
                                        {days.map((day, index) => {
                                            const barHeight = (day.totalCount / maxCount) * barMaxHeight;
                                            const isToday = day.dateStr === getLocalDateString();

                                            return (
                                                <View key={index} style={styles.barColumn}>
                                                    <View style={styles.barContainer}>
                                                        {day.totalCount > 0 ? (
                                                            <View style={[styles.bar, { height: barHeight }]}>
                                                                {Object.entries(day.exerciseTypes).map(([name, data]) => {
                                                                    if (data.count === 0) return null;
                                                                    const segmentHeight = (data.count / day.totalCount) * barHeight;
                                                                    return (
                                                                        <View
                                                                            key={name}
                                                                            style={{
                                                                                height: segmentHeight,
                                                                                backgroundColor: data.color,
                                                                                width: '100%',
                                                                            }}
                                                                        />
                                                                    );
                                                                })}
                                                                <Text style={styles.barCount}>{day.totalCount}</Text>
                                                            </View>
                                                        ) : (
                                                            <View style={styles.emptyBar} />
                                                        )}
                                                    </View>
                                                    <Text style={[
                                                        styles.barDayLabel,
                                                        isToday && styles.barDayLabelToday
                                                    ]}>{day.dayName}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {/* Legend */}
                                    <View style={styles.graphLegend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#818CF8' }]} />
                                            <Text style={styles.legendText}>Calm</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#A78BFA' }]} />
                                            <Text style={styles.legendText}>Focus</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#FB7185' }]} />
                                            <Text style={styles.legendText}>Sleep</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#34D399' }]} />
                                            <Text style={styles.legendText}>Energy</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#60A5FA' }]} />
                                            <Text style={styles.legendText}>Stress Relief</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                                            <Text style={styles.legendText}>Wind Down</Text>
                                        </View>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💨 Breathing Tips</Text>
                    <Text style={styles.tipText}>• Find a quiet, comfortable space</Text>
                    <Text style={styles.tipText}>• Practice at the same time daily</Text>
                    <Text style={styles.tipText}>• Focus on slow, deep breaths</Text>
                </View>
            </ScrollView>

            {/* Date Detail Modal */}
            <Modal
                visible={showDateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDateModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowDateModal(false)}
                >
                    <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>

                            <ScrollView
                                style={{ maxHeight: 400 }}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                {(() => {
                                    const dateStr = selectedDate ? getLocalDateString(selectedDate) : null;
                                    const daySessions = breathingSessions.filter(s => s.session_date === dateStr);
                                    const totalDuration = daySessions.reduce((sum, s) => sum + s.duration_seconds, 0);

                                    const formatDuration = (seconds) => {
                                        const mins = Math.floor(seconds / 60);
                                        const secs = seconds % 60;
                                        return `${mins}m ${secs}s`;
                                    };

                                    // Get emoji for session (from session data or lookup by name)
                                    const getSessionEmoji = (session) => {
                                        // If session has emoji, use it
                                        if (session.exercise_emoji) return session.exercise_emoji;

                                        // Otherwise, look up by exercise name
                                        const exercise = EXERCISES.find(ex => ex.name === session.exercise_name);
                                        return exercise?.emoji || '🌬️';
                                    };

                                    const getExerciseColor = (name) => {
                                        if (name?.includes('Calm')) return '#818CF8';
                                        if (name?.includes('Focus')) return '#A78BFA';
                                        if (name?.includes('Sleep')) return '#FB7185';
                                        if (name?.includes('Energy')) return '#34D399';
                                        if (name?.includes('Stress')) return '#60A5FA';
                                        if (name?.includes('Wind')) return '#F59E0B';
                                        return '#818CF8';
                                    };

                                    if (daySessions.length === 0) {
                                        return (
                                            <View style={styles.sessionsList}>
                                                <Text style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>
                                                    No breathing sessions on this day
                                                </Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <>
                                            <View style={styles.sessionsList}>
                                                {daySessions.map((session, idx) => (
                                                    <View key={idx} style={styles.sessionItem}>
                                                        <View style={[styles.sessionIcon, { backgroundColor: getExerciseColor(session.exercise_name) }]}>
                                                            <Text style={styles.sessionEmoji}>{getSessionEmoji(session)}</Text>
                                                        </View>
                                                        <View style={styles.sessionInfo}>
                                                            <Text style={styles.sessionName}>{session.exercise_name}</Text>
                                                            <Text style={styles.sessionTime}>Duration: {formatDuration(session.duration_seconds)}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>

                                            <View style={styles.sessionSummary}>
                                                <Text style={styles.summaryText}>Total Sessions: <Text style={styles.summaryBold}>{daySessions.length}</Text></Text>
                                                <Text style={styles.summaryText}>Total Time: <Text style={styles.summaryBold}>{formatDuration(totalDuration)}</Text></Text>
                                            </View>
                                        </>
                                    );
                                })()}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowDateModal(false)}
                            >
                                <Text style={styles.modalCloseText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Toast Notification */}
            {toast.show && (
                <Animated.View style={[
                    styles.toast,
                    { backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444' }
                ]}>
                    <Text style={styles.toastText}>{toast.message}</Text>
                </Animated.View>
            )}
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
    confettiPiece: {
        position: "absolute",
        top: 0,
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
    checkmark: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FFF",
    },
    sessionNumber: {
        fontSize: 20,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    goalText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
        marginHorizontal: 20,
    },
    exercisesGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        paddingHorizontal: 14,
        marginBottom: 20,
        gap: 12,
    },
    exerciseGridCard: {
        width: "47.5%",
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    exerciseGridGradient: {
        padding: 20,
        minHeight: 180,
        justifyContent: "space-between",
    },
    exerciseGridIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    exerciseGridName: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 6,
        textShadowColor: "rgba(0, 0, 0, 0.2)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    exerciseGridDesc: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.9)",
        marginBottom: 12,
        lineHeight: 16,
    },
    exerciseGridPlayBtn: {
        alignSelf: "flex-end",
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        justifyContent: "center",
        alignItems: "center",
    },
    calendarCard: {
        backgroundColor: "#FFF",
        marginHorizontal: 20,
        marginBottom: 20,
        padding: 20,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    weekRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    dayColumn: {
        alignItems: "center",
        flex: 1,
    },
    dayLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9CA3AF",
        marginBottom: 6,
    },
    dayLabelToday: {
        color: "#818CF8",
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    dayCircleToday: {
        backgroundColor: "#818CF8",
        borderColor: "#818CF8",
    },
    dayCircleComplete: {
        backgroundColor: "#10B981",
        borderColor: "#10B981",
    },
    todayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#FFF",
    },
    dayCheckmark: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFF",
    },
    dayNumber: {
        fontSize: 13,
        fontWeight: "600",
        color: "#6B7280",
    },
    monthGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    monthDayHeader: {
        width: `${100 / 7}%`,
        textAlign: "center",
        fontSize: 11,
        fontWeight: "600",
        color: "#9CA3AF",
        marginBottom: 8,
    },
    monthDayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        padding: 2,
    },
    monthDayCircle: {
        flex: 1,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    monthDayToday: {
        backgroundColor: "#818CF8",
    },
    monthDayComplete: {
        backgroundColor: "#E0F2FE",
    },
    monthDayText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
    },
    monthDayTextToday: {
        color: "#FFF",
    },
    monthDayTextComplete: {
        color: "#1F2937",
    },
    sessionDot: {
        position: "absolute",
        top: 4,
        right: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#10B981",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },
    modalContent: {
        backgroundColor: "#FFF",
        borderRadius: 24,
        padding: 24,
        width: "95%",
        minWidth: 320,
        maxWidth: 600,
        shadowColor: "#000",
        shadowOffset: { width: 3, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 20,
        textAlign: "center",
    },
    sessionsList: {
        marginBottom: 20,
    },
    sessionItem: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "#F9FAFB",
        borderRadius: 16,
        marginBottom: 12,
    },
    sessionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    sessionEmoji: {
        fontSize: 24,
    },
    sessionInfo: {
        flex: 1,
    },
    sessionName: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    sessionTime: {
        fontSize: 13,
        color: "#6B7280",
    },
    sessionSummary: {
        backgroundColor: "#EEF2FF",
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    summaryText: {
        fontSize: 14,
        color: "#1F2937",
        marginBottom: 6,
    },
    summaryBold: {
        fontWeight: "700",
        color: "#818CF8",
    },
    modalCloseButton: {
        backgroundColor: "#818CF8",
        padding: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    modalCloseText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFF",
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
    toast: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 9999,
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    // Bar Graph Styles
    graphCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 12,
        marginBottom: 12,
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    graphTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 20,
    },
    graphContainer: {
        width: "100%",
    },
    barsRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 140,
        marginBottom: 8,
    },
    barColumn: {
        flex: 1,
        alignItems: "center",
        gap: 8,
    },
    barContainer: {
        flex: 1,
        justifyContent: "flex-end",
        width: "100%",
        alignItems: "center",
    },
    bar: {
        width: 28,
        borderRadius: 6,
        overflow: "hidden",
        justifyContent: "flex-start",
        alignItems: "center",
        position: "relative",
        minHeight: 20,
    },
    emptyBar: {
        width: 28,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#E5E7EB",
    },
    barCount: {
        position: "absolute",
        top: -20,
        fontSize: 11,
        fontWeight: "700",
        color: "#1F2937",
    },
    barDayLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6B7280",
    },
    barDayLabelToday: {
        color: "#818CF8",
        fontWeight: "700",
    },
    graphLegend: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 16,
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
    },
    // Breathing Session Tip Card
    tipCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 24,
        borderRadius: 20,
        padding: 20,
        shadowColor: "#818CF8",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: "#E0E7FF",
    },
    tipHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    tipLabel: {
        fontSize: 14,
        fontWeight: "700",
        color: "#818CF8",
    },
    tipTextFullscreen: {
        fontSize: 14,
        lineHeight: 22,
        color: "#374151",
        fontWeight: "500",
    },
});