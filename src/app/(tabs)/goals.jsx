import { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Alert,
    Modal,
    RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    Plus,
    Target,
    CheckCircle,
    Circle,
    Flame,
    Sparkles,
    X,
    Trophy,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const GOAL_CATEGORIES = [
    { id: "wellness", label: "Wellness", color: "#4A9B7F", icon: "🧘" },
    { id: "mood", label: "Mood", color: "#F59E0B", icon: "😊" },
    { id: "social", label: "Social", color: "#EC4899", icon: "👥" },
    { id: "exercise", label: "Exercise", color: "#3B82F6", icon: "🏃" },
    { id: "sleep", label: "Sleep", color: "#8B5CF6", icon: "😴" },
    { id: "mindfulness", label: "Mindfulness", color: "#10B981", icon: "🧠" },
];

export default function GoalsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [goals, setGoals] = useState([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [newGoal, setNewGoal] = useState({
        title: "",
        category: "wellness",
        frequency: "daily",
    });

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        try {
            const stored = await AsyncStorage.getItem("userGoals");
            if (stored) {
                setGoals(JSON.parse(stored));
            }
        } catch (error) {
            console.error("Error loading goals:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const saveGoals = async (updatedGoals) => {
        try {
            await AsyncStorage.setItem("userGoals", JSON.stringify(updatedGoals));
            setGoals(updatedGoals);
        } catch (error) {
            console.error("Error saving goals:", error);
        }
    };

    const addGoal = () => {
        if (!newGoal.title.trim()) {
            Alert.alert("Error", "Please enter a goal title");
            return;
        }

        const goal = {
            id: Date.now().toString(),
            title: newGoal.title.trim(),
            category: newGoal.category,
            frequency: newGoal.frequency,
            streak: 0,
            completedToday: false,
            createdAt: new Date().toISOString(),
        };

        saveGoals([...goals, goal]);
        setNewGoal({ title: "", category: "wellness", frequency: "daily" });
        setShowAddModal(false);
    };

    const toggleGoalComplete = (goalId) => {
        const updated = goals.map((g) => {
            if (g.id === goalId) {
                return {
                    ...g,
                    completedToday: !g.completedToday,
                    streak: !g.completedToday ? g.streak + 1 : Math.max(0, g.streak - 1),
                };
            }
            return g;
        });
        saveGoals(updated);
    };

    const deleteGoal = (goalId) => {
        Alert.alert("Delete Goal", "Are you sure you want to delete this goal?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: () => saveGoals(goals.filter((g) => g.id !== goalId)),
            },
        ]);
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadGoals();
    };

    const getCategory = (id) => GOAL_CATEGORIES.find((c) => c.id === id) || GOAL_CATEGORIES[0];

    const completedCount = goals.filter((g) => g.completedToday).length;
    const totalCount = goals.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>My Goals</Text>
                    <Text style={styles.headerSubtitle}>Track your daily progress</Text>
                </View>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddModal(true)}
                >
                    <Plus size={22} color="#4A9B7F" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A9B7F" />}
            >
                {/* Progress Card */}
                <View style={styles.progressCard}>
                    <LinearGradient
                        colors={["#4A9B7F", "#3B8068"]}
                        style={styles.progressGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.progressHeader}>
                            <View style={styles.progressIconContainer}>
                                <Trophy size={24} color="#FFFFFF" />
                            </View>
                            <View style={styles.progressTextContainer}>
                                <Text style={styles.progressTitle}>Today's Progress</Text>
                                <Text style={styles.progressSubtitle}>
                                    {completedCount} of {totalCount} goals completed
                                </Text>
                            </View>
                            <Text style={styles.progressPercent}>{progressPercent}%</Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    { width: `${progressPercent}%` },
                                ]}
                            />
                        </View>
                    </LinearGradient>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: "#E6F4F0" }]}>
                        <Target size={20} color="#4A9B7F" />
                        <Text style={styles.statValue}>{totalCount}</Text>
                        <Text style={styles.statLabel}>Total Goals</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
                        <CheckCircle size={20} color="#F59E0B" />
                        <Text style={styles.statValue}>{completedCount}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: "#FCE7F3" }]}>
                        <Flame size={20} color="#EC4899" />
                        <Text style={styles.statValue}>
                            {goals.reduce((max, g) => Math.max(max, g.streak || 0), 0)}
                        </Text>
                        <Text style={styles.statLabel}>Best Streak</Text>
                    </View>
                </View>

                {/* Goals List */}
                <View style={styles.goalsSection}>
                    <Text style={styles.sectionTitle}>Your Goals</Text>

                    {goals.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIcon}>
                                <Target size={40} color="#9CA3AF" />
                            </View>
                            <Text style={styles.emptyTitle}>No goals yet</Text>
                            <Text style={styles.emptyText}>
                                Set your first wellness goal to start tracking your progress
                            </Text>
                            <TouchableOpacity
                                style={styles.emptyButton}
                                onPress={() => setShowAddModal(true)}
                            >
                                <LinearGradient
                                    colors={["#4A9B7F", "#3B8068"]}
                                    style={styles.emptyButtonGradient}
                                >
                                    <Plus size={18} color="#FFFFFF" />
                                    <Text style={styles.emptyButtonText}>Add Your First Goal</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        goals.map((goal) => {
                            const category = getCategory(goal.category);
                            return (
                                <TouchableOpacity
                                    key={goal.id}
                                    style={[
                                        styles.goalCard,
                                        goal.completedToday && styles.goalCardCompleted
                                    ]}
                                    onPress={() => toggleGoalComplete(goal.id)}
                                    onLongPress={() => deleteGoal(goal.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.goalCheck, goal.completedToday && styles.goalCheckActive]}>
                                        {goal.completedToday ? (
                                            <CheckCircle size={26} color="#4A9B7F" />
                                        ) : (
                                            <Circle size={26} color="#D1D5DB" />
                                        )}
                                    </View>
                                    <View style={styles.goalContent}>
                                        <Text
                                            style={[
                                                styles.goalTitle,
                                                goal.completedToday && styles.goalTitleCompleted,
                                            ]}
                                        >
                                            {goal.title}
                                        </Text>
                                        <View style={styles.goalMeta}>
                                            <View style={[styles.categoryBadge, { backgroundColor: category.color + "15" }]}>
                                                <Text style={{ fontSize: 12 }}>{category.icon}</Text>
                                                <Text style={[styles.categoryText, { color: category.color }]}>
                                                    {category.label}
                                                </Text>
                                            </View>
                                            {goal.streak > 0 && (
                                                <View style={styles.streakBadge}>
                                                    <Flame size={14} color="#F59E0B" />
                                                    <Text style={styles.streakText}>{goal.streak}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Floating Add Button */}
            {goals.length > 0 && (
                <TouchableOpacity
                    style={[styles.fab, { bottom: insets.bottom + 90 }]}
                    onPress={() => setShowAddModal(true)}
                >
                    <LinearGradient
                        colors={["#4A9B7F", "#3B8068"]}
                        style={styles.fabGradient}
                    >
                        <Plus size={24} color="#FFFFFF" />
                    </LinearGradient>
                </TouchableOpacity>
            )}

            {/* Add Goal Modal */}
            <Modal visible={showAddModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Goal</Text>
                            <TouchableOpacity
                                style={styles.modalClose}
                                onPress={() => setShowAddModal(false)}
                            >
                                <X size={20} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalIcon}>
                            <Sparkles size={32} color="#4A9B7F" />
                        </View>

                        <Text style={styles.inputLabel}>What's your goal?</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g., Meditate for 10 minutes"
                            placeholderTextColor="#9CA3AF"
                            value={newGoal.title}
                            onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                        />

                        <Text style={styles.inputLabel}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.categoriesRow}>
                                {GOAL_CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryOption,
                                            newGoal.category === cat.id && {
                                                backgroundColor: cat.color,
                                                borderColor: cat.color,
                                            },
                                        ]}
                                        onPress={() => setNewGoal({ ...newGoal, category: cat.id })}
                                    >
                                        <Text style={{ fontSize: 18 }}>{cat.icon}</Text>
                                        <Text
                                            style={[
                                                styles.categoryOptionText,
                                                newGoal.category === cat.id && { color: "#FFFFFF" },
                                            ]}
                                        >
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.saveButton} onPress={addGoal}>
                            <LinearGradient
                                colors={["#4A9B7F", "#3B8068"]}
                                style={styles.saveButtonGradient}
                            >
                                <Plus size={18} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Add Goal</Text>
                            </LinearGradient>
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
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E6F4F0",
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    progressCard: {
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 16,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    progressGradient: {
        padding: 20,
    },
    progressHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    progressIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    progressTextContainer: {
        flex: 1,
        marginLeft: 12,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    progressSubtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    progressPercent: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 4,
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 4,
    },
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 6,
    },
    statLabel: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 2,
    },
    goalsSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 14,
    },
    emptyState: {
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 32,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        marginTop: 8,
        marginBottom: 20,
        lineHeight: 20,
    },
    emptyButton: {
        borderRadius: 14,
        overflow: "hidden",
    },
    emptyButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 14,
        gap: 8,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
    goalCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    goalCardCompleted: {
        backgroundColor: "#F0FDF4",
        borderWidth: 1,
        borderColor: "#4A9B7F20",
    },
    goalCheck: {
        marginRight: 14,
        justifyContent: "center",
    },
    goalCheckActive: {},
    goalContent: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 15,
        fontWeight: "500",
        color: "#1F2937",
        marginBottom: 8,
    },
    goalTitleCompleted: {
        textDecorationLine: "line-through",
        color: "#9CA3AF",
    },
    goalMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    categoryBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: "500",
    },
    streakBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    streakText: {
        fontSize: 12,
        color: "#F59E0B",
        fontWeight: "600",
    },
    fab: {
        position: "absolute",
        right: 20,
        borderRadius: 28,
        shadowColor: "#4A9B7F",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    fabGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
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
    modalClose: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    modalIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#E6F4F0",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: "#F9FAFB",
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: "#1F2937",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginBottom: 20,
    },
    categoriesRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 24,
    },
    categoryOption: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 6,
    },
    categoryOptionText: {
        fontSize: 13,
        fontWeight: "500",
        color: "#4B5563",
    },
    saveButton: {
        borderRadius: 14,
        overflow: "hidden",
    },
    saveButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
});
