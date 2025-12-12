import { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Dimensions,
    Animated,
    PanResponder,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
    Calendar,
    Mic,
    Image as ImageIcon,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    Activity,
    Sparkles,
    Save,
    ChevronRight,
    Clock,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_PADDING = 40;
const SLIDER_WIDTH = SCREEN_WIDTH - SLIDER_PADDING * 2 - 40;
const THUMB_SIZE = 40;

// Mood emojis for slider
const MOODS = [
    { id: 1, emoji: "😫", label: "Terrible", backendLabel: "very_sad", value: 1, color: "#EF4444" },
    { id: 2, emoji: "😢", label: "Bad", backendLabel: "sad", value: 2, color: "#F97316" },
    { id: 3, emoji: "😐", label: "Okay", backendLabel: "neutral", value: 3, color: "#EAB308" },
    { id: 4, emoji: "😊", label: "Good", backendLabel: "happy", value: 4, color: "#84CC16" },
    { id: 5, emoji: "🤩", label: "Amazing", backendLabel: "very_happy", value: 5, color: "#22C55E" },
];

// Tags for mood entry
const TAGS = [
    { id: "stressed", label: "Stressed", icon: "😰", color: "#EF4444" },
    { id: "anxious", label: "Anxious", icon: "😨", color: "#F97316" },
    { id: "crying", label: "Crying", icon: "😭", color: "#8B5CF6" },
    { id: "lonely", label: "Lonely", icon: "🥺", color: "#6366F1" },
    { id: "tired", label: "Tired", icon: "😴", color: "#64748B" },
    { id: "angry", label: "Angry", icon: "😡", color: "#DC2626" },
    { id: "grateful", label: "Grateful", icon: "🙏", color: "#10B981" },
    { id: "hopeful", label: "Hopeful", icon: "✨", color: "#F59E0B" },
    { id: "peaceful", label: "Peaceful", icon: "😌", color: "#14B8A6" },
    { id: "excited", label: "Excited", icon: "🎉", color: "#EC4899" },
    { id: "work", label: "Work", icon: "💼", color: "#3B82F6" },
    { id: "family", label: "Family", icon: "👨‍👩‍👧", color: "#F97316" },
    { id: "exercise", label: "Exercise", icon: "🏃", color: "#22C55E" },
    { id: "social", label: "Social", icon: "👥", color: "#8B5CF6" },
];

export default function JournalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef(null);

    const [selectedMoodIndex, setSelectedMoodIndex] = useState(3);
    const sliderX = useRef(new Animated.Value((SLIDER_WIDTH / 4) * 3)).current;

    const [thoughts, setThoughts] = useState("");
    const [selectedTags, setSelectedTags] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [moodEntries, setMoodEntries] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                sliderX.setOffset(sliderX._value);
                sliderX.setValue(0);
            },
            onPanResponderMove: (_, gestureState) => {
                const newX = Math.max(0, Math.min(gestureState.dx + sliderX._offset, SLIDER_WIDTH));
                sliderX.setValue(newX - sliderX._offset);
            },
            onPanResponderRelease: () => {
                sliderX.flattenOffset();
                const currentValue = sliderX._value;
                const segmentWidth = SLIDER_WIDTH / (MOODS.length - 1);
                const nearestIndex = Math.round(currentValue / segmentWidth);
                const clampedIndex = Math.max(0, Math.min(nearestIndex, MOODS.length - 1));
                setSelectedMoodIndex(clampedIndex);
                Animated.spring(sliderX, {
                    toValue: clampedIndex * segmentWidth,
                    useNativeDriver: true,
                    speed: 20,
                    bounciness: 5,
                }).start();
            },
        })
    ).current;

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                const entriesResponse = await api.getMoodEntries(userId, 1, 30);
                if (entriesResponse?.moodEntries) {
                    setMoodEntries(entriesResponse.moodEntries);
                }
                try {
                    const analyticsResponse = await api.getMoodAnalytics(userId, 30);
                    if (analyticsResponse?.analytics) {
                        setAnalytics(analyticsResponse.analytics);
                    }
                } catch (e) { }
            }
        } catch (error) {
            console.log("Error loading data:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const toggleTag = (tagId) => {
        setSelectedTags(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const handleSaveMood = async () => {
        const selectedMood = MOODS[selectedMoodIndex];
        if (!selectedMood) return;
        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                const moodData = {
                    moodScore: selectedMood.value,
                    moodLabel: selectedMood.backendLabel,
                    textFeedback: thoughts,
                    tags: selectedTags,
                    activities: selectedTags.filter(tag =>
                        ["exercise", "work", "social", "sleep", "eating", "hobby", "family", "travel", "study", "other"].includes(tag)
                    ),
                };
                await api.addMoodEntry(userId, moodData);
                Alert.alert("Success! 🎉", "Your mood has been logged!", [{ text: "OK" }]);
                setSelectedMoodIndex(2);
                const segmentWidth = SLIDER_WIDTH / (MOODS.length - 1);
                sliderX.setValue(2 * segmentWidth);
                setThoughts("");
                setSelectedTags([]);
                loadData();
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to save mood.");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    const selectedMood = MOODS[selectedMoodIndex];
    const totalEntries = moodEntries.length;
    const avgMood = totalEntries > 0
        ? (moodEntries.reduce((sum, e) => sum + (e.moodScore || 3), 0) / totalEntries).toFixed(1)
        : "—";

    const getMoodDistribution = () => {
        if (!totalEntries) return [];
        const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        moodEntries.forEach(entry => {
            if (entry.moodScore) distribution[entry.moodScore]++;
        });
        return [
            { label: "Amazing", value: distribution[5], color: "#22C55E", emoji: "🤩" },
            { label: "Good", value: distribution[4], color: "#84CC16", emoji: "😊" },
            { label: "Okay", value: distribution[3], color: "#EAB308", emoji: "😐" },
            { label: "Bad", value: distribution[2], color: "#F97316", emoji: "😢" },
            { label: "Terrible", value: distribution[1], color: "#EF4444", emoji: "😫" },
        ];
    };

    const getTrend = () => {
        if (moodEntries.length < 2) return "stable";
        const recentAvg = moodEntries.slice(0, 3).reduce((s, e) => s + (e.moodScore || 3), 0) / Math.min(3, moodEntries.length);
        const olderAvg = moodEntries.slice(3, 7).reduce((s, e) => s + (e.moodScore || 3), 0) / Math.min(4, Math.max(1, moodEntries.length - 3));
        if (recentAvg > olderAvg + 0.5) return "improving";
        if (recentAvg < olderAvg - 0.5) return "declining";
        return "stable";
    };

    const trend = analytics?.trend || getTrend();
    const distribution = getMoodDistribution();
    const segmentWidth = SLIDER_WIDTH / (MOODS.length - 1);

    // Format time
    const formatTime = () => {
        return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Mood Journal</Text>
                    <Text style={styles.headerSubtitle}>How are you feeling?</Text>
                </View>
                <TouchableOpacity
                    style={styles.calendarButton}
                    onPress={() => router.push("/(tabs)/mood/calendar")}
                >
                    <Calendar size={22} color="#4A9B7F" />
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A9B7F" />}
            >
                {/* Mood Slider Section */}
                <View style={styles.moodSection}>
                    {/* Time and Icon Header */}
                    <View style={styles.moodHeader}>
                        <View style={styles.moodIconContainer}>
                            <Text style={styles.headerEmoji}>{selectedMood?.emoji}</Text>
                        </View>
                        <View style={styles.timeContainer}>
                            <Clock size={14} color="#6B7280" />
                            <Text style={styles.timeText}>{formatTime()}</Text>
                        </View>
                    </View>

                    {/* Big Emoji Display */}
                    <View style={styles.selectedMoodDisplay}>
                        <Text style={styles.bigEmoji}>{selectedMood?.emoji}</Text>
                        <Text style={[styles.moodLabel, { color: selectedMood?.color }]}>
                            {selectedMood?.label}
                        </Text>
                    </View>

                    {/* Draggable Slider */}
                    <View style={styles.sliderContainer}>
                        {/* Gradient Track */}
                        <LinearGradient
                            colors={["#EF4444", "#F97316", "#EAB308", "#84CC16", "#22C55E"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.sliderTrack}
                        />

                        {/* Draggable Thumb */}
                        <Animated.View
                            {...panResponder.panHandlers}
                            style={[
                                styles.sliderThumb,
                                { transform: [{ translateX: sliderX }] },
                            ]}
                        >
                            <View style={styles.thumbInner} />
                        </Animated.View>

                        {/* Emoji Markers - Below the slider */}
                        <View style={styles.emojiMarkersRow}>
                            {MOODS.map((mood, index) => (
                                <TouchableOpacity
                                    key={mood.id}
                                    style={[
                                        styles.emojiMarker,
                                        selectedMoodIndex === index && styles.emojiMarkerActive,
                                    ]}
                                    onPress={() => {
                                        setSelectedMoodIndex(index);
                                        Animated.spring(sliderX, {
                                            toValue: index * segmentWidth,
                                            useNativeDriver: true,
                                            speed: 20,
                                        }).start();
                                    }}
                                >
                                    <Text style={[
                                        styles.markerEmoji,
                                        selectedMoodIndex === index && styles.markerEmojiActive,
                                    ]}>{mood.emoji}</Text>
                                    <Text style={[
                                        styles.markerLabel,
                                        selectedMoodIndex === index && styles.markerLabelActive,
                                    ]}>{mood.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* What's on your mind */}
                <View style={styles.thoughtsSection}>
                    <Text style={styles.sectionLabel}>What's on your mind?</Text>
                    <View style={styles.thoughtsInputContainer}>
                        <TextInput
                            style={styles.thoughtsInput}
                            placeholder="Share your thoughts..."
                            placeholderTextColor="#9CA3AF"
                            multiline
                            value={thoughts}
                            onChangeText={setThoughts}
                            textAlignVertical="top"
                        />
                        <View style={styles.attachmentRow}>
                            <TouchableOpacity style={styles.attachmentButton}>
                                <Mic size={18} color="#6B7280" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.attachmentButton}>
                                <ImageIcon size={18} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Tags */}
                <View style={styles.tagsSection}>
                    <Text style={styles.sectionLabel}>How are you feeling?</Text>
                    <View style={styles.tagsGrid}>
                        {TAGS.map((tag) => (
                            <TouchableOpacity
                                key={tag.id}
                                style={[
                                    styles.tagButton,
                                    selectedTags.includes(tag.id) && { backgroundColor: tag.color + "20", borderColor: tag.color }
                                ]}
                                onPress={() => toggleTag(tag.id)}
                            >
                                <Text style={styles.tagIcon}>{tag.icon}</Text>
                                <Text style={[
                                    styles.tagLabel,
                                    selectedTags.includes(tag.id) && { color: tag.color, fontWeight: "600" }
                                ]}>{tag.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleSaveMood}
                    disabled={loading}
                >
                    <LinearGradient colors={["#4A9B7F", "#3B8068"]} style={styles.saveButtonGradient}>
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Save size={20} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Save Mood Entry</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                {/* Analytics Section */}
                {totalEntries > 0 && (
                    <View style={styles.analyticsSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Your Mood Insights</Text>
                            <Sparkles size={20} color="#F59E0B" />
                        </View>

                        {/* Stats Cards */}
                        <View style={styles.statsGrid}>
                            <View style={[styles.statCard, { backgroundColor: "#E6F4F0" }]}>
                                <Activity size={18} color="#4A9B7F" />
                                <Text style={styles.statValue}>{avgMood}</Text>
                                <Text style={styles.statLabel}>Avg Mood</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
                                <BarChart3 size={18} color="#F59E0B" />
                                <Text style={styles.statValue}>{totalEntries}</Text>
                                <Text style={styles.statLabel}>Total Logs</Text>
                            </View>
                            <View style={[styles.statCard, { backgroundColor: trend === "improving" ? "#D1FAE5" : trend === "declining" ? "#FEE2E2" : "#F3F4F6" }]}>
                                {trend === "improving" ? <TrendingUp size={18} color="#22C55E" /> :
                                    trend === "declining" ? <TrendingDown size={18} color="#EF4444" /> :
                                        <Minus size={18} color="#6B7280" />}
                                <Text style={[styles.statValue, { fontSize: 13, textTransform: "capitalize" }]}>{trend}</Text>
                                <Text style={styles.statLabel}>Trend</Text>
                            </View>
                        </View>

                        {/* Bar Chart */}
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>📊 Mood Distribution</Text>
                            <View style={styles.distributionChart}>
                                {distribution.map((item, index) => (
                                    <View key={index} style={styles.distributionItem}>
                                        <View style={styles.distributionBar}>
                                            <View
                                                style={[
                                                    styles.distributionFill,
                                                    {
                                                        backgroundColor: item.color,
                                                        height: `${Math.max((item.value / Math.max(totalEntries, 1)) * 100, 8)}%`,
                                                    }
                                                ]}
                                            />
                                        </View>
                                        <Text style={styles.distributionEmoji}>{item.emoji}</Text>
                                        <Text style={styles.distributionValue}>{item.value}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Pie Chart Representation */}
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>🥧 Mood Breakdown</Text>
                            <View style={styles.pieChartContainer}>
                                {distribution.map((item, index) => {
                                    const percentage = totalEntries > 0 ? Math.round((item.value / totalEntries) * 100) : 0;
                                    return (
                                        <View key={index} style={styles.pieItem}>
                                            <View style={[styles.pieColor, { backgroundColor: item.color }]} />
                                            <Text style={styles.pieLabel}>{item.emoji} {item.label}</Text>
                                            <Text style={styles.piePercentage}>{percentage}%</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Weekly Trend Chart */}
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>📈 Weekly Trend</Text>
                            <View style={styles.weeklyChart}>
                                {moodEntries.slice(0, 7).reverse().map((entry, index) => {
                                    const mood = MOODS.find(m => m.value === entry.moodScore) || MOODS[2];
                                    const barHeight = ((entry.moodScore || 3) / 5) * 60;
                                    return (
                                        <View key={entry._id || index} style={styles.weeklyBarContainer}>
                                            <View style={[styles.weeklyBar, { height: barHeight, backgroundColor: mood.color }]} />
                                            <Text style={styles.weeklyEmoji}>{mood.emoji}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Recent Moods */}
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>🕐 Recent Entries</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View style={styles.recentMoodsRow}>
                                    {moodEntries.slice(0, 7).map((entry, index) => {
                                        const mood = MOODS.find(m => m.value === entry.moodScore) || MOODS[2];
                                        const date = new Date(entry.timestamp || entry.createdAt);
                                        return (
                                            <View key={entry._id || index} style={styles.recentMoodItem}>
                                                <Text style={styles.recentMoodEmoji}>{mood.emoji}</Text>
                                                <Text style={styles.recentMoodDate}>
                                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                                </Text>
                                                <Text style={styles.recentMoodTime}>
                                                    {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            style={styles.viewCalendarButton}
                            onPress={() => router.push("/(tabs)/mood/calendar")}
                        >
                            <Text style={styles.viewCalendarText}>View Full Calendar</Text>
                            <ChevronRight size={18} color="#4A9B7F" />
                        </TouchableOpacity>
                    </View>
                )}

                {totalEntries === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>📊</Text>
                        <Text style={styles.emptyTitle}>No mood entries yet</Text>
                        <Text style={styles.emptyText}>Start tracking your mood to see insights!</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
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
    headerTitle: { fontSize: 24, fontWeight: "700", color: "#1F2937" },
    headerSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },
    calendarButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#E6F4F0",
        justifyContent: "center",
        alignItems: "center",
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
    // Mood Section
    moodSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 5,
    },
    moodHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    moodIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    headerEmoji: { fontSize: 22 },
    timeContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
    timeText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
    selectedMoodDisplay: { alignItems: "center", marginBottom: 20 },
    bigEmoji: { fontSize: 64, marginBottom: 6 },
    moodLabel: { fontSize: 22, fontWeight: "700" },
    sliderContainer: { marginHorizontal: 8, paddingBottom: 60 },
    sliderTrack: {
        height: 10,
        borderRadius: 5,
        marginBottom: 12,
    },
    sliderThumb: {
        position: "absolute",
        top: -15,
        left: -THUMB_SIZE / 2,
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: THUMB_SIZE / 2,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 3,
        borderColor: "#4A9B7F",
    },
    thumbInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#4A9B7F" },
    emojiMarkersRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
    },
    emojiMarker: {
        alignItems: "center",
        padding: 6,
        borderRadius: 12,
    },
    emojiMarkerActive: { backgroundColor: "#E6F4F0" },
    markerEmoji: { fontSize: 22, opacity: 0.6 },
    markerEmojiActive: { opacity: 1, fontSize: 26 },
    markerLabel: { fontSize: 10, color: "#9CA3AF", marginTop: 4 },
    markerLabelActive: { color: "#4A9B7F", fontWeight: "600" },
    // Thoughts
    thoughtsSection: { marginBottom: 16 },
    sectionLabel: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
    thoughtsInputContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    thoughtsInput: { fontSize: 15, color: "#1F2937", minHeight: 80, lineHeight: 22 },
    attachmentRow: {
        flexDirection: "row",
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    attachmentButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    // Tags
    tagsSection: { marginBottom: 20 },
    tagsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    tagButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        gap: 4,
    },
    tagIcon: { fontSize: 13 },
    tagLabel: { fontSize: 12, color: "#6B7280" },
    // Save Button
    saveButton: { marginBottom: 24 },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 16,
        gap: 10,
    },
    saveButtonText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
    // Analytics
    analyticsSection: { marginBottom: 20 },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937" },
    statsGrid: { flexDirection: "row", gap: 10, marginBottom: 16 },
    statCard: { flex: 1, padding: 12, borderRadius: 14, alignItems: "center" },
    statValue: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginTop: 4 },
    statLabel: { fontSize: 10, color: "#6B7280", marginTop: 2 },
    chartCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    chartTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937", marginBottom: 14 },
    distributionChart: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        height: 100,
    },
    distributionItem: { flex: 1, alignItems: "center" },
    distributionBar: {
        width: 22,
        height: 70,
        backgroundColor: "#F3F4F6",
        borderRadius: 11,
        justifyContent: "flex-end",
        overflow: "hidden",
    },
    distributionFill: { width: "100%", borderRadius: 11 },
    distributionEmoji: { fontSize: 16, marginTop: 6 },
    distributionValue: { fontSize: 11, fontWeight: "600", color: "#1F2937" },
    // Pie Chart
    pieChartContainer: { gap: 10 },
    pieItem: { flexDirection: "row", alignItems: "center", gap: 10 },
    pieColor: { width: 16, height: 16, borderRadius: 8 },
    pieLabel: { flex: 1, fontSize: 14, color: "#4B5563" },
    piePercentage: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
    // Weekly Chart
    weeklyChart: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-end", height: 80 },
    weeklyBarContainer: { alignItems: "center" },
    weeklyBar: { width: 20, borderRadius: 10, marginBottom: 4 },
    weeklyEmoji: { fontSize: 14 },
    // Recent Moods
    recentMoodsRow: { flexDirection: "row", gap: 16 },
    recentMoodItem: { alignItems: "center" },
    recentMoodEmoji: { fontSize: 28, marginBottom: 4 },
    recentMoodDate: { fontSize: 11, color: "#6B7280" },
    recentMoodTime: { fontSize: 10, color: "#9CA3AF" },
    viewCalendarButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        backgroundColor: "#E6F4F0",
        borderRadius: 12,
        gap: 6,
    },
    viewCalendarText: { fontSize: 14, fontWeight: "600", color: "#4A9B7F" },
    emptyState: { alignItems: "center", paddingVertical: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 6 },
    emptyText: { fontSize: 14, color: "#6B7280" },
});
