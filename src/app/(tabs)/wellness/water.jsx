import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Easing,
    Alert,
    Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    ArrowLeft,
    Droplets,
    Plus,
    Minus,
    X,
    TrendingUp,
    TrendingDown,
    Activity,
    Calendar as CalendarIcon,
    Target,
    Flame,
    Award,
    Clock,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabaseClient";

const DAILY_GOAL = 2000; // 2000ml = 2L
const CUP_SIZE = 200; // 200ml per cup

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function WaterTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [mlToday, setMlToday] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
    const [selectedDayDetails, setSelectedDayDetails] = useState(null);
    const [userId, setUserId] = useState(null);
    const [waterLogs, setWaterLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastLogTime, setLastLogTime] = useState(null);
    const [pendingAmount, setPendingAmount] = useState(0);

    const fillAnim = useRef(new Animated.Value(0)).current;
    const liquidHeight = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const waveAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(
        Array.from({ length: 15 }, () => ({
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        })),
    ).current;

    // Button animations
    const addBtnScale = useRef(new Animated.Value(1)).current;
    const removeBtnScale = useRef(new Animated.Value(1)).current;
    const mainBtnScale = useRef(new Animated.Value(1)).current;

    const animateButton = (scaleAnim) => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.95,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 5,
                useNativeDriver: true,
            }),
        ]).start();
    };

    useEffect(() => {
        startWaveAnimation();

        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 10000,
                useNativeDriver: true,
            }),
        ).start();
    }, []);

    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: mlToday,
            useNativeDriver: false,
            tension: 20,
            friction: 7,
        }).start();

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
            ]),
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

    // Load user and water data from Supabase
    useEffect(() => {
        loadWaterData();
    }, []);

    const loadWaterData = async () => {
        try {
            setLoading(true);

            // Get user ID
            const storedUserId = await AsyncStorage.getItem("userId");
            if (!storedUserId) {
                console.log('[Water] No user ID found');
                setLoading(false);
                return;
            }

            setUserId(storedUserId);
            console.log('[Water] Loading data for user:', storedUserId);

            // Fetch water logs from Supabase
            const { data, error } = await supabase
                .from('water_logs')
                .select('*')
                .eq('user_id', storedUserId)
                .order('logged_at', { ascending: false });

            if (error) {
                console.error('[Water] Error loading:', error);
                setLoading(false);
                return;
            }

            console.log('[Water] Loaded', data?.length || 0, 'logs');
            setWaterLogs(data || []);

            // Calculate today's total using local timezone
            const todayStr = new Date().toDateString();
            const todayLogs = (data || []).filter(log => {
                const logDateStr = new Date(log.logged_at).toDateString();
                return logDateStr === todayStr;
            });

            const todayTotal = todayLogs.reduce((sum, log) => sum + log.amount_ml, 0);
            setMlToday(todayTotal);

            setLoading(false);
        } catch (error) {
            console.error('[Water] Load error:', error);
            setLoading(false);
        }
    };

    const saveWaterLog = async (amount) => {
        if (!userId) {
            console.log('[Water] No user ID, cannot save');
            Alert.alert('Error', 'Please log in to track water intake');
            return;
        }

        try {
            const now = new Date();
            const currentTime = now.getTime();

            console.log('[Water] Attempting to save', amount, 'ml for user', userId);

            // Check if we should update the last log (within 1 minute)
            if (lastLogTime && (currentTime - lastLogTime) < 60000) {
                console.log('[Water] Within 1 minute, updating last log');

                // Get the most recent log
                const { data: recentLogs, error: fetchError } = await supabase
                    .from('water_logs')
                    .select('*')
                    .eq('user_id', userId)
                    .order('logged_at', { ascending: false })
                    .limit(1);

                if (fetchError) {
                    console.error('[Water] Error fetching recent log:', fetchError);
                    Alert.alert('Error', 'Failed to fetch recent logs: ' + fetchError.message);
                    return;
                }

                if (recentLogs && recentLogs.length > 0) {
                    const lastLog = recentLogs[0];
                    const lastLogTime = new Date(lastLog.logged_at).getTime();

                    // Verify it's within 1 minute
                    if ((currentTime - lastLogTime) < 60000) {
                        const newAmount = lastLog.amount_ml + amount;

                        console.log('[Water] Updating log', lastLog.id, 'from', lastLog.amount_ml, 'to', newAmount);

                        const { error: updateError } = await supabase
                            .from('water_logs')
                            .update({
                                amount_ml: newAmount,
                                logged_at: now.toISOString()
                            })
                            .eq('id', lastLog.id);

                        if (updateError) {
                            console.error('[Water] Update error:', updateError);
                            Alert.alert('Error', 'Failed to update log: ' + updateError.message);
                            return;
                        }

                        console.log('[Water] ✅ Successfully updated log:', lastLog.id, 'to', newAmount, 'ml');
                        setLastLogTime(currentTime);
                        await loadWaterData();
                        return;
                    }
                }
            }

            // Create new log
            // Get local date string (YYYY-MM-DD) to avoid timezone issues
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const localDateStr = `${year}-${month}-${day}`;

            const logData = {
                user_id: userId,
                amount_ml: amount,
                logged_at: now.toISOString(),
                date: localDateStr
            };

            console.log('[Water] Creating new log with data:', logData);

            const { data, error } = await supabase
                .from('water_logs')
                .insert(logData)
                .select();

            if (error) {
                console.error('[Water] ❌ Insert error:', error);
                console.error('[Water] Error details:', JSON.stringify(error, null, 2));
                Alert.alert('Database Error', 'Failed to save water log: ' + error.message + '\n\nPlease make sure the water_logs table exists in Supabase.');
                return;
            }

            console.log('[Water] ✅ Successfully saved new log:', data);
            setLastLogTime(currentTime);
            await loadWaterData();
        } catch (error) {
            console.error('[Water] ❌ Save error:', error);
            Alert.alert('Error', 'Failed to save water log: ' + error.message);
        }
    };

    const addWater = (amount) => {
        const newAmount = Math.min(mlToday + amount, 5000);
        setMlToday(newAmount);
        saveWaterLog(amount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const removeWater = (amount) => {
        const newAmount = Math.max(mlToday - amount, 0);
        setMlToday(newAmount);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const progress = Math.min(mlToday / DAILY_GOAL, 1);
    const fillHeight = fillAnim.interpolate({
        inputRange: [0, DAILY_GOAL],
        outputRange: ["0%", "100%"],
        extrapolate: "clamp",
    });

    // Calculate real weekly data from waterLogs
    const getWeeklyData = () => {
        const weekData = [];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const now = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayName = dayNames[date.getDay()];

            const dayLogs = waterLogs.filter(log => {
                const logDate = new Date(log.logged_at).toISOString().split('T')[0];
                return logDate === dateStr;
            });

            const dayTotal = dayLogs.reduce((sum, log) => sum + log.amount_ml, 0);

            weekData.push({
                day: dayName.slice(0, 3),
                ml: dayTotal,
                cups: Math.floor(dayTotal / CUP_SIZE),
                date: dateStr
            });
        }

        return weekData;
    };

    const weeklyData = getWeeklyData();

    // Calculate analytics stats from real data
    const calculateAnalytics = () => {
        const last30Days = waterLogs.filter(log => {
            const logTime = new Date(log.logged_at).getTime();
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            return logTime >= thirtyDaysAgo;
        });

        // Group by date to get daily totals
        const dailyTotals = {};
        last30Days.forEach(log => {
            const date = new Date(log.logged_at).toISOString().split('T')[0];
            dailyTotals[date] = (dailyTotals[date] || 0) + log.amount_ml;
        });

        const daysWithData = Object.keys(dailyTotals).length;
        const totalMl = Object.values(dailyTotals).reduce((sum, ml) => sum + ml, 0);
        const avgDaily = daysWithData > 0 ? totalMl / daysWithData : 0;

        // Calculate streak
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            if (dailyTotals[dateStr] && dailyTotals[dateStr] >= DAILY_GOAL) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        // Weekly goal percentage
        const weekTotal = weeklyData.reduce((sum, day) => sum + day.ml, 0);
        const weekGoal = DAILY_GOAL * 7;
        const weeklyGoalPercent = Math.round((weekTotal / weekGoal) * 100);

        return {
            avgDaily: (avgDaily / 1000).toFixed(1) + "L",
            streak: streak,
            weeklyGoalPercent: weeklyGoalPercent,
        };
    };

    const analytics = calculateAnalytics();

    const analyticsStats = [
        {
            label: "Avg Daily",
            value: analytics.avgDaily,
            change: waterLogs.length > 0 ? "30 days" : "No data",
            isPositive: true,
            icon: Droplets,
            color: "#3B82F6",
        },
        {
            label: "Streak",
            value: analytics.streak + " days",
            change: analytics.streak > 0 ? "Active" : "Start today!",
            isPositive: analytics.streak > 0,
            icon: Flame,
            color: "#F59E0B",
        },
        {
            label: "Weekly Goal",
            value: analytics.weeklyGoalPercent + "%",
            change: analytics.weeklyGoalPercent >= 100 ? "Complete!" : "Keep going",
            isPositive: analytics.weeklyGoalPercent >= 70,
            icon: Target,
            color: "#10B981",
        },
        {
            label: "Best Time",
            value: "10 AM",
            change: "Peak",
            isPositive: true,
            icon: Clock,
            color: "#8B5CF6",
        },
    ];

    const generateCalendar = () => {
        const days = [];
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty days
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Add actual days with real data
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateStr = date.toDateString();

            const dayLogs = waterLogs.filter(log => {
                const logDate = new Date(log.logged_at).toDateString();
                return logDate === dateStr;
            });

            const dayTotal = dayLogs.reduce((sum, log) => sum + log.amount_ml, 0);

            days.push({
                day,
                completed: dayTotal >= DAILY_GOAL,
                ml: dayTotal,
                date: date.toISOString().split('T')[0],
                logs: dayLogs
            });
        }

        return days;
    };

    const calendarDays = generateCalendar();
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const currentTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

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
                                    backgroundColor: ["#3B82F6", "#60A5FA", "#2563EB", "#DBEAFE"][
                                        i % 4
                                    ],
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
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Water Analytics</Text>
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
                        <Text style={styles.percentageText}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>
                </LinearGradient>

                {/* Analytics Stats Grid */}
                <View style={styles.statsGrid}>
                    {analyticsStats.map((stat, index) => {
                        const Icon = stat.icon;
                        return (
                            <View key={stat.label} style={styles.statCard}>
                                <View style={styles.statHeader}>
                                    <View
                                        style={[
                                            styles.statIcon,
                                            { backgroundColor: stat.color + "15" },
                                        ]}
                                    >
                                        <Icon size={18} color={stat.color} />
                                    </View>
                                    <View style={styles.statChange}>
                                        {stat.isPositive ? (
                                            <TrendingUp size={14} color="#10B981" />
                                        ) : (
                                            <TrendingDown size={14} color="#EF4444" />
                                        )}
                                        <Text
                                            style={[
                                                styles.changeText,
                                                { color: stat.isPositive ? "#10B981" : "#EF4444" },
                                            ]}
                                        >
                                            {stat.change}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                                <Text style={styles.statValue}>{stat.value}</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Water Bottle Visualization */}
                <View style={styles.bottleCard}>
                    <Text style={styles.sectionTitle}>Today's Progress</Text>
                    <View style={styles.bottleWrapper}>
                        <View style={styles.bottleOutline}>
                            <View style={styles.bottleNeck} />
                            <View style={styles.bottleBody}>
                                <Animated.View
                                    style={[styles.waterFill, { height: fillHeight }]}
                                >
                                    <LinearGradient
                                        colors={["#60A5FA", "#3B82F6"]}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Animated.View
                                        style={[
                                            styles.wave,
                                            {
                                                opacity: 0.5,
                                                transform: [
                                                    {
                                                        translateY: waveAnim.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [0, 10],
                                                        }),
                                                    },
                                                ],
                                            },
                                        ]}
                                    />
                                </Animated.View>
                                <View style={styles.bottleOverlay}>
                                    <Text
                                        style={[
                                            styles.bottleText,
                                            { color: mlToday > DAILY_GOAL / 2 ? "#FFF" : "#1F2937" },
                                        ]}
                                    >
                                        {mlToday}ml
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

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
                            <View style={[styles.targetIcon, { backgroundColor: "#ECFDF5" }]}>
                                <Target size={20} color="#10B981" />
                            </View>
                            <View>
                                <Text style={styles.targetLabel}>Remaining</Text>
                                <Text style={styles.targetValue}>
                                    {Math.max(0, DAILY_GOAL - mlToday)}ml
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddContainer}>
                    <AnimatedTouchable
                        style={[
                            styles.quickAddButton,
                            { transform: [{ scale: removeBtnScale }] },
                        ]}
                        onPress={() => {
                            animateButton(removeBtnScale);
                            removeWater(CUP_SIZE);
                        }}
                    >
                        <Minus size={20} color="#EF4444" />
                        <Text style={styles.quickAddText}>-200ml</Text>
                    </AnimatedTouchable>

                    <AnimatedTouchable
                        style={[
                            styles.mainAddButton,
                            { transform: [{ scale: mainBtnScale }] },
                        ]}
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
                        style={[
                            styles.quickAddButton,
                            { transform: [{ scale: addBtnScale }] },
                        ]}
                        onPress={() => {
                            animateButton(addBtnScale);
                            addWater(CUP_SIZE);
                        }}
                    >
                        <Plus size={20} color="#10B981" />
                        <Text style={styles.quickAddText}>+200ml</Text>
                    </AnimatedTouchable>
                </View>

                {/* Weekly Performance Chart */}
                <View style={styles.graphCard}>
                    <View style={styles.graphHeader}>
                        <Text style={styles.graphTitle}>Weekly Performance</Text>
                        <View style={styles.achievementBadge}>
                            <Award size={14} color="#F59E0B" />
                            <Text style={styles.achievementText}>On Track!</Text>
                        </View>
                    </View>
                    <View style={styles.barsContainer}>
                        {weeklyData.map((item, idx) => {
                            const maxMl = Math.max(
                                ...weeklyData.map((d) => d.ml),
                                DAILY_GOAL,
                            );
                            const barHeight = Math.max(
                                (item.ml / maxMl) * 150,
                                item.ml > 0 ? 8 : 0,
                            );
                            const isGoalMet = item.ml >= DAILY_GOAL;

                            return (
                                <View key={idx} style={styles.barWrapper}>
                                    <View style={styles.barColumn}>
                                        {item.ml > 0 && (
                                            <Text style={styles.barValue}>
                                                {Math.round(item.ml / 100) / 10}L
                                            </Text>
                                        )}
                                        <View
                                            style={{
                                                width: "100%",
                                                height: barHeight,
                                                borderRadius: 8,
                                                overflow: "hidden",
                                            }}
                                        >
                                            <LinearGradient
                                                colors={
                                                    isGoalMet
                                                        ? ["#10B981", "#059669"]
                                                        : ["#60A5FA", "#3B82F6"]
                                                }
                                                style={StyleSheet.absoluteFill}
                                            />
                                        </View>
                                    </View>
                                    <Text
                                        style={[styles.barDay, isGoalMet && styles.barDayCompleted]}
                                    >
                                        {item.day}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                        <Text style={styles.calendarTitle}>December 2024</Text>
                        <CalendarIcon size={20} color="#3B82F6" />
                    </View>

                    <View style={styles.calendarWeekDays}>
                        {weekDays.map((day) => (
                            <Text key={day} style={styles.calendarDayHeader}>
                                {day.slice(0, 1)}
                            </Text>
                        ))}
                    </View>

                    <View style={styles.calendarGrid}>
                        {calendarDays.map((day, index) => {
                            if (!day) {
                                return <View key={index} style={styles.calendarDayCell} />;
                            }

                            const isToday = day.day === new Date().getDate();
                            const hasLogs = day.ml > 0;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => {
                                        setSelectedCalendarDay(day.day);
                                        setSelectedDayDetails(day);
                                    }}
                                    style={styles.calendarDayCell}
                                >
                                    <View
                                        style={{
                                            width: "100%",
                                            aspectRatio: 1,
                                            borderRadius: 100,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: hasLogs ? "#3B82F6" : "transparent",
                                            borderWidth: isToday && !hasLogs ? 2 : 0,
                                            borderColor: "#3B82F6",
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                fontWeight: hasLogs ? "700" : isToday ? "700" : "500",
                                                color: hasLogs ? "#FFFFFF" : isToday ? "#3B82F6" : "#64748B",
                                            }}
                                        >
                                            {day.day}
                                        </Text>
                                        {day.logs && day.logs.length > 1 && (
                                            <Text style={{ fontSize: 8, fontWeight: "700", color: "#FFFFFF" }}>
                                                {day.logs.length}
                                            </Text>
                                        )}
                                    </View>
                                    {hasLogs && day.completed && (
                                        <View style={{ position: "absolute", bottom: 4 }}>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#FCD34D" }} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={styles.calendarLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendCircle, { backgroundColor: "#3B82F6" }]} />
                            <Text style={styles.legendText}>Logged</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendCircle, { backgroundColor: "transparent", borderWidth: 2, borderColor: "#3B82F6" }]} />
                            <Text style={styles.legendText}>Today</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: "#FCD34D" }]} />
                            <Text style={styles.legendText}>Goal Met</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Logs */}
                <View style={styles.recentLogsCard}>
                    <View style={styles.recentLogsHeader}>
                        <Text style={styles.recentLogsTitle}>Recent Logs</Text>
                        <View style={styles.logsCount}>
                            <Text style={styles.logsCountText}>
                                {waterLogs.filter(log => {
                                    const logDateStr = new Date(log.logged_at).toDateString();
                                    const todayStr = new Date().toDateString();
                                    return logDateStr === todayStr;
                                }).length} today
                            </Text>
                        </View>
                    </View>

                    {loading ? (
                        <Text style={styles.loadingText}>Loading...</Text>
                    ) : waterLogs.length === 0 ? (
                        <View style={styles.emptyLogs}>
                            <Droplets size={40} color="#CBD5E1" />
                            <Text style={styles.emptyLogsText}>No water logs yet</Text>
                            <Text style={styles.emptyLogsSubtext}>Start tracking your hydration!</Text>
                        </View>
                    ) : (
                        <View style={styles.logsList}>
                            {waterLogs.slice(0, 5).map((log, index) => {
                                const logTime = new Date(log.logged_at);
                                const isToday = logTime.toDateString() === new Date().toDateString();

                                return (
                                    <View key={log.id} style={styles.logItem}>
                                        <View style={styles.logIconContainer}>
                                            <View style={[styles.logIcon, { backgroundColor: isToday ? "#EFF6FF" : "#F9FAFB" }]}>
                                                <Droplets size={20} color={isToday ? "#3B82F6" : "#9CA3AF"} />
                                            </View>
                                        </View>
                                        <View style={styles.logDetails}>
                                            <Text style={styles.logAmount}>{log.amount_ml} ml</Text>
                                            <Text style={styles.logTime}>
                                                {logTime.toLocaleTimeString('en-US', {
                                                    hour: 'numeric',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })} • {logTime.toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </Text>
                                        </View>
                                        <View style={styles.logBadge}>
                                            <Text style={styles.logCups}>
                                                {Math.round(log.amount_ml / CUP_SIZE * 10) / 10} cups
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Hydration Insights */}
                <View style={styles.insightsCard}>
                    <Text style={styles.insightsTitle}>💧 Hydration Insights</Text>

                    <View style={styles.insightRow}>
                        <View style={styles.insightIcon}>
                            <Activity size={18} color="#3B82F6" />
                        </View>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightLabel}>Average Daily Intake</Text>
                            <Text style={styles.insightValue}>1,912 ml over 30 days</Text>
                        </View>
                    </View>

                    <View style={styles.insightRow}>
                        <View style={styles.insightIcon}>
                            <TrendingUp size={18} color="#10B981" />
                        </View>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightLabel}>Best Streak</Text>
                            <Text style={styles.insightValue}>
                                14 consecutive days in November
                            </Text>
                        </View>
                    </View>

                    <View style={styles.insightRow}>
                        <View style={styles.insightIcon}>
                            <Clock size={18} color="#F59E0B" />
                        </View>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightLabel}>Peak Hydration Time</Text>
                            <Text style={styles.insightValue}>Morning (8 AM - 11 AM)</Text>
                        </View>
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.tipsCard}>
                    <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
                    <Text style={styles.tipText}>
                        • Start your day with 500ml of water
                    </Text>
                    <Text style={styles.tipText}>
                        • Set hourly reminders throughout the day
                    </Text>
                    <Text style={styles.tipText}>• Track caffeine intake separately</Text>
                    <Text style={styles.tipText}>• Increase intake during exercise</Text>
                </View>
            </ScrollView>

            {/* Calendar Day Details Modal */}
            <Modal
                visible={selectedDayDetails !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedDayDetails(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedDayDetails(null)}
                >
                    <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                        {selectedDayDetails && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>Water Intake</Text>
                                        <Text style={styles.modalDate}>
                                            {new Date(selectedDayDetails.date).toLocaleDateString('en-US', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedDayDetails(null)}
                                        style={styles.modalCloseButton}
                                    >
                                        <X size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.modalStats}>
                                    <View style={styles.modalStatItem}>
                                        <Droplets size={32} color="#3B82F6" />
                                        <Text style={styles.modalStatValue}>
                                            {(selectedDayDetails.ml / 1000).toFixed(1)}L
                                        </Text>
                                        <Text style={styles.modalStatLabel}>Total Intake</Text>
                                    </View>
                                    <View style={styles.modalStatDivider} />
                                    <View style={styles.modalStatItem}>
                                        <Target size={32} color={selectedDayDetails.completed ? "#10B981" : "#F59E0B"} />
                                        <Text style={styles.modalStatValue}>
                                            {Math.round((selectedDayDetails.ml / DAILY_GOAL) * 100)}%
                                        </Text>
                                        <Text style={styles.modalStatLabel}>
                                            {selectedDayDetails.completed ? "Goal Met!" : "Of Goal"}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>
                                        Logs ({selectedDayDetails.logs?.length || 0})
                                    </Text>
                                    {selectedDayDetails.logs && selectedDayDetails.logs.length > 0 ? (
                                        <View style={styles.modalLogsList}>
                                            {selectedDayDetails.logs.map((log, index) => (
                                                <View key={log.id} style={styles.modalLogItem}>
                                                    <View style={styles.modalLogIcon}>
                                                        <Droplets size={16} color="#3B82F6" />
                                                    </View>
                                                    <View style={styles.modalLogDetails}>
                                                        <Text style={styles.modalLogAmount}>{log.amount_ml} ml</Text>
                                                        <Text style={styles.modalLogTime}>
                                                            {new Date(log.logged_at).toLocaleTimeString('en-US', {
                                                                hour: 'numeric',
                                                                minute: '2-digit',
                                                                hour12: true
                                                            })}
                                                        </Text>
                                                    </View>
                                                    <Text style={styles.modalLogCups}>
                                                        {Math.round(log.amount_ml / CUP_SIZE * 10) / 10} cups
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ) : (
                                        <Text style={styles.modalNoData}>No water logged this day</Text>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
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
        borderBottomColor: "#E5E7EB",
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
        marginBottom: 20,
        padding: 24,
        borderRadius: 20,
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
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    statCard: {
        width: "48%",
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    statHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    statIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    statChange: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    changeText: {
        fontSize: 11,
        fontWeight: "600",
    },
    statLabel: {
        fontSize: 12,
        color: "#6B7280",
        marginBottom: 4,
        fontWeight: "500",
    },
    statValue: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111827",
    },
    bottleCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 20,
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
        textShadowColor: "rgba(0, 0, 0, 0.1)",
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
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 12,
        gap: 10,
    },
    targetIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    targetLabel: {
        fontSize: 11,
        color: "#6B7280",
        fontWeight: "500",
    },
    targetValue: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1F2937",
    },
    quickAddContainer: {
        flexDirection: "row",
        gap: 12,
        marginHorizontal: 20,
        marginBottom: 20,
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
        borderWidth: 1,
        borderColor: "#E5E7EB",
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
    graphCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    graphHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    graphTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    achievementBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    achievementText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#F59E0B",
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
    calendarContainer: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    calendarWeekDays: {
        flexDirection: "row",
        marginBottom: 12,
    },
    calendarDayHeader: {
        flex: 1,
        textAlign: "center",
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        marginBottom: 16,
    },
    calendarDayCell: {
        width: "14.28%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 4,
    },
    calendarDayContent: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
    },
    calendarDaySelected: {
        backgroundColor: "#3B82F6",
    },
    calendarDayCompleted: {
        backgroundColor: "#ECFDF5",
    },
    calendarDayText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#6B7280",
    },
    calendarDayTextSelected: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    calendarDayTextCompleted: {
        color: "#10B981",
        fontWeight: "600",
    },
    calendarDot: {
        position: "absolute",
        bottom: 4,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: "#10B981",
    },
    calendarLegend: {
        flexDirection: "row",
        gap: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendCircle: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendText: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    insightsCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    insightsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16,
    },
    insightRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        marginBottom: 16,
    },
    insightIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
    },
    insightContent: {
        flex: 1,
    },
    insightLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    insightValue: {
        fontSize: 13,
        color: "#6B7280",
    },
    tipsCard: {
        backgroundColor: "#EFF6FF",
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 20,
        padding: 20,
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
    recentLogsCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    recentLogsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    recentLogsTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    logsCount: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    logsCountText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#3B82F6",
    },
    loadingText: {
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 14,
        paddingVertical: 20,
    },
    emptyLogs: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyLogsText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
        marginTop: 12,
    },
    emptyLogsSubtext: {
        fontSize: 14,
        color: "#9CA3AF",
        marginTop: 4,
    },
    logsList: {
        gap: 12,
    },
    logItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    logIconContainer: {
        justifyContent: "center",
        alignItems: "center",
    },
    logIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    logDetails: {
        flex: 1,
    },
    logAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 2,
    },
    logTime: {
        fontSize: 12,
        color: "#6B7280",
    },
    logBadge: {
        backgroundColor: "#EFF6FF",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    logCups: {
        fontSize: 11,
        fontWeight: "600",
        color: "#3B82F6",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
        width: "100%",
        maxHeight: "80%",
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    modalDate: {
        fontSize: 14,
        color: "#6B7280",
    },
    modalCloseButton: {
        padding: 4,
    },
    modalStats: {
        flexDirection: "row",
        backgroundColor: "#F9FAFB",
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    modalStatItem: {
        flex: 1,
        alignItems: "center",
    },
    modalStatDivider: {
        width: 1,
        backgroundColor: "#E5E7EB",
        marginHorizontal: 16,
    },
    modalStatValue: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 12,
        marginBottom: 4,
    },
    modalStatLabel: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },
    modalSection: {
        marginBottom: 8,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    modalLogsList: {
        gap: 8,
        maxHeight: 300,
    },
    modalLogItem: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        gap: 12,
    },
    modalLogIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#EFF6FF",
        justifyContent: "center",
        alignItems: "center",
    },
    modalLogDetails: {
        flex: 1,
    },
    modalLogAmount: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 2,
    },
    modalLogTime: {
        fontSize: 12,
        color: "#6B7280",
    },
    modalLogCups: {
        fontSize: 12,
        fontWeight: "600",
        color: "#3B82F6",
    },
    modalNoData: {
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 14,
        paddingVertical: 24,
    },
});



