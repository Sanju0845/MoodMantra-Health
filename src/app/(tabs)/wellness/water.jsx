import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Droplets, Plus, Minus, RotateCcw } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

const GOAL = 8; // 8 glasses default

export default function WaterScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [glasses, setGlasses] = useState(0);
    const [goal, setGoal] = useState(GOAL);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const today = new Date().toDateString();
            const saved = await AsyncStorage.getItem(`water_${today}`);
            if (saved) setGlasses(parseInt(saved));
        } catch (e) { }
    };

    const saveData = async (count) => {
        try {
            const today = new Date().toDateString();
            await AsyncStorage.setItem(`water_${today}`, count.toString());
        } catch (e) { }
    };

    const addGlass = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        const newCount = glasses + 1;
        setGlasses(newCount);
        saveData(newCount);
    };

    const removeGlass = () => {
        if (glasses > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            const newCount = glasses - 1;
            setGlasses(newCount);
            saveData(newCount);
        }
    };

    const reset = () => {
        setGlasses(0);
        saveData(0);
    };

    const progress = Math.min(glasses / goal, 1);
    const bottomPad = insets.bottom + 90;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.push("/(tabs)/home")}>
                    <ArrowLeft size={22} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.title}>💧 Water Intake</Text>
                <TouchableOpacity style={styles.resetBtn} onPress={reset}>
                    <RotateCcw size={18} color="#6B7280" />
                </TouchableOpacity>
            </View>

            <View style={[styles.content, { paddingBottom: bottomPad }]}>
                {/* Progress Circle */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressOuter}>
                        <LinearGradient
                            colors={progress >= 1 ? ["#22C55E", "#16A34A"] : ["#3B82F6", "#2563EB"]}
                            style={[styles.progressFill, { height: `${progress * 100}%` }]}
                        />
                        <View style={styles.progressContent}>
                            <Droplets size={40} color={progress >= 1 ? "#22C55E" : "#3B82F6"} />
                            <Text style={styles.glassesCount}>{glasses}</Text>
                            <Text style={styles.glassesLabel}>of {goal} glasses</Text>
                        </View>
                    </View>
                </View>

                {/* Progress Text */}
                <Text style={styles.progressText}>
                    {progress >= 1
                        ? "🎉 Goal reached! Great job!"
                        : `${goal - glasses} more to reach your goal`}
                </Text>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity style={styles.controlBtn} onPress={removeGlass}>
                        <Minus size={28} color="#6B7280" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={addGlass} activeOpacity={0.8}>
                        <LinearGradient colors={["#3B82F6", "#2563EB"]} style={styles.addBtn}>
                            <Plus size={32} color="#FFF" />
                            <Text style={styles.addBtnText}>Add Glass</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.controlBtn} onPress={removeGlass}>
                        <Minus size={28} color="#6B7280" />
                    </TouchableOpacity>
                </View>

                {/* Quick Add */}
                <View style={styles.quickAdd}>
                    {[1, 2, 3, 4].map(n => (
                        <TouchableOpacity
                            key={n}
                            style={styles.quickBtn}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                                const newCount = glasses + n;
                                setGlasses(newCount);
                                saveData(newCount);
                            }}
                        >
                            <Text style={styles.quickBtnText}>+{n}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tip */}
                <View style={styles.tipCard}>
                    <Text style={styles.tipText}>💡 Drinking enough water improves focus, energy, and mood!</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F0F9FF" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0F2FE",
    },
    backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0F9FF", alignItems: "center", justifyContent: "center" },
    resetBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#F0F9FF", alignItems: "center", justifyContent: "center" },
    title: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
    content: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },

    progressContainer: { alignItems: "center", marginBottom: 24 },
    progressOuter: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: "#E0F2FE",
        overflow: "hidden",
        justifyContent: "flex-end",
        borderWidth: 4,
        borderColor: "#3B82F6",
    },
    progressFill: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 100,
    },
    progressContent: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        alignItems: "center",
        justifyContent: "center",
    },
    glassesCount: { fontSize: 48, fontWeight: "800", color: "#1E40AF", marginTop: 8 },
    glassesLabel: { fontSize: 14, color: "#3B82F6", fontWeight: "500" },

    progressText: { fontSize: 16, color: "#1E40AF", textAlign: "center", fontWeight: "600", marginBottom: 32 },

    controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 },
    controlBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "#FFF",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    addBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 30,
        gap: 8,
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    addBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },

    quickAdd: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 24 },
    quickBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: "#FFF",
        borderWidth: 1.5,
        borderColor: "#3B82F6",
    },
    quickBtnText: { fontSize: 14, fontWeight: "600", color: "#3B82F6" },

    tipCard: {
        backgroundColor: "#DBEAFE",
        borderRadius: 12,
        padding: 16,
        alignItems: "center",
    },
    tipText: { fontSize: 13, color: "#1E40AF", textAlign: "center", fontWeight: "500" },
});
