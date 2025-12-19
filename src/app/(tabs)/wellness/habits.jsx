import { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    Alert,
    Modal,
    Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Check, Trash2, X, Star } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";

const PRESET_HABITS = [
    { title: "Read 15 mins", icon: "📖", color: "#60A5FA" },
    { title: "Meditate", icon: "🧘", color: "#A78BFA" },
    { title: "Walk", icon: "🚶", color: "#34D399" },
    { title: "No Sugar", icon: "🍬", color: "#F472B6" },
    { title: "Journal", icon: "✍️", color: "#FBBF24" },
];

export default function HabitsTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { habits: habitsData, updateHabits } = useWellness();
    const habits = habitsData.list;
    const completedIds = habitsData.logs.find(l => l.date === new Date().toDateString())?.completedIds || [];

    const [showAddModal, setShowAddModal] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState("");
    const [showConfetti, setShowConfetti] = useState(false);

    // Animation for confetti
    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    useEffect(() => {
        if (habits.length === 0) {
            const defaults = PRESET_HABITS.map((h, i) => ({
                id: Date.now().toString() + i,
                ...h
            }));
            updateHabits(defaults, null);
        }
    }, []);

    const toggleHabit = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let newCompleted = [];
        if (completedIds.includes(id)) {
            newCompleted = completedIds.filter(c => c !== id);
        } else {
            newCompleted = [...completedIds, id];
            // Trigger confetti if all habits completed
            if (habits.length > 0 && newCompleted.length === habits.length) {
                triggerConfetti();
            }
        }

        const today = new Date().toDateString();
        let logs = [...habitsData.logs];
        const todayIndex = logs.findIndex(l => l.date === today);

        if (todayIndex >= 0) {
            logs[todayIndex] = { ...logs[todayIndex], completedIds: newCompleted };
        } else {
            logs.unshift({ date: today, completedIds: newCompleted });
        }

        updateHabits(null, logs);
    };

    const addNewHabit = async () => {
        if (!newHabitTitle.trim()) return;

        const newHabit = {
            id: Date.now().toString(),
            title: newHabitTitle,
            icon: "✨", // Default icon
            color: PRESET_HABITS[Math.floor(Math.random() * PRESET_HABITS.length)].color
        };

        updateHabits([...habits, newHabit], null);
        setNewHabitTitle("");
        setShowAddModal(false);
    };

    const deleteHabit = async (id) => {
        Alert.alert(
            "Delete Habit",
            "Are you sure you want to delete this habit?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const updatedHabits = habits.filter(h => h.id !== id);
                        updateHabits(updatedHabits, null);
                    }
                }
            ]
        );
    };

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim) => {
            anim.y.setValue(0);
            anim.x.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: 300 + Math.random() * 200,
                    duration: 1500 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: (Math.random() - 0.5) * 200,
                    duration: 1500 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowConfetti(false), 3000);
    };

    const completionRate = habits.length > 0 ? Math.round((completedIds.length / habits.length) * 100) : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Confetti Overlay */}
            {showConfetti && (
                <View style={styles.confettiContainer}>
                    {confettiAnims.map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: ["#F87171", "#60A5FA", "#34D399", "#FBBF24"][i % 4],
                                    transform: [
                                        { translateY: anim.y },
                                        { translateX: anim.x },
                                        { rotate: `${Math.random() * 360}deg` }
                                    ],
                                    opacity: anim.opacity,
                                    left: "50%",
                                    top: -20,
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
                <Text style={styles.headerTitle}>Daily Habits</Text>
                <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.addButton}>
                    <Plus size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Progress Card */}
                <LinearGradient
                    colors={["#6366F1", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.progressCard}
                >
                    <View style={styles.progressInfo}>
                        <View>
                            <Text style={styles.progressTitle}>Your Progress</Text>
                            <Text style={styles.progressSubtitle}>
                                {completedIds.length} of {habits.length} completed today
                            </Text>
                        </View>
                        <View style={styles.percentageCircle}>
                            <Text style={styles.percentageText}>{completionRate}%</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
                    </View>
                </LinearGradient>

                {/* Habits List */}
                <View style={styles.habitsList}>
                    {habits.map((habit) => {
                        const isCompleted = completedIds.includes(habit.id);
                        return (
                            <TouchableOpacity
                                key={habit.id}
                                style={[
                                    styles.habitCard,
                                    isCompleted && styles.habitCardCompleted
                                ]}
                                onPress={() => toggleHabit(habit.id)}
                                onLongPress={() => deleteHabit(habit.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.habitIcon,
                                    { backgroundColor: isCompleted ? "#FFFFFF" : habit.color + "20" }
                                ]}>
                                    <Text style={{ fontSize: 20 }}>{habit.icon}</Text>
                                </View>
                                <Text style={[
                                    styles.habitTitle,
                                    isCompleted && styles.habitTitleCompleted
                                ]}>
                                    {habit.title}
                                </Text>
                                <View style={[
                                    styles.checkbox,
                                    isCompleted && { backgroundColor: habit.color, borderColor: habit.color }
                                ]}>
                                    {isCompleted && <Check size={14} color="#FFFFFF" />}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {habits.length === 0 && (
                    <View style={styles.emptyState}>
                        <Star size={48} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No habits yet. Start small!</Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => setShowAddModal(true)}
                        >
                            <Text style={styles.emptyButtonText}>Add your first habit</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Add Habit Modal */}
            <Modal
                visible={showAddModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Habit</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <X size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Drink water, Read book..."
                            value={newHabitTitle}
                            onChangeText={setNewHabitTitle}
                            autoFocus
                        />

                        <View style={styles.presetContainer}>
                            <Text style={styles.presetLabel}>Suggestions:</Text>
                            <View style={styles.presetTags}>
                                {PRESET_HABITS.map((h, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.presetTag}
                                        onPress={() => setNewHabitTitle(h.title)}
                                    >
                                        <Text style={styles.presetTagText}>{h.icon} {h.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.createButton}
                            onPress={addNewHabit}
                        >
                            <Text style={styles.createButtonText}>Create Habit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E0E7FF",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    progressCard: {
        margin: 20,
        padding: 24,
        borderRadius: 24,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    progressTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 6,
    },
    progressSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
    },
    percentageCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
    },
    percentageText: {
        color: "#FFFFFF",
        fontWeight: "800",
        fontSize: 18,
    },
    progressBarBg: {
        height: 10,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 5,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 5,
    },
    habitsList: {
        paddingHorizontal: 20,
        gap: 16,
    },
    habitCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 18,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(243, 244, 246, 0.6)",
    },
    habitCardCompleted: {
        backgroundColor: "#F0FDF4",
        borderColor: "#DCFCE7",
    },
    habitIcon: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    habitTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 2,
    },
    habitStreak: {
        fontSize: 12,
        color: "#6B7280",
        fontWeight: "500",
    },
    habitTitleCompleted: {
        color: "#15803D",
        textDecorationLine: "line-through",
        opacity: 0.7,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 60,
        gap: 16,
    },
    emptyText: {
        fontSize: 16,
        color: "#9CA3AF",
    },
    emptyButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "#1F2937",
        borderRadius: 24,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 24,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    input: {
        backgroundColor: "#F3F4F6",
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        marginBottom: 20,
    },
    presetContainer: {
        marginBottom: 24,
    },
    presetLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        marginBottom: 12,
    },
    presetTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    presetTag: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    presetTagText: {
        color: "#4B5563",
        fontSize: 14,
    },
    createButton: {
        backgroundColor: "#4F46E5",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
    },
    createButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    confettiContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
