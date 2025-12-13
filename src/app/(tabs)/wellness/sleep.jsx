import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Moon, Sun, Clock, TrendingUp } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const HOURS = [5, 6, 7, 8, 9, 10, 11, 12];

export default function SleepScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [bedtime, setBedtime] = useState("22:00");
    const [wakeTime, setWakeTime] = useState("06:00");
    const [sleepHours, setSleepHours] = useState(8);
    const [weekData, setWeekData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const today = new Date().toDateString();
            const saved = await AsyncStorage.getItem(`sleep_${today}`);
            if (saved) {
                const data = JSON.parse(saved);
                setBedtime(data.bedtime || "22:00");
                setWakeTime(data.wakeTime || "06:00");
                setSleepHours(data.hours || 8);
            }
            // Load week data
            const week = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dayData = await AsyncStorage.getItem(`sleep_${d.toDateString()}`);
                week.push({
                    day: d.toLocaleDateString('en', { weekday: 'short' }),
                    hours: dayData ? JSON.parse(dayData).hours : 0,
                });
            }
            setWeekData(week);
        } catch (e) { }
    };

    const saveData = async (hours) => {
        try {
            const today = new Date().toDateString();
            await AsyncStorage.setItem(`sleep_${today}`, JSON.stringify({
                bedtime, wakeTime, hours,
            }));
            loadData();
        } catch (e) { }
    };

    const adjustHours = (delta) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        const newHours = Math.max(0, Math.min(12, sleepHours + delta));
        setSleepHours(newHours);
        saveData(newHours);
    };

    const selectHours = (h) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        setSleepHours(h);
        saveData(h);
    };

    const getQuality = () => {
        if (sleepHours >= 7 && sleepHours <= 9) return { label: "Great", color: "#22C55E", emoji: "😊" };
        if (sleepHours >= 6) return { label: "Okay", color: "#F59E0B", emoji: "😐" };
        return { label: "Poor", color: "#EF4444", emoji: "😴" };
    };

    const quality = getQuality();
    const avgHours = weekData.length > 0
        ? (weekData.reduce((s, d) => s + d.hours, 0) / weekData.filter(d => d.hours > 0).length || 0).toFixed(1)
        : 0;
    const bottomPad = insets.bottom + 90;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)/home")}>
                    <ArrowLeft size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>😴 Sleep Log</Text>
                <View style={{ width: 38 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottomPad }}>
                {/* Today's Sleep */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Last Night's Sleep</Text>

                    <View style={styles.hoursDisplay}>
                        <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustHours(-0.5)}>
                            <Text style={styles.adjustBtnText}>−</Text>
                        </TouchableOpacity>
                        <View style={styles.hoursCenter}>
                            <Text style={[styles.hoursNumber, { color: quality.color }]}>{sleepHours}</Text>
                            <Text style={styles.hoursLabel}>hours</Text>
                        </View>
                        <TouchableOpacity style={styles.adjustBtn} onPress={() => adjustHours(0.5)}>
                            <Text style={styles.adjustBtnText}>+</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Quality Badge */}
                    <View style={[styles.qualityBadge, { backgroundColor: quality.color + "20" }]}>
                        <Text style={styles.qualityEmoji}>{quality.emoji}</Text>
                        <Text style={[styles.qualityText, { color: quality.color }]}>{quality.label} Sleep</Text>
                    </View>

                    {/* Quick Select */}
                    <View style={styles.quickSelect}>
                        {HOURS.map(h => (
                            <TouchableOpacity
                                key={h}
                                style={[styles.quickHour, sleepHours === h && styles.quickHourActive]}
                                onPress={() => selectHours(h)}
                            >
                                <Text style={[styles.quickHourText, sleepHours === h && styles.quickHourTextActive]}>{h}h</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Week Chart */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>This Week</Text>
                        <View style={styles.avgBadge}>
                            <TrendingUp size={14} color="#4A9B7F" />
                            <Text style={styles.avgText}>Avg: {avgHours}h</Text>
                        </View>
                    </View>

                    <View style={styles.weekChart}>
                        {weekData.map((d, i) => (
                            <View key={i} style={styles.weekBar}>
                                <View style={styles.barContainer}>
                                    <LinearGradient
                                        colors={d.hours >= 7 ? ["#8B5CF6", "#A78BFA"] : ["#9CA3AF", "#D1D5DB"]}
                                        style={[styles.bar, { height: `${(d.hours / 12) * 100}%` }]}
                                    />
                                </View>
                                <Text style={styles.barHours}>{d.hours || "-"}</Text>
                                <Text style={styles.barDay}>{d.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Tips */}
                <View style={styles.tipCard}>
                    <Moon size={20} color="#8B5CF6" />
                    <Text style={styles.tipText}>Adults need 7-9 hours of sleep for optimal health.</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FAF5FF" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3E8FF",
    },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FAF5FF", alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    card: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 16 },

    hoursDisplay: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 },
    adjustBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#F3E8FF",
        alignItems: "center",
        justifyContent: "center",
    },
    adjustBtnText: { fontSize: 24, fontWeight: "700", color: "#8B5CF6" },
    hoursCenter: { alignItems: "center", marginHorizontal: 30 },
    hoursNumber: { fontSize: 64, fontWeight: "800" },
    hoursLabel: { fontSize: 14, color: "#6B7280" },

    qualityBadge: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
        marginBottom: 16,
    },
    qualityEmoji: { fontSize: 20 },
    qualityText: { fontSize: 15, fontWeight: "600" },

    quickSelect: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
    quickHour: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    quickHourActive: { backgroundColor: "#8B5CF6", borderColor: "#8B5CF6" },
    quickHourText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
    quickHourTextActive: { color: "#FFF" },

    avgBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#E6F4F0", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    avgText: { fontSize: 12, fontWeight: "600", color: "#4A9B7F" },

    weekChart: { flexDirection: "row", justifyContent: "space-between", height: 120 },
    weekBar: { alignItems: "center", flex: 1 },
    barContainer: { flex: 1, width: 24, backgroundColor: "#F3E8FF", borderRadius: 12, overflow: "hidden", justifyContent: "flex-end" },
    bar: { width: "100%", borderRadius: 12 },
    barHours: { fontSize: 11, fontWeight: "600", color: "#6B7280", marginTop: 4 },
    barDay: { fontSize: 10, color: "#9CA3AF" },

    tipCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3E8FF",
        borderRadius: 12,
        padding: 14,
        gap: 10,
    },
    tipText: { flex: 1, fontSize: 13, color: "#6B21A8", fontWeight: "500" },
});
