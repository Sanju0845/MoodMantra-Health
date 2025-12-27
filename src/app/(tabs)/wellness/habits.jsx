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
    PanResponder,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
    ArrowLeft,
    Plus,
    Check,
    Trash2,
    X,
    Star,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";

const { width, height } = Dimensions.get("window");

const PRESET_HABITS = [
    { title: "Read 15 mins", icon: "📖", color: "#3B82F6" },
    { title: "Meditate", icon: "🧘", color: "#8B5CF6" },
    { title: "Walk", icon: "🚶", color: "#10B981" },
    { title: "No Sugar", icon: "🍬", color: "#EC4899" },
    { title: "Journal", icon: "✍️", color: "#F59E0B" },
];

// Swipeable Habit Card Component
const SwipeableHabitCard = ({
    habit,
    isCompleted,
    onToggle,
    onDelete,
    isRevealed,
    onReveal,
    onHide,
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [isDeleting, setIsDeleting] = useState(false);

    // Auto-hide when another card is revealed
    useEffect(() => {
        if (!isRevealed) {
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
        }
    }, [isRevealed]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 20;
            },
            onPanResponderGrant: () => {
                // Hide other revealed cards when starting to swipe this one
                onHide();
            },
            onPanResponderMove: (_, gestureState) => {
                const maxSwipe = 80;
                if (gestureState.dx < 0) {
                    translateX.setValue(Math.max(gestureState.dx, -maxSwipe));
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (Math.abs(gestureState.dx) > 50) {
                    // Reveal delete button
                    Animated.spring(translateX, {
                        toValue: -80,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }).start();
                    onReveal(habit.id);
                } else {
                    // Spring back
                    Animated.spring(translateX, {
                        toValue: 0,
                        tension: 50,
                        friction: 8,
                        useNativeDriver: true,
                    }).start();
                    onHide();
                }
            },
        }),
    ).current;

    const handleDelete = () => {
        setIsDeleting(true);
        Animated.timing(translateX, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onDelete();
        });
    };

    const handleCardPress = () => {
        // If swiped, close it
        if (isRevealed) {
            Animated.spring(translateX, {
                toValue: 0,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }).start();
            onHide();
        } else {
            // Toggle habit immediately (no delay)
            onToggle();

            // Quick visual feedback animation
            Animated.sequence([
                Animated.spring(scaleAnim, {
                    toValue: 0.95,
                    tension: 300,
                    friction: 15,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 200,
                    friction: 10,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    return (
        <View style={styles.swipeableContainer}>
            <View style={styles.deleteButtonContainer}>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                    activeOpacity={0.8}
                >
                    <Trash2 size={18} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <Animated.View
                style={[styles.habitCardWrapper, { transform: [{ translateX }] }]}
                {...panResponder.panHandlers}
            >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                        style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
                        onPress={handleCardPress}
                        activeOpacity={1}
                        disabled={isDeleting}
                    >
                        <View
                            style={[
                                styles.habitIcon,
                                {
                                    backgroundColor: isCompleted ? "#FFFFFF" : habit.color + "20",
                                },
                            ]}
                        >
                            <Text style={{ fontSize: 20 }}>{habit.icon}</Text>
                        </View>
                        <Text
                            style={[
                                styles.habitTitle,
                                isCompleted && styles.habitTitleCompleted,
                            ]}
                        >
                            {habit.title}
                        </Text>
                        <View
                            style={[
                                styles.checkbox,
                                isCompleted && {
                                    backgroundColor: habit.color,
                                    borderColor: habit.color,
                                },
                            ]}
                        >
                            {isCompleted && <Check size={14} color="#FFFFFF" />}
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </View>
    );
};

export default function HabitsTracker() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { habits: habitsData, updateHabits } = useWellness();
    const habits = habitsData.list;

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [newHabitTitle, setNewHabitTitle] = useState("");
    const [showConfetti, setShowConfetti] = useState(false);
    const [revealedCardId, setRevealedCardId] = useState(null);

    const selectedDateString = selectedDate.toDateString();
    const completedIds =
        habitsData.logs.find((l) => l.date === selectedDateString)?.completedIds ||
        [];

    // Optimized confetti - 25 particles spawning across screen
    const confettiAnims = useRef(
        Array.from({ length: 25 }, () => {
            const startX = Math.random() * width; // Random start position
            return {
                x: new Animated.Value(startX),
                y: new Animated.Value(0),
                opacity: new Animated.Value(1),
                rotate: new Animated.Value(0),
                startX, // Store for reset
            };
        }),
    ).current;

    const toggleHabit = async (id) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        let newCompleted = [];
        if (completedIds.includes(id)) {
            newCompleted = completedIds.filter((c) => c !== id);
        } else {
            newCompleted = [...completedIds, id];
            // Trigger confetti if all habits completed
            if (habits.length > 0 && newCompleted.length === habits.length) {
                // Delay confetti slightly to reduce lag
                setTimeout(() => triggerConfetti(), 100);
            }
        }

        let logs = [...habitsData.logs];
        const todayIndex = logs.findIndex((l) => l.date === selectedDateString);

        if (todayIndex >= 0) {
            logs[todayIndex] = { ...logs[todayIndex], completedIds: newCompleted };
        } else {
            logs.unshift({ date: selectedDateString, completedIds: newCompleted });
        }

        updateHabits(null, logs);
    };

    const addNewHabit = async () => {
        if (!newHabitTitle.trim()) return;

        const newHabit = {
            id: Date.now().toString(),
            title: newHabitTitle,
            icon: "✨",
            color:
                PRESET_HABITS[Math.floor(Math.random() * PRESET_HABITS.length)].color,
        };

        updateHabits([...habits, newHabit], null);
        setNewHabitTitle("");
        setShowAddModal(false);
    };

    const deleteHabit = async (id) => {
        const updatedHabits = habits.filter((h) => h.id !== id);
        updateHabits(updatedHabits, null);
    };

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim, index) => {
            // Reset position to top of screen
            anim.x.setValue(anim.startX);
            anim.y.setValue(-100); // Start above screen
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);

            const delay = index * 20;

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: height + 100, // Fall to bottom of screen
                    duration: 2000 + Math.random() * 800,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: Math.random() * 720,
                    duration: 2000 + Math.random() * 800,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2500,
                    delay,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowConfetti(false), 3500);
    };

    // Calendar functions
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysCount = new Date(year, month + 1, 0).getDate();

        const days = [];

        // Add empty cells for days before month starts (Monday as first day)
        const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
        for (let i = 0; i < adjustedFirstDay; i++) {
            days.push(null);
        }

        // Add actual days
        for (let day = 1; day <= daysCount; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    const getHabitsForDate = (date) => {
        if (!date) return 0;
        const dateString = date.toDateString();
        const log = habitsData.logs.find((l) => l.date === dateString);
        return log?.completedIds?.length || 0;
    };

    const completionRate =
        habits.length > 0
            ? Math.round((completedIds.length / habits.length) * 100)
            : 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Confetti Overlay - now spawns across entire top */}
            {showConfetti && (
                <View style={styles.confettiContainer}>
                    {confettiAnims.map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: [
                                        "#F87171",
                                        "#60A5FA",
                                        "#34D399",
                                        "#FBBF24",
                                        "#A78BFA",
                                        "#FB923C",
                                    ][i % 6],
                                    transform: [
                                        { translateY: anim.y },
                                        { translateX: anim.x },
                                        {
                                            rotate: anim.rotate.interpolate({
                                                inputRange: [0, 720],
                                                outputRange: ["0deg", "720deg"],
                                            }),
                                        },
                                    ],
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
                <Text style={styles.headerTitle}>Daily Habits</Text>
                <TouchableOpacity
                    onPress={() => setShowAddModal(true)}
                    style={styles.addButton}
                >
                    <Plus size={24} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                onScroll={() => setRevealedCardId(null)}
                scrollEventThrottle={16}
            >
                {/* Calendar Section */}
                <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity
                            onPress={() =>
                                setCurrentMonth(
                                    new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth() - 1,
                                    ),
                                )
                            }
                            style={styles.monthButton}
                        >
                            <ChevronLeft size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                        <View style={styles.monthInfo}>
                            <Text style={styles.monthTitle}>
                                {currentMonth.toLocaleDateString("en-US", {
                                    month: "long",
                                    year: "numeric",
                                })}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() =>
                                setCurrentMonth(
                                    new Date(
                                        currentMonth.getFullYear(),
                                        currentMonth.getMonth() + 1,
                                    ),
                                )
                            }
                            style={styles.monthButton}
                        >
                            <ChevronRight size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday Headers */}
                    <View style={styles.weekdayHeader}>
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                            <View key={i} style={styles.weekdayCell}>
                                <Text style={styles.weekdayText}>{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                        {getDaysInMonth(currentMonth).map((day, index) => {
                            if (!day)
                                return <View key={`empty-${index}`} style={styles.dayCell} />;

                            const isToday = day.toDateString() === new Date().toDateString();
                            const isSelected =
                                day.toDateString() === selectedDate.toDateString();
                            const habitsCount = getHabitsForDate(day);
                            const hasHabits = habitsCount > 0;

                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    style={styles.dayCell}
                                    onPress={() => setSelectedDate(day)}
                                    activeOpacity={0.7}
                                >
                                    <View
                                        style={[
                                            styles.dayCircle,
                                            isToday && styles.dayCircleToday,
                                            isSelected && styles.dayCircleSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayNumber,
                                                isSelected && styles.dayNumberSelected,
                                                isToday && !isSelected && styles.dayNumberToday,
                                            ]}
                                        >
                                            {day.getDate()}
                                        </Text>
                                    </View>
                                    {hasHabits && (
                                        <View style={styles.habitIndicator}>
                                            <Text style={styles.habitIndicatorText}>
                                                {habitsCount}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Selected Date Info */}
                <View style={styles.selectedDateInfo}>
                    <CalendarIcon size={18} color="#6B7280" />
                    <Text style={styles.selectedDateText}>
                        {selectedDate.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </Text>
                </View>

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
                                {completedIds.length} of {habits.length} completed
                            </Text>
                        </View>
                        <View style={styles.percentageCircle}>
                            <Text style={styles.percentageText}>{completionRate}%</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View
                            style={[styles.progressBarFill, { width: `${completionRate}%` }]}
                        />
                    </View>
                </LinearGradient>

                {/* Habits List */}
                <View style={styles.habitsList}>
                    {habits.map((habit) => {
                        const isCompleted = completedIds.includes(habit.id);
                        return (
                            <SwipeableHabitCard
                                key={habit.id}
                                habit={habit}
                                isCompleted={isCompleted}
                                onToggle={() => toggleHabit(habit.id)}
                                onDelete={() => deleteHabit(habit.id)}
                                isRevealed={revealedCardId === habit.id}
                                onReveal={(id) => setRevealedCardId(id)}
                                onHide={() => setRevealedCardId(null)}
                            />
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
                                        <Text style={styles.presetTagText}>
                                            {h.icon} {h.title}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity style={styles.createButton} onPress={addNewHabit}>
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
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#EEF2FF",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.5,
    },
    // Calendar Styles
    calendarSection: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginTop: 12,
        marginBottom: 16,
        padding: 20,
        borderRadius: 24,
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    monthButton: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: "#F8FAFC",
    },
    monthInfo: {
        alignItems: "center",
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.3,
    },
    weekdayHeader: {
        flexDirection: "row",
        marginBottom: 16,
    },
    weekdayCell: {
        flex: 1,
        alignItems: "center",
    },
    weekdayText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
        letterSpacing: 0.5,
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: "14.28%",
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    dayCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    dayCircleToday: {
        backgroundColor: "#DBEAFE",
    },
    dayCircleSelected: {
        backgroundColor: "#3B82F6",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    dayNumber: {
        fontSize: 15,
        fontWeight: "600",
        color: "#334155",
    },
    dayNumberToday: {
        color: "#3B82F6",
        fontWeight: "700",
    },
    dayNumberSelected: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    habitIndicator: {
        position: "absolute",
        top: 4,
        right: 8,
        backgroundColor: "#10B981",
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 5,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 10,
    },
    habitIndicatorText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    selectedDateInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    selectedDateText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#475569",
    },
    progressCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 24,
        borderRadius: 28,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    progressTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    progressSubtitle: {
        fontSize: 15,
        color: "rgba(255,255,255,0.95)",
        fontWeight: "600",
    },
    percentageCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 3,
        borderColor: "rgba(255,255,255,0.4)",
    },
    percentageText: {
        color: "#FFFFFF",
        fontWeight: "900",
        fontSize: 20,
    },
    progressBarBg: {
        height: 12,
        backgroundColor: "rgba(255,255,255,0.25)",
        borderRadius: 6,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 6,
        shadowColor: "#FFFFFF",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    habitsList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    swipeableContainer: {
        marginBottom: 12,
        position: "relative",
    },
    deleteButtonContainer: {
        position: "absolute",
        right: 8,
        top: 0,
        bottom: 0,
        width: 60,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButton: {
        backgroundColor: "#EF4444",
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#EF4444",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    habitCardWrapper: {
        width: "100%",
        overflow: "hidden",
        zIndex: 1,
        backgroundColor: "#F8FAFC",
    },
    habitCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 22,
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
        borderWidth: 1.5,
        borderColor: "#F1F5F9",
    },
    habitCardCompleted: {
        backgroundColor: "#F0FDF4",
        borderColor: "#BBF7D0",
        shadowColor: "#10B981",
        shadowOpacity: 0.1,
    },
    habitIcon: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    habitTitle: {
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#0F172A",
        letterSpacing: -0.3,
    },
    habitTitleCompleted: {
        color: "#16A34A",
        textDecorationLine: "line-through",
        opacity: 0.75,
    },
    checkbox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2.5,
        borderColor: "#CBD5E1",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 12,
    },
    emptyState: {
        alignItems: "center",
        marginTop: 80,
        gap: 20,
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 17,
        color: "#64748B",
        textAlign: "center",
        fontWeight: "500",
    },
    emptyButton: {
        paddingHorizontal: 28,
        paddingVertical: 14,
        backgroundColor: "#0F172A",
        borderRadius: 28,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        justifyContent: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 28,
        padding: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#0F172A",
        letterSpacing: -0.5,
    },
    input: {
        backgroundColor: "#F8FAFC",
        padding: 18,
        borderRadius: 18,
        fontSize: 16,
        marginBottom: 24,
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
        color: "#0F172A",
    },
    presetContainer: {
        marginBottom: 28,
    },
    presetLabel: {
        fontSize: 15,
        fontWeight: "700",
        color: "#475569",
        marginBottom: 14,
    },
    presetTags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    presetTag: {
        backgroundColor: "#F1F5F9",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: "#E2E8F0",
    },
    presetTagText: {
        color: "#334155",
        fontSize: 15,
        fontWeight: "600",
    },
    createButton: {
        backgroundColor: "#3B82F6",
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: "center",
        shadowColor: "#3B82F6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    createButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: 0.2,
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
        width: 14,
        height: 14,
        borderRadius: 7,
    },
});



