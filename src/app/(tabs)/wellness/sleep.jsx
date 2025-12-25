import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    Modal,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    Moon,
    Sun,
    Star,
    Plus,
    TrendingUp,
    Calendar,
    Clock,
    Activity,
    BarChart3,
    Award,
    Zap,
} from "lucide-react-native";
import { supabase } from "../../../utils/supabaseClient";

const STORAGE_KEY = "@sleep_tracker_sessions";

export default function SleepTracker() {
    const insets = useSafeAreaInsets();
    const [sessions, setSessions] = useState([]);
    const [activeSession, setActiveSession] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showManualEntry, setShowManualEntry] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [userId, setUserId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [manualEntry, setManualEntry] = useState({
        date: new Date().toISOString().split("T")[0],
        startTime: "22:00",
        endTime: "06:00",
        quality: 3,
        notes: "",
    });

    // Animations
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    // Load sessions and userId from AsyncStorage
    useEffect(() => {
        loadUserAndSessions();
    }, []);

    // Pulse animation for active session
    useEffect(() => {
        if (activeSession) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ).start();
        }
    }, [activeSession]);

    // Update current time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const loadUserAndSessions = async () => {
        try {
            // Load user ID
            const storedUserId = await AsyncStorage.getItem("userId");
            if (storedUserId) {
                setUserId(storedUserId);

                // Load sleep data from Supabase
                await loadSleepFromSupabase(storedUserId);
            } else {
                // Load from AsyncStorage if no userId
                const data = await AsyncStorage.getItem(STORAGE_KEY);
                if (data) {
                    const parsed = JSON.parse(data);
                    setSessions(parsed.sessions || []);
                    setActiveSession(parsed.activeSession || null);
                }
            }
        } catch (error) {
            console.error("Error loading data:", error);
        }
    };

    const loadSleepFromSupabase = async (uid) => {
        try {
            console.log('[Sleep] Loading from Supabase for user:', uid);

            const { data, error } = await supabase
                .from('sleep_logs')
                .select('*')
                .eq('user_id', uid)
                .order('start_time', { ascending: false });

            if (error) {
                console.error('[Sleep] Error loading from Supabase:', error);
                return;
            }

            if (data && data.length > 0) {
                console.log('[Sleep] Loaded', data.length, 'sessions from Supabase');

                // Convert Supabase data to app format
                const loadedSessions = data.map(log => ({
                    id: log.id.toString(),
                    startTime: log.start_time,
                    endTime: log.end_time,
                    quality: log.quality_rating || 3,
                    notes: log.notes || "",
                    isActive: false,
                    supabase_id: log.id // Mark as already synced
                }));

                setSessions(loadedSessions);

                // Save to AsyncStorage for offline access
                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        sessions: loadedSessions,
                        activeSession: null,
                    }),
                );
            }
        } catch (error) {
            console.error('[Sleep] Failed to load from Supabase:', error);
        }
    };

    const saveSessions = async (newSessions, newActiveSession = null) => {
        try {
            // Save to AsyncStorage
            await AsyncStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    sessions: newSessions,
                    activeSession: newActiveSession,
                }),
            );
            setSessions(newSessions);
            setActiveSession(newActiveSession);

            // Sync to Supabase for completed sessions
            if (userId) {
                const completedSessions = newSessions.filter(s => !s.isActive && s.endTime);

                for (const session of completedSessions) {
                    // Check if already synced (skip if has a supabase_id)
                    if (session.supabase_id) continue;

                    try {
                        console.log('[Sleep] Syncing to Supabase:', session.id);

                        const { data, error } = await supabase
                            .from('sleep_logs')
                            .insert({
                                user_id: userId,
                                start_time: session.startTime,
                                end_time: session.endTime,
                                quality_rating: session.quality || 3,
                                notes: session.notes || null,
                            })
                            .select()
                            .single();

                        if (!error && data) {
                            // Mark as synced
                            session.supabase_id = data.id;
                            console.log('[Sleep] Synced successfully:', data.id);
                        } else {
                            console.error('[Sleep] Sync error:', error?.message || error);
                        }
                    } catch (syncError) {
                        console.error('[Sleep] Sync failed:', syncError?.message || syncError);
                    }
                }

                // Update sessions with supabase_ids
                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        sessions: newSessions,
                        activeSession: newActiveSession,
                    }),
                );
            }
        } catch (error) {
            console.error("Error saving sessions:", error);
        }
    };

    const startSleep = () => {
        const newSession = {
            id: Date.now().toString(),
            startTime: new Date().toISOString(),
            isActive: true,
        };
        setActiveSession(newSession);
        saveSessions(sessions, newSession);
    };

    const endSleep = (quality, notes) => {
        if (!activeSession) return;

        const completedSession = {
            ...activeSession,
            endTime: new Date().toISOString(),
            quality: quality || 3,
            notes: notes || "",
            isActive: false,
        };

        const newSessions = [completedSession, ...sessions];
        saveSessions(newSessions, null);
        setActiveSession(null);
    };

    const addManualEntry = () => {
        const startDateTime = new Date(
            `${manualEntry.date}T${manualEntry.startTime}`,
        );
        let endDateTime = new Date(`${manualEntry.date}T${manualEntry.endTime}`);

        if (endDateTime <= startDateTime) {
            endDateTime.setDate(endDateTime.getDate() + 1);
        }

        const newSession = {
            id: Date.now().toString(),
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            quality: manualEntry.quality,
            notes: manualEntry.notes,
            isActive: false,
        };

        const newSessions = [newSession, ...sessions];
        saveSessions(newSessions, activeSession);
        setShowManualEntry(false);
        setManualEntry({
            date: new Date().toISOString().split("T")[0],
            startTime: "22:00",
            endTime: "06:00",
            quality: 3,
            notes: "",
        });
    };

    const calculateDuration = (start, end) => {
        const startTime = new Date(start);
        const endTime = end ? new Date(end) : currentTime;
        const diff = endTime - startTime;
        return diff / (1000 * 60 * 60);
    };

    const formatDuration = (hours) => {
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        return `${h}h ${m}m`;
    };

    // Analytics calculations
    const completedSessions = sessions.filter((s) => !s.isActive && s.endTime);
    const last7Days = completedSessions.slice(0, 7);
    const last30Days = completedSessions.slice(0, 30);

    const avgSleep7Days =
        last7Days.length > 0
            ? last7Days.reduce(
                (acc, s) => acc + calculateDuration(s.startTime, s.endTime),
                0,
            ) / last7Days.length
            : 0;

    const avgSleep30Days =
        last30Days.length > 0
            ? last30Days.reduce(
                (acc, s) => acc + calculateDuration(s.startTime, s.endTime),
                0,
            ) / last30Days.length
            : 0;

    const avgQuality =
        completedSessions.filter((s) => s.quality).length > 0
            ? completedSessions
                .filter((s) => s.quality)
                .reduce((acc, s) => acc + s.quality, 0) /
            completedSessions.filter((s) => s.quality).length
            : 0;

    const bestSleep = completedSessions.reduce(
        (best, s) => {
            const duration = calculateDuration(s.startTime, s.endTime);
            return duration > best.duration ? { session: s, duration } : best;
        },
        { session: null, duration: 0 },
    );

    const worstSleep = completedSessions.reduce(
        (worst, s) => {
            const duration = calculateDuration(s.startTime, s.endTime);
            return worst.duration === 0 || duration < worst.duration
                ? { session: s, duration }
                : worst;
        },
        { session: null, duration: 0 },
    );

    const totalSleepTime = completedSessions.reduce(
        (acc, s) => acc + calculateDuration(s.startTime, s.endTime),
        0,
    );

    // Sleep consistency score (0-100)
    const calculateConsistency = () => {
        if (last7Days.length < 3) return 0;
        const durations = last7Days.map((s) =>
            calculateDuration(s.startTime, s.endTime),
        );
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const variance =
            durations.reduce((acc, d) => acc + Math.pow(d - avg, 2), 0) /
            durations.length;
        const stdDev = Math.sqrt(variance);
        return Math.max(0, Math.min(100, 100 - stdDev * 20));
    };

    const consistencyScore = calculateConsistency();

    return (
        <View
            style={{ flex: 1, backgroundColor: "#F8FAFC", paddingTop: insets.top }}
        >
            <StatusBar style="dark" />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View
                    style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}
                >
                    <Text
                        style={{
                            fontSize: 28,
                            fontWeight: "800",
                            color: "#1E293B",
                            marginBottom: 4,
                        }}
                    >
                        Sleep Tracker
                    </Text>
                    <Text style={{ fontSize: 14, color: "#64748B" }}>
                        {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </Text>
                </View>

                {/* Active Session or Start Button */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <View
                        style={{
                            backgroundColor: "white",
                            borderRadius: 20,
                            padding: 20,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 3,
                        }}
                    >
                        {activeSession ? (
                            <View style={{ alignItems: "center" }}>
                                <Animated.View
                                    style={{
                                        transform: [{ scale: pulseAnim }],
                                        marginBottom: 16,
                                    }}
                                >
                                    <View
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: 40,
                                            backgroundColor: "#6366F1",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Moon size={36} color="white" />
                                    </View>
                                </Animated.View>

                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 8,
                                    }}
                                >
                                    Sleeping...
                                </Text>
                                <Text
                                    style={{
                                        fontSize: 40,
                                        fontWeight: "800",
                                        color: "#6366F1",
                                        marginBottom: 4,
                                    }}
                                >
                                    {formatDuration(
                                        calculateDuration(activeSession.startTime, currentTime),
                                    )}
                                </Text>
                                <Text
                                    style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}
                                >
                                    Started at{" "}
                                    {new Date(activeSession.startTime).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </Text>

                                <TouchableOpacity
                                    onPress={() => {
                                        const quality = 3;
                                        const notes = "";
                                        endSleep(quality, notes);
                                    }}
                                    style={{
                                        width: "100%",
                                        backgroundColor: "#1E293B",
                                        paddingVertical: 16,
                                        borderRadius: 14,
                                        alignItems: "center",
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={{ color: "white", fontSize: 16, fontWeight: "700" }}
                                    >
                                        Wake Up & Log
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={{ alignItems: "center" }}>
                                <View
                                    style={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: 40,
                                        backgroundColor: "#FEF3C7",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginBottom: 16,
                                    }}
                                >
                                    <Sun size={36} color="#F59E0B" />
                                </View>

                                <Text
                                    style={{
                                        fontSize: 16,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 8,
                                    }}
                                >
                                    Ready for bed?
                                </Text>
                                <Text
                                    style={{ fontSize: 13, color: "#94A3B8", marginBottom: 20 }}
                                >
                                    Start tracking your sleep
                                </Text>

                                <TouchableOpacity
                                    onPress={startSleep}
                                    style={{
                                        width: "100%",
                                        backgroundColor: "#6366F1",
                                        paddingVertical: 16,
                                        borderRadius: 14,
                                        alignItems: "center",
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={{ color: "white", fontSize: 16, fontWeight: "700" }}
                                    >
                                        Start Sleeping
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>

                {/* Quick Stats */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 14,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    backgroundColor: "#EEF2FF",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 8,
                                }}
                            >
                                <Clock size={18} color="#6366F1" />
                            </View>
                            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                                Avg Sleep
                            </Text>
                            <Text
                                style={{ fontSize: 18, fontWeight: "800", color: "#1E293B" }}
                            >
                                {formatDuration(avgSleep7Days)}
                            </Text>
                        </View>

                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 14,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    backgroundColor: "#FEF3C7",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 8,
                                }}
                            >
                                <Star size={18} color="#F59E0B" />
                            </View>
                            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                                Quality
                            </Text>
                            <Text
                                style={{ fontSize: 18, fontWeight: "800", color: "#1E293B" }}
                            >
                                {avgQuality.toFixed(1)}/5
                            </Text>
                        </View>

                        <View
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 14,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    backgroundColor: "#F0FDF4",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginBottom: 8,
                                }}
                            >
                                <Zap size={18} color="#22C55E" />
                            </View>
                            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                                Consistency
                            </Text>
                            <Text
                                style={{ fontSize: 18, fontWeight: "800", color: "#1E293B" }}
                            >
                                {consistencyScore.toFixed(0)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                        <TouchableOpacity
                            onPress={() => setShowManualEntry(!showManualEntry)}
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderRadius: 14,
                                padding: 16,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                borderWidth: 2,
                                borderColor: showManualEntry ? "#6366F1" : "transparent",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                            activeOpacity={0.7}
                        >
                            <Plus size={20} color="#6366F1" />
                            <Text
                                style={{ fontSize: 14, fontWeight: "700", color: "#1E293B" }}
                            >
                                Add Entry
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowAnalytics(!showAnalytics)}
                            style={{
                                flex: 1,
                                backgroundColor: "white",
                                borderRadius: 14,
                                padding: 16,
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                borderWidth: 2,
                                borderColor: showAnalytics ? "#6366F1" : "transparent",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.05,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                            activeOpacity={0.7}
                        >
                            <BarChart3 size={20} color="#6366F1" />
                            <Text
                                style={{ fontSize: 14, fontWeight: "700", color: "#1E293B" }}
                            >
                                Analytics
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Manual Entry Form */}
                {showManualEntry && (
                    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                        <View
                            style={{
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: "#1E293B",
                                    marginBottom: 16,
                                }}
                            >
                                Add Sleep Entry
                            </Text>

                            <View style={{ marginBottom: 12 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 6,
                                    }}
                                >
                                    Date
                                </Text>
                                <TextInput
                                    value={manualEntry.date}
                                    onChangeText={(text) =>
                                        setManualEntry({ ...manualEntry, date: text })
                                    }
                                    placeholder="YYYY-MM-DD"
                                    style={{
                                        backgroundColor: "#F8FAFC",
                                        borderRadius: 10,
                                        padding: 12,
                                        fontSize: 14,
                                        color: "#1E293B",
                                    }}
                                />
                            </View>

                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "600",
                                            color: "#64748B",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Bedtime
                                    </Text>
                                    <TextInput
                                        value={manualEntry.startTime}
                                        onChangeText={(text) =>
                                            setManualEntry({ ...manualEntry, startTime: text })
                                        }
                                        placeholder="22:00"
                                        style={{
                                            backgroundColor: "#F8FAFC",
                                            borderRadius: 10,
                                            padding: 12,
                                            fontSize: 14,
                                            color: "#1E293B",
                                        }}
                                    />
                                </View>

                                <View style={{ flex: 1 }}>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "600",
                                            color: "#64748B",
                                            marginBottom: 6,
                                        }}
                                    >
                                        Wake Time
                                    </Text>
                                    <TextInput
                                        value={manualEntry.endTime}
                                        onChangeText={(text) =>
                                            setManualEntry({ ...manualEntry, endTime: text })
                                        }
                                        placeholder="06:00"
                                        style={{
                                            backgroundColor: "#F8FAFC",
                                            borderRadius: 10,
                                            padding: 12,
                                            fontSize: 14,
                                            color: "#1E293B",
                                        }}
                                    />
                                </View>
                            </View>

                            <View style={{ marginBottom: 12 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 6,
                                    }}
                                >
                                    Quality: {manualEntry.quality}/5
                                </Text>
                                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <TouchableOpacity
                                            key={rating}
                                            onPress={() =>
                                                setManualEntry({ ...manualEntry, quality: rating })
                                            }
                                            activeOpacity={0.7}
                                        >
                                            <Star
                                                size={28}
                                                color="#F59E0B"
                                                fill={
                                                    rating <= manualEntry.quality
                                                        ? "#F59E0B"
                                                        : "transparent"
                                                }
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 6,
                                    }}
                                >
                                    Notes
                                </Text>
                                <TextInput
                                    value={manualEntry.notes}
                                    onChangeText={(text) =>
                                        setManualEntry({ ...manualEntry, notes: text })
                                    }
                                    placeholder="How did you sleep?"
                                    multiline
                                    numberOfLines={3}
                                    style={{
                                        backgroundColor: "#F8FAFC",
                                        borderRadius: 10,
                                        padding: 12,
                                        fontSize: 14,
                                        color: "#1E293B",
                                        textAlignVertical: "top",
                                    }}
                                />
                            </View>

                            <TouchableOpacity
                                onPress={addManualEntry}
                                style={{
                                    backgroundColor: "#6366F1",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={{ color: "white", fontSize: 15, fontWeight: "700" }}
                                >
                                    Save Entry
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Analytics */}
                {showAnalytics && (
                    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                        <View
                            style={{
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: "#1E293B",
                                    marginBottom: 16,
                                }}
                            >
                                Detailed Analytics
                            </Text>

                            {/* Best & Worst Sleep */}
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#F0FDF4",
                                        borderRadius: 12,
                                        padding: 12,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 6,
                                            marginBottom: 6,
                                        }}
                                    >
                                        <Award size={16} color="#22C55E" />
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: "600",
                                                color: "#22C55E",
                                            }}
                                        >
                                            Best Sleep
                                        </Text>
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: "800",
                                            color: "#1E293B",
                                        }}
                                    >
                                        {bestSleep.session
                                            ? formatDuration(bestSleep.duration)
                                            : "N/A"}
                                    </Text>
                                    {bestSleep.session && (
                                        <Text
                                            style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}
                                        >
                                            {new Date(bestSleep.session.startTime).toLocaleDateString(
                                                "en-US",
                                                {
                                                    month: "short",
                                                    day: "numeric",
                                                },
                                            )}
                                        </Text>
                                    )}
                                </View>

                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor: "#FEF2F2",
                                        borderRadius: 12,
                                        padding: 12,
                                    }}
                                >
                                    <View
                                        style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 6,
                                            marginBottom: 6,
                                        }}
                                    >
                                        <Activity size={16} color="#EF4444" />
                                        <Text
                                            style={{
                                                fontSize: 11,
                                                fontWeight: "600",
                                                color: "#EF4444",
                                            }}
                                        >
                                            Shortest
                                        </Text>
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            fontWeight: "800",
                                            color: "#1E293B",
                                        }}
                                    >
                                        {worstSleep.session
                                            ? formatDuration(worstSleep.duration)
                                            : "N/A"}
                                    </Text>
                                    {worstSleep.session && (
                                        <Text
                                            style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}
                                        >
                                            {new Date(
                                                worstSleep.session.startTime,
                                            ).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                            })}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* 7 vs 30 Day Comparison */}
                            <View style={{ marginBottom: 16 }}>
                                <Text
                                    style={{
                                        fontSize: 13,
                                        fontWeight: "600",
                                        color: "#64748B",
                                        marginBottom: 8,
                                    }}
                                >
                                    Average Sleep Comparison
                                </Text>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 12,
                                        marginBottom: 6,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#64748B", width: 60 }}>
                                        7 days
                                    </Text>
                                    <View
                                        style={{
                                            flex: 1,
                                            height: 24,
                                            backgroundColor: "#F1F5F9",
                                            borderRadius: 12,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${Math.min((avgSleep7Days / 10) * 100, 100)}%`,
                                                height: "100%",
                                                backgroundColor: "#6366F1",
                                                borderRadius: 12,
                                            }}
                                        />
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "700",
                                            color: "#1E293B",
                                            width: 50,
                                        }}
                                    >
                                        {formatDuration(avgSleep7Days)}
                                    </Text>
                                </View>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 12,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#64748B", width: 60 }}>
                                        30 days
                                    </Text>
                                    <View
                                        style={{
                                            flex: 1,
                                            height: 24,
                                            backgroundColor: "#F1F5F9",
                                            borderRadius: 12,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${Math.min((avgSleep30Days / 10) * 100, 100)}%`,
                                                height: "100%",
                                                backgroundColor: "#8B5CF6",
                                                borderRadius: 12,
                                            }}
                                        />
                                    </View>
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: "700",
                                            color: "#1E293B",
                                            width: 50,
                                        }}
                                    >
                                        {formatDuration(avgSleep30Days)}
                                    </Text>
                                </View>
                            </View>

                            {/* Total Stats */}
                            <View
                                style={{
                                    backgroundColor: "#F8FAFC",
                                    borderRadius: 12,
                                    padding: 12,
                                }}
                            >
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#64748B" }}>
                                        Total Sleep Logged
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "700",
                                            color: "#1E293B",
                                        }}
                                    >
                                        {formatDuration(totalSleepTime)}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#64748B" }}>
                                        Total Sessions
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "700",
                                            color: "#1E293B",
                                        }}
                                    >
                                        {completedSessions.length}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent: "space-between",
                                    }}
                                >
                                    <Text style={{ fontSize: 12, color: "#64748B" }}>
                                        Consistency Score
                                    </Text>
                                    <Text
                                        style={{
                                            fontSize: 13,
                                            fontWeight: "700",
                                            color: "#1E293B",
                                        }}
                                    >
                                        {consistencyScore.toFixed(0)}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Recent Sessions */}
                <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                    {/* Sleep Calendar */}
                    <View
                        style={{
                            backgroundColor: "white",
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}>
                                Sleep Calendar
                            </Text>
                            <Calendar size={18} color="#6366F1" />
                        </View>

                        {/* Calendar Grid */}
                        <View>
                            {/* Day Labels */}
                            <View style={{ flexDirection: "row", marginBottom: 8 }}>
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                    <View key={day} style={{ flex: 1, alignItems: "center" }}>
                                        <Text style={{ fontSize: 11, color: "#64748B", fontWeight: "600" }}>
                                            {day}
                                        </Text>
                                    </View>
                                ))}
                            </View>

                            {/* Calendar Dates */}
                            {(() => {
                                const today = new Date();
                                const year = today.getFullYear();
                                const month = today.getMonth();
                                const firstDay = new Date(year, month, 1).getDay();
                                const daysInMonth = new Date(year, month + 1, 0).getDate();

                                const weeks = [];
                                let week = [];

                                // Fill empty days
                                for (let i = 0; i < firstDay; i++) {
                                    week.push(null);
                                }

                                // Fill days
                                for (let day = 1; day <= daysInMonth; day++) {
                                    week.push(day);
                                    if (week.length === 7) {
                                        weeks.push(week);
                                        week = [];
                                    }
                                }

                                // Fill remaining empty days
                                while (week.length > 0 && week.length < 7) {
                                    week.push(null);
                                }
                                if (week.length > 0) weeks.push(week);

                                return weeks.map((wk, weekIndex) => (
                                    <View key={weekIndex} style={{ flexDirection: "row", marginBottom: 6 }}>
                                        {wk.map((day, dayIndex) => {
                                            if (!day) {
                                                return <View key={dayIndex} style={{ flex: 1 }} />;
                                            }

                                            const dateStr = new Date(year, month, day).toDateString();
                                            const sessionsForDate = completedSessions.filter(s =>
                                                new Date(s.startTime).toDateString() === dateStr
                                            );
                                            const isToday = new Date().getDate() === day && new Date().getMonth() === month;

                                            return (
                                                <TouchableOpacity
                                                    key={dayIndex}
                                                    style={{
                                                        flex: 1,
                                                        aspectRatio: 1,
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        padding: 4,
                                                    }}
                                                    onPress={() => {
                                                        if (sessionsForDate.length > 0) {
                                                            setSelectedDate({
                                                                date: new Date(year, month, day),
                                                                sessions: sessionsForDate
                                                            });
                                                        }
                                                    }}
                                                    disabled={sessionsForDate.length === 0}
                                                >
                                                    <View
                                                        style={{
                                                            width: "100%",
                                                            aspectRatio: 1,
                                                            borderRadius: 100,
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            backgroundColor: sessionsForDate.length > 0
                                                                ? "#6366F1"
                                                                : "transparent",
                                                            borderWidth: isToday && sessionsForDate.length === 0 ? 2 : 0,
                                                            borderColor: "#6366F1",
                                                        }}
                                                    >
                                                        <Text
                                                            style={{
                                                                fontSize: 13,
                                                                fontWeight: sessionsForDate.length > 0 ? "700" : isToday ? "700" : "500",
                                                                color: sessionsForDate.length > 0 ? "#FFFFFF" : isToday ? "#6366F1" : "#64748B",
                                                            }}
                                                        >
                                                            {day}
                                                        </Text>
                                                        {sessionsForDate.length > 1 && (
                                                            <Text style={{ fontSize: 8, fontWeight: "700", color: "#FFFFFF" }}>
                                                                {sessionsForDate.length}
                                                            </Text>
                                                        )}
                                                    </View>
                                                    {sessionsForDate.length > 0 && (
                                                        <View style={{ position: "absolute", bottom: 4, }}>
                                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "#FCD34D" }} />
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                ));
                            })()}
                        </View>

                        <View style={{ marginTop: 12, flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: "#6366F1" }} />
                                <Text style={{ fontSize: 11, color: "#64748B" }}>Logged</Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: "#F1F5F9" }} />
                                <Text style={{ fontSize: 11, color: "#64748B" }}>Today</Text>
                            </View>
                        </View>
                    </View>

                    {/* Recent Sleep */}
                    <View
                        style={{
                            backgroundColor: "white",
                            borderRadius: 16,
                            padding: 16,
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 3,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: 16,
                            }}
                        >
                            <Text
                                style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}
                            >
                                Recent Sleep
                            </Text>
                            <TrendingUp size={18} color="#6366F1" />
                        </View>

                        {last7Days.length > 0 ? (
                            <View style={{ gap: 10 }}>
                                {last7Days.slice(0, 5).map((session) => (
                                    <View
                                        key={session.id}
                                        style={{
                                            backgroundColor: "#F8FAFC",
                                            borderRadius: 12,
                                            padding: 12,
                                            flexDirection: "row",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: "600",
                                                    color: "#1E293B",
                                                    marginBottom: 2,
                                                }}
                                            >
                                                {new Date(session.startTime).toLocaleDateString(
                                                    "en-US",
                                                    {
                                                        month: "short",
                                                        day: "numeric",
                                                    },
                                                )}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: "#64748B" }}>
                                                {new Date(session.startTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}{" "}
                                                -{" "}
                                                {new Date(session.endTime).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </Text>
                                        </View>

                                        <View style={{ alignItems: "flex-end" }}>
                                            <Text
                                                style={{
                                                    fontSize: 15,
                                                    fontWeight: "800",
                                                    color: "#6366F1",
                                                    marginBottom: 2,
                                                }}
                                            >
                                                {formatDuration(
                                                    calculateDuration(session.startTime, session.endTime),
                                                )}
                                            </Text>
                                            {session.quality && (
                                                <View style={{ flexDirection: "row", gap: 2 }}>
                                                    {Array.from({ length: session.quality }).map(
                                                        (_, i) => (
                                                            <Star
                                                                key={i}
                                                                size={10}
                                                                color="#F59E0B"
                                                                fill="#F59E0B"
                                                            />
                                                        ),
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <View style={{ alignItems: "center", paddingVertical: 24 }}>
                                <Moon size={32} color="#CBD5E1" />
                                <Text style={{ fontSize: 13, color: "#94A3B8", marginTop: 8 }}>
                                    No sleep sessions yet
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Quality Distribution */}
                {completedSessions.length > 0 && (
                    <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                        <View
                            style={{
                                backgroundColor: "white",
                                borderRadius: 16,
                                padding: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 8,
                                elevation: 3,
                            }}
                        >
                            <Text
                                style={{
                                    fontSize: 16,
                                    fontWeight: "700",
                                    color: "#1E293B",
                                    marginBottom: 16,
                                }}
                            >
                                Sleep Quality Distribution
                            </Text>

                            <View style={{ gap: 10 }}>
                                {[5, 4, 3, 2, 1].map((rating) => {
                                    const count = completedSessions.filter(
                                        (s) => s.quality === rating,
                                    ).length;
                                    const percentage =
                                        completedSessions.length > 0
                                            ? (count / completedSessions.length) * 100
                                            : 0;

                                    return (
                                        <View
                                            key={rating}
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 10,
                                            }}
                                        >
                                            <View style={{ flexDirection: "row", gap: 2, width: 60 }}>
                                                {Array.from({ length: rating }).map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        size={10}
                                                        color="#F59E0B"
                                                        fill="#F59E0B"
                                                    />
                                                ))}
                                            </View>

                                            <View
                                                style={{
                                                    flex: 1,
                                                    height: 20,
                                                    backgroundColor: "#F1F5F9",
                                                    borderRadius: 10,
                                                }}
                                            >
                                                <View
                                                    style={{
                                                        width: `${percentage}%`,
                                                        height: "100%",
                                                        backgroundColor: "#6366F1",
                                                        borderRadius: 10,
                                                    }}
                                                />
                                            </View>

                                            <Text
                                                style={{
                                                    fontSize: 13,
                                                    fontWeight: "700",
                                                    color: "#1E293B",
                                                    width: 30,
                                                    textAlign: "right",
                                                }}
                                            >
                                                {count}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Sleep Details Modal */}
            {selectedDate && (
                <Modal
                    visible={!!selectedDate}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setSelectedDate(null)}
                >
                    <TouchableOpacity
                        style={{
                            flex: 1,
                            backgroundColor: "rgba(0,0,0,0.5)",
                            justifyContent: "flex-end",
                        }}
                        activeOpacity={1}
                        onPress={() => setSelectedDate(null)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={{
                                backgroundColor: "white",
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                paddingBottom: insets.bottom || 20,
                            }}
                            onPress={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <View style={{
                                padding: 20,
                                borderBottomWidth: 1,
                                borderBottomColor: "#F1F5F9",
                            }}>
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                    <View>
                                        <Text style={{ fontSize: 20, fontWeight: "700", color: "#1E293B", marginBottom: 4 }}>
                                            Sleep Log
                                        </Text>
                                        <Text style={{ fontSize: 14, color: "#64748B" }}>
                                            {selectedDate.date.toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => setSelectedDate(null)}
                                        style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: 16,
                                            backgroundColor: "#F1F5F9",
                                            alignItems: "center",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Text style={{ fontSize: 18, color: "#64748B" }}>×</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Content */}
                            <ScrollView style={{ maxHeight: 400, padding: 20 }}>
                                <Text style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>
                                    {selectedDate.sessions.length} sleep {selectedDate.sessions.length === 1 ? 'log' : 'logs'} on this day
                                </Text>

                                {/* Loop through all sessions */}
                                {selectedDate.sessions.map((session, index) => (
                                    <View key={session.id} style={{ marginBottom: 20 }}>
                                        {selectedDate.sessions.length > 1 && (
                                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#6366F1", marginBottom: 8 }}>
                                                Log #{index + 1}
                                            </Text>
                                        )}

                                        {/* Duration */}
                                        <View style={{
                                            backgroundColor: "#EEF2FF",
                                            borderRadius: 16,
                                            padding: 16,
                                            marginBottom: 12,
                                        }}>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                                                <Moon size={20} color="#6366F1" />
                                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#6366F1" }}>
                                                    Sleep Duration
                                                </Text>
                                            </View>
                                            <Text style={{ fontSize: 32, fontWeight: "700", color: "#1E293B" }}>
                                                {formatDuration(calculateDuration(session.startTime, session.endTime))}
                                            </Text>
                                        </View>

                                        {/* Times */}
                                        <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                                            <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
                                                <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>Bedtime</Text>
                                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}>
                                                    {new Date(session.startTime).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
                                                <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>Wake Up</Text>
                                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B" }}>
                                                    {new Date(session.endTime).toLocaleTimeString('en-US', {
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Quality */}
                                        <View style={{
                                            backgroundColor: "#FFFBEB",
                                            borderRadius: 12,
                                            padding: 12,
                                            marginBottom: 12,
                                        }}>
                                            <Text style={{ fontSize: 11, color: "#92400E", marginBottom: 6, fontWeight: "600" }}>
                                                Sleep Quality
                                            </Text>
                                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                                                {[1, 2, 3, 4, 5].map((starNum) => (
                                                    <Star
                                                        key={starNum}
                                                        size={20}
                                                        fill={starNum <= (session.quality || 3) ? "#FBBF24" : "transparent"}
                                                        color="#FBBF24"
                                                    />
                                                ))}
                                                <Text style={{ fontSize: 14, fontWeight: "600", color: "#92400E", marginLeft: 8 }}>
                                                    {session.quality || 3} / 5
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Notes */}
                                        {session.notes && (
                                            <View style={{
                                                backgroundColor: "#F8FAFC",
                                                borderRadius: 12,
                                                padding: 12,
                                                marginBottom: 12,
                                            }}>
                                                <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 6, fontWeight: "600" }}>
                                                    Notes
                                                </Text>
                                                <Text style={{ fontSize: 14, color: "#1E293B", lineHeight: 20 }}>
                                                    {session.notes}
                                                </Text>
                                            </View>
                                        )}

                                        {/* Divider between multiple logs */}
                                        {index < selectedDate.sessions.length - 1 && (
                                            <View style={{ height: 1, backgroundColor: "#E2E8F0", marginTop: 8 }} />
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    );
}



