import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Check, Flame, RotateCcw } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import api from "../../../utils/api";

const DEFAULT_HABITS = [
    { id: "water", label: "Drink Water", emoji: "💧", color: "#3B82F6" },
    { id: "exercise", label: "Exercise", emoji: "🏃", color: "#22C55E" },
    { id: "meditate", label: "Meditate", emoji: "🧘", color: "#8B5CF6" },
    { id: "sleep", label: "8h Sleep", emoji: "😴", color: "#6366F1" },
    { id: "read", label: "Read", emoji: "📚", color: "#F59E0B" },
    { id: "journal", label: "Journal", emoji: "📝", color: "#EC4899" },
    { id: "walk", label: "Take a Walk", emoji: "🚶", color: "#14B8A6" },
    { id: "healthy", label: "Eat Healthy", emoji: "🥗", color: "#84CC16" },
];

export default function HabitsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [completed, setCompleted] = useState([]);
    const [weekData, setWeekData] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) return;

            const habits = await api.fetchHabits(userId);
            const today = new Date().toISOString().split('T')[0];

            const todayCompletedIds = [];
            habits.forEach(h => {
                let dates = h.completed_dates || [];
                if (typeof dates === 'string') try { dates = JSON.parse(dates); } catch (e) { }
                if (Array.isArray(dates) && dates.includes(today)) {
                    const def = DEFAULT_HABITS.find(d => d.label === h.habit_name);
                    if (def) todayCompletedIds.push(def.id);
                }
            });
            setCompleted(todayCompletedIds);

            // Week Data
            const week = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const dStr = d.toISOString().split('T')[0];

                let count = 0;
                habits.forEach(h => {
                    let dates = h.completed_dates || [];
                    if (typeof dates === 'string') try { dates = JSON.parse(dates); } catch (e) { }
                    if (Array.isArray(dates) && dates.includes(dStr)) count++;
                });

                week.push({
                    day: d.toLocaleDateString('en', { weekday: 'short' }),
                    count,
                    isToday: i === 0,
                });
            }
            setWeekData(week);

        } catch (e) { console.error(e); }
    };

    const toggleHabit = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        const newCompleted = completed.includes(id)
            ? completed.filter(h => h !== id)
            : [...completed, id];
        setCompleted(newCompleted);

        // Sync to Supabase
        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
            const habit = DEFAULT_HABITS.find(h => h.id === id);
            if (habit) {
                const isDone = newCompleted.includes(id);
                api.syncHabit(userId, id, habit.label, isDone);
            }
        }
    };

    const resetToday = async () => {
        const toReset = [...completed];
        setCompleted([]);

        const userId = await AsyncStorage.getItem("userId");
        if (userId) {
            for (const id of toReset) {
                const habit = DEFAULT_HABITS.find(h => h.id === id);
                if (habit) api.syncHabit(userId, id, habit.label, false);
            }
        }
    };

    const progress = completed.length / DEFAULT_HABITS.length;
    const bottomPad = insets.bottom + 90;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)/home")}>
                    <ArrowLeft size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>✅ Daily Habits</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={resetToday}>
                    <RotateCcw size={18} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottomPad }}>
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <View style={styles.progressHeader}>
                        <View>
                            <Text style={styles.progressTitle}>Today's Progress</Text>
                            <Text style={styles.progressSubtitle}>{completed.length} of {DEFAULT_HABITS.length} completed</Text>
                        </View>
                        <View style={styles.progressCircle}>
                            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
                        </View>
                    </View>
                    <View style={styles.progressBar}>
                        <LinearGradient
                            colors={["#4A9B7F", "#22C55E"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.progressFill, { width: `${progress * 100}%` }]}
                        />
                    </View>
                </View>

                {/* Habit List */}
                <View style={styles.habitsCard}>
                    <Text style={styles.cardTitle}>Habits</Text>
                    {DEFAULT_HABITS.map(habit => {
                        const isDone = completed.includes(habit.id);
                        return (
                            <TouchableOpacity
                                key={habit.id}
                                style={[styles.habitRow, isDone && styles.habitRowDone]}
                                onPress={() => toggleHabit(habit.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.checkbox, isDone && { backgroundColor: habit.color, borderColor: habit.color }]}>
                                    {isDone && <Check size={16} color="#FFF" strokeWidth={3} />}
                                </View>
                                <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                                <Text style={[styles.habitLabel, isDone && styles.habitLabelDone]}>{habit.label}</Text>
                                {isDone && <Text style={styles.doneText}>✓</Text>}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Week Overview */}
                <View style={styles.weekCard}>
                    <View style={styles.weekHeader}>
                        <Text style={styles.cardTitle}>This Week</Text>
                        <View style={styles.streakBadge}>
                            <Flame size={14} color="#F59E0B" />
                            <Text style={styles.streakText}>{weekData.filter(d => d.count >= 4).length} great days</Text>
                        </View>
                    </View>
                    <View style={styles.weekGrid}>
                        {weekData.map((d, i) => (
                            <View key={i} style={styles.weekDay}>
                                <View style={[
                                    styles.weekDot,
                                    d.count >= 6 && styles.weekDotGreen,
                                    d.count >= 3 && d.count < 6 && styles.weekDotYellow,
                                    d.count > 0 && d.count < 3 && styles.weekDotOrange,
                                    d.isToday && styles.weekDotToday,
                                ]}>
                                    <Text style={styles.weekDotText}>{d.count}</Text>
                                </View>
                                <Text style={[styles.weekDayLabel, d.isToday && styles.weekDayToday]}>{d.day}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F0FDF4" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#DCFCE7",
    },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
    resetBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0FDF4", alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    progressCard: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#22C55E",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    progressTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
    progressSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    progressCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#E6F4F0",
        alignItems: "center",
        justifyContent: "center",
    },
    progressPercent: { fontSize: 14, fontWeight: "800", color: "#4A9B7F" },
    progressBar: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 5, overflow: "hidden" },
    progressFill: { height: "100%", borderRadius: 5 },

    habitsCard: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
    habitRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        marginBottom: 8,
        gap: 12,
    },
    habitRowDone: { backgroundColor: "#F0FDF4" },
    checkbox: {
        width: 26,
        height: 26,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        alignItems: "center",
        justifyContent: "center",
    },
    habitEmoji: { fontSize: 20 },
    habitLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: "#1F2937" },
    habitLabelDone: { textDecorationLine: "line-through", color: "#9CA3AF" },
    doneText: { fontSize: 14, fontWeight: "700", color: "#22C55E" },

    weekCard: {
        backgroundColor: "#FFF",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    weekHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    streakBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    streakText: { fontSize: 12, fontWeight: "600", color: "#D97706" },
    weekGrid: { flexDirection: "row", justifyContent: "space-between" },
    weekDay: { alignItems: "center" },
    weekDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#E5E7EB",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 4,
    },
    weekDotGreen: { backgroundColor: "#22C55E" },
    weekDotYellow: { backgroundColor: "#F59E0B" },
    weekDotOrange: { backgroundColor: "#FB923C" },
    weekDotToday: { borderWidth: 2, borderColor: "#1F2937" },
    weekDotText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
    weekDayLabel: { fontSize: 10, color: "#6B7280" },
    weekDayToday: { fontWeight: "700", color: "#1F2937" },
});
