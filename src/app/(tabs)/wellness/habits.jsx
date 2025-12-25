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
import { ArrowLeft, Plus, Check, Trash2, X, Star, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useWellness } from "@/context/WellnessContext";

const { width } = Dimensions.get("window");

const PRESET_HABITS = [
    { title: "Read 15 mins", icon: "📖", color: "#60A5FA" },
    { title: "Meditate", icon: "🧘", color: "#A78BFA" },
    { title: "Walk", icon: "🚶", color: "#34D399" },
    { title: "No Sugar", icon: "🍬", color: "#F472B6" },
    { title: "Journal", icon: "✍️", color: "#FBBF24" },
];

// Swipeable Habit Card Component
const SwipeableHabitCard = ({ habit, isCompleted, onToggle, onDelete, isRevealed, onReveal, onHide }) => {
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
        })
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
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.8}>
                    <Trash2 size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <Animated.View style={[styles.habitCardWrapper, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                        style={[
                            styles.habitCard,
                            isCompleted && styles.habitCardCompleted
                        ]}
                        onPress={handleCardPress}
                        activeOpacity={1}
                        disabled={isDeleting}
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
    const completedIds = habitsData.logs.find(l => l.date === selectedDateString)?.completedIds || [];

    // Animation for confetti - larger and smoother
    const confettiAnims = useRef(
        Array.from({ length: 60 }, () => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            opacity: new Animated.Value(1),
            rotate: new Animated.Value(0),
        }))
    ).current;

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

        let logs = [...habitsData.logs];
        const todayIndex = logs.findIndex(l => l.date === selectedDateString);

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
            color: PRESET_HABITS[Math.floor(Math.random() * PRESET_HABITS.length)].color
        };

        updateHabits([...habits, newHabit], null);
        setNewHabitTitle("");
        setShowAddModal(false);
    };

    const deleteHabit = async (id) => {
        const updatedHabits = habits.filter(h => h.id !== id);
        updateHabits(updatedHabits, null);
    };

    const triggerConfetti = () => {
        setShowConfetti(true);
        confettiAnims.forEach((anim, index) => {
            anim.y.setValue(0);
            anim.x.setValue(0);
            anim.opacity.setValue(1);
            anim.rotate.setValue(0);

            const delay = index * 15; // Stagger the confetti

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: 500 + Math.random() * 300,
                    duration: 2500 + Math.random() * 1000,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: (Math.random() - 0.5) * 400,
                    duration: 2500 + Math.random() * 1000,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: Math.random() * 720,
                    duration: 2500 + Math.random() * 1000,
                    delay,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 3000,
                    delay,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => setShowConfetti(false), 4000);
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
        const log = habitsData.logs.find(l => l.date === dateString);
        return log?.completedIds?.length || 0;
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
                                    backgroundColor: ["#F87171", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#FB923C"][i % 6],
                                    transform: [
                                        { translateY: anim.y },
                                        { translateX: anim.x },
                                        {
                                            rotate: anim.rotate.interpolate({
                                                inputRange: [0, 720],
                                                outputRange: ['0deg', '720deg']
                                            })
                                        }
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
                onScroll={() => setRevealedCardId(null)}
                scrollEventThrottle={16}
            >
                {/* Calendar Section */}
                <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} style={styles.monthButton}>
                            <ChevronLeft size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                        <View style={styles.monthInfo}>
                            <Text style={styles.monthTitle}>
                                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} style={styles.monthButton}>
                            <ChevronRight size={20} color="#4A9B7F" />
                        </TouchableOpacity>
                    </View>

                    {/* Weekday Headers */}
                    <View style={styles.weekdayHeader}>
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                            <View key={i} style={styles.weekdayCell}>
                                <Text style={styles.weekdayText}>{day}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                        {getDaysInMonth(currentMonth).map((day, index) => {
                            if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;

                            const isToday = day.toDateString() === new Date().toDateString();
                            const isSelected = day.toDateString() === selectedDate.toDateString();
                            const habitsCount = getHabitsForDate(day);
                            const hasHabits = habitsCount > 0;

                            return (
                                <TouchableOpacity
                                    key={day.toISOString()}
                                    style={styles.dayCell}
                                    onPress={() => setSelectedDate(day)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.dayCircle, isToday && styles.dayCircleToday, isSelected && styles.dayCircleSelected]}>
                                        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected, isToday && !isSelected && styles.dayNumberToday]}>
                                            {day.getDate()}
                                        </Text>
                                    </View>
                                    {hasHabits && (
                                        <View style={styles.habitIndicator}>
                                            <Text style={styles.habitIndicatorText}>{habitsCount}</Text>
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
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                        <View style={[styles.progressBarFill, { width: `${completionRate}%` }]} />
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
        backgroundColor: "#FFFFFF",
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
    // Calendar Styles
    calendarSection: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 20,
        marginTop: 8,
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    calendarHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    monthButton: {
        padding: 8,
    },
    monthInfo: {
        alignItems: "center",
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
    },
    weekdayHeader: {
        flexDirection: "row",
        marginBottom: 12,
    },
    weekdayCell: {
        flex: 1,
        alignItems: "center",
    },
    weekdayText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    calendarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
    },
    dayCell: {
        width: "14.28%",
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
    },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
    },
    dayCircleToday: {
        backgroundColor: "#D1FAE5",
    },
    dayCircleSelected: {
        backgroundColor: "#4A9B7F",
    },
    dayNumber: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    dayNumberToday: {
        color: "#4A9B7F",
        fontWeight: "700",
    },
    dayNumberSelected: {
        color: "#FFFFFF",
        fontWeight: "700",
    },
    habitIndicator: {
        position: "absolute",
        top: 2,
        right: 8,
        backgroundColor: "#14B8A6",
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 4,
    },
    habitIndicatorText: {
        fontSize: 9,
        fontWeight: "700",
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
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
    },
    progressCard: {
        marginHorizontal: 20,
        marginBottom: 20,
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
        gap: 12,
    },
    swipeableContainer: {
        marginBottom: 12,
        position: "relative",
    },
    deleteButtonContainer: {
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 80,
        justifyContent: "center",
        alignItems: "center",
    },
    deleteButton: {
        backgroundColor: "#EF4444",
        width: 64,
        height: "100%",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    habitCardWrapper: {
        width: "100%",
        overflow: "hidden",
        zIndex: 1,
        backgroundColor: "#FFFFFF",
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
        flex: 1,
        fontSize: 17,
        fontWeight: "700",
        color: "#1F2937",
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
        width: 14,
        height: 14,
        borderRadius: 7,
    },
});
