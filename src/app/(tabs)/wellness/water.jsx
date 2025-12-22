import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Droplets, Plus, Minus, Info, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from '@/utils/supabaseClient';

const DAILY_GOAL = 2000; // 2000ml = 2L
const CUP_SIZE = 200; // 200ml per cup

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function WaterTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { water, updateWater } = useWellness();

    // Derived state from context
    const mlToday = water.today;
    const history = water.history;

    const [showConfetti, setShowConfetti] = useState(false);
    const [waterSessions, setWaterSessions] = useState([]);
    const [userId, setUserId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [showDateModal, setShowDateModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const fillAnim = useRef(new Animated.Value(0)).current;
    const liquidHeight = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Button animations
    const addBtnScale = useRef(new Animated.Value(1)).current;
    const removeBtnScale = useRef(new Animated.Value(1)).current;
    const mainBtnScale = useRef(new Animated.Value(1)).current;

    const animateButton = (scaleAnim) => {
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
        ]).start();
    };

    useEffect(() => {
        startWaveAnimation();

        // Rotate animation for border
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 10000,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: mlToday,
            useNativeDriver: false,
            tension: 20,
            friction: 7,
        }).start();

        // Animate liquid height for circular view
        Animated.spring(liquidHeight, {
            toValue: mlToday / DAILY_GOAL,
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
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(waveAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

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
                const userDataStr = await AsyncStorage.getItem("userData");
                const user = userDataStr ? JSON.parse(userDataStr) : null;
                const userId = user?.userId || user?._id || user?.id || user?.mongo_id;

                if (userId) {
                    setUserId(userId);

                    const { data, error } = await supabase
                        .from('water_logs')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('[Water] Supabase error:', error);
                    } else {
                        console.log('[Water] Fetched data sample:', data?.[0]); // See actual columns
                        setWaterSessions(data || []);

                        if (data && data.length > 0) {
                            // Update today's total from database
                            const today = getLocalDateString();
                            const todayData = data.filter(s => s.date === today);
                            const todayTotal = todayData.reduce((sum, s) => sum + s.amount_ml, 0);
                            updateWater(todayTotal);
                        }
                    }
                }
            } catch (err) {
                console.error('[Water] Fetch error:', err);
            }
        };

        fetchSessions();
    }, []);

    // Save water to Supabase
    const saveWaterIntake = async (amount) => {
        try {
            if (userId && amount > 0) {
                const intakeData = {
                    user_id: userId,
                    amount_ml: amount,
                    date: getLocalDateString(),
                    daily_goal: DAILY_GOAL
                };

                const { data, error } = await supabase
                    .from('water_logs')
                    .insert(intakeData)
                    .select();

                if (error) {
                    console.error('[Water] Supabase error:', error);
                } else {
                    console.log('[Water] Saved to Supabase');
                    // Refresh sessions
                    const { data: updated } = await supabase
                        .from('water_logs')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (updated) setWaterSessions(updated);
                }
            }
        } catch (err) {
            console.error('[Water] Save error:', err);
        }
    };

    // Water functions
    const addWater = (amount) => {
        const newAmount = Math.min(mlToday + amount, 5000);
        updateWater(newAmount);
        saveWaterIntake(amount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const removeWater = (amount) => {
        const newAmount = Math.max(mlToday - amount, 0);
        updateWater(newAmount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const progress = Math.min(mlToday / DAILY_GOAL, 1);
    const fillHeight = fillAnim.interpolate({
        inputRange: [0, DAILY_GOAL],
        outputRange: ["0%", "100%"],
        extrapolate: "clamp"
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
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === getLocalDateString();
            // Use live mlToday for today, waterSessions for other days
            const dayTotal = isToday ? mlToday : waterSessions
                .filter(s => s.date === dateStr)
                .reduce((sum, s) => sum + s.amount_ml, 0);

            days.push({
                day,
                completed: dayTotal >= DAILY_GOAL,
                ml: dayTotal,
            });
        }
        return days;
    };

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
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            >
                {/* Time Card with Gradient */}
                <LinearGradient
                    colors={["#3B82F6", "#2563EB"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.timeCard}
                >
                    <View>
                        <Text style={styles.timeText}>{currentTime}</Text>
                        <Text style={styles.timeSubtext}>{mlToday}ml consumed today</Text>
                    </View>
                    <View style={styles.percentageCircle}>
                        <Text style={styles.percentageText}>{Math.round(progress * 100)}%</Text>
                    </View>
                </LinearGradient>

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
                                    <Animated.View
                                        style={[
                                            styles.wave,
                                            {
                                                opacity: 0.5,
                                                transform: [{
                                                    translateY: waveAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, 10]
                                                    })
                                                }]
                                            }
                                        ]}
                                    />
                                </Animated.View>
                                <View style={styles.bottleOverlay}>
                                    <Text style={[styles.bottleText, { color: mlToday > DAILY_GOAL / 2 ? '#FFF' : '#1F2937' }]}>
                                        {mlToday}ml
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Progress Info */}
                    <View style={styles.progressInfo}>
                        <View style={styles.targetCard}>
                            <View style={styles.targetIcon}>
                                <Droplets size={20} color="#3B82F6" />
                            </View>
                            <View>
                                <Text style={styles.targetLabel}>Daily Goal</Text>
                                <Text style={styles.targetValue}>{DAILY_GOAL}ml</Text>
                            </View>
                        </View>
                        <View style={styles.targetCard}>
                            <View style={[styles.targetIcon, { backgroundColor: '#ECFDF5' }]}>
                                <Info size={20} color="#10B981" />
                            </View>
                            <View>
                                <Text style={styles.targetLabel}>Remaining</Text>
                                <Text style={styles.targetValue}>{Math.max(0, DAILY_GOAL - mlToday)}ml</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddContainer}>
                    <AnimatedTouchable
                        style={[styles.quickAddButton, { transform: [{ scale: removeBtnScale }] }]}
                        onPress={() => {
                            animateButton(removeBtnScale);
                            removeWater(CUP_SIZE);
                        }}
                    >
                        <Minus size={20} color="#EF4444" />
                        <Text style={styles.quickAddText}>-200ml</Text>
                    </AnimatedTouchable>

                    <AnimatedTouchable
                        style={[styles.mainAddButton, { transform: [{ scale: mainBtnScale }] }]}
                        onPress={() => {
                            animateButton(mainBtnScale);
                            addWater(CUP_SIZE);
                        }}
                    >
                        <LinearGradient
                            colors={["#3B82F6", "#2563EB"]}
                            style={styles.mainAddGradient}
                        >
                            <Plus size={24} color="#FFFFFF" />
                            <Text style={styles.mainAddText}>Add 200ml</Text>
                        </LinearGradient>
                    </AnimatedTouchable>

                    <AnimatedTouchable
                        style={[styles.quickAddButton, { transform: [{ scale: addBtnScale }] }]}
                        onPress={() => {
                            animateButton(addBtnScale);
                            addWater(CUP_SIZE);
                        }}
                    >
                        <Plus size={20} color="#10B981" />
                        <Text style={styles.quickAddText}>+200ml</Text>
                    </AnimatedTouchable>
                </View>

                {/* Weekly Progress Graph */}
                <View style={styles.graphCard}>
                    <Text style={styles.graphTitle}>Weekly Progress</Text>
                    <View style={styles.barsContainer}>
                        {(() => {
                            const last7Days = [];
                            const now = new Date();
                            for (let i = 6; i >= 0; i--) {
                                const date = new Date(now);
                                date.setDate(now.getDate() - i);
                                const dateStr = getLocalDateString(date);
                                const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
                                const isToday = dateStr === getLocalDateString();
                                // Use live mlToday for today, waterSessions for past days
                                const dayTotal = isToday ? mlToday : waterSessions
                                    .filter(s => s.date === dateStr)
                                    .reduce((sum, s) => sum + s.amount_ml, 0);
                                last7Days.push({ day: dayName, ml: dayTotal });
                            }

                            const maxMl = Math.max(...last7Days.map(d => d.ml), DAILY_GOAL, 1);

                            return last7Days.map((day, idx) => {
                                // Calculate actual pixel height (max 150px out of 180px container)
                                const barHeight = Math.max((day.ml / maxMl) * 150, day.ml > 0 ? 8 : 0);
                                const isGoalMet = day.ml >= DAILY_GOAL;

                                return (
                                    <View key={idx} style={styles.barWrapper}>
                                        <View style={styles.barColumn}>
                                            {day.ml > 0 && (
                                                <Text style={styles.barValue}>{Math.round(day.ml / 100) / 10}L</Text>
                                            )}
                                            {/* Bar with calculated height */}
                                            <View style={{ width: '100%', height: barHeight, borderRadius: 8, overflow: 'hidden' }}>
                                                <LinearGradient
                                                    colors={isGoalMet ? ['#10B981', '#059669'] : ['#60A5FA', '#3B82F6']}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            </View>
                                        </View>
                                        <Text style={[styles.barDay, isGoalMet && styles.barDayCompleted]}>{day.day}</Text>
                                    </View>
                                );
                            });
                        })()}
                    </View>
                </View>

                {/* Mini Calendar */}
                <View style={styles.calendarContainer}>
                    <Text style={styles.calendarTitle}>History</Text>
                    <View style={styles.calendarGrid}>
                        {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                            <Text key={i} style={styles.calendarDayHeader}>{day}</Text>
                        ))}
                        {getCalendarDays().map((day, i) => (
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
        marginTop: 10,
        marginBottom: 30,
        padding: 24,
        borderRadius: 24,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    timeText: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    timeSubtext: {
        fontSize: 14,
        color: "#DBEAFE",
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
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
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
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    bottleNeck: {
        width: 50,
        height: 25,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderBottomWidth: 0,
        zIndex: 1,
    },
    bottleBody: {
        width: 140,
        height: 240,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 24,
        overflow: "hidden",
        position: "relative",
        borderWidth: 2,
        borderColor: "#E5E7EB",
    },
    waterFill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
    },
    wave: {
        position: "absolute",
        top: -10,
        left: 0,
        right: 0,
        height: 20,
        backgroundColor: "#60A5FA",
        borderRadius: 10,
    },
    bottleOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    bottleText: {
        fontSize: 32,
        fontWeight: "800",
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    targetCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    targetIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    targetLabel: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    targetValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    quickAddContainer: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 32,
    },
    quickAddButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        paddingVertical: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
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
        height: 60,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
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
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    calendarTitle: {
        fontSize: 18,
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
        position: "relative",
    },
    calendarDayText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    calendarDayCompleted: {
        color: "#3B82F6",
        fontWeight: "700",
    },
    calendarDot: {
        position: "absolute",
        bottom: 6,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#3B82F6",
    },
    tipsCard: {
        backgroundColor: "#EFF6FF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "#BFDBFE",
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E40AF",
        marginBottom: 12,
    },
    tipText: {
        fontSize: 14,
        color: "#1E40AF",
        lineHeight: 24,
        marginBottom: 4,
        fontWeight: "500",
    },
    liquidCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        borderRadius: 24,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        alignItems: "center",
    },
    liquidContainer: {
        width: 220,
        height: 220,
        marginBottom: 32,
        justifyContent: "center",
        alignItems: "center",
    },
    rotatingBorder: {
        position: "absolute",
        width: 220,
        height: 220,
        borderRadius: 110,
        overflow: "hidden",
    },
    liquidCircle: {
        width: 196,
        height: 196,
        borderRadius: 98,
        backgroundColor: "#EFF6FF",
        overflow: "hidden",
        justifyContent: "flex-end",
        position: "relative",
    },
    liquidFill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 98,
    },
    liquidTextContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
    },
    liquidValue: {
        fontSize: 42,
        fontWeight: "700",
        color: "#1F2937",
    },
    liquidGoal: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0EA5E9",
        marginTop: 4,
    },
    typeIconsRow: {
        flexDirection: "row",
        gap: 24,
        marginBottom: 0,
    },
    typeIcon: {
        alignItems: "center",
        gap: 8,
    },
    typeIconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    typeLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#6B7280",
        textTransform: "uppercase",
    },
    graphCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 24,
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
    barsContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 180,
        gap: 8,
    },
    barWrapper: {
        flex: 1,
        height: 180,
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 8,
    },
    barColumn: {
        width: "100%",
        alignItems: "center",
    },
    bar: {
        width: "100%",
        borderRadius: 8,
        overflow: "hidden",
        minHeight: 4,
    },
    barValue: {
        fontSize: 10,
        fontWeight: "600",
        color: "#3B82F6",
        marginBottom: 4,
    },
    barDay: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    barDayCompleted: {
        color: "#10B981",
        fontWeight: "700",
    },
});

