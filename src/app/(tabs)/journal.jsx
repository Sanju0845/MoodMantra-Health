import { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions,
    LayoutAnimation,
    Platform,
    UIManager,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, X, CheckCircle } from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const SCREEN_WIDTH = Dimensions.get("window").width;

const MOOD_DATA = [
    // Positive Emotions
    {
        id: "joyful",
        emoji: "😁",
        label: "Joyful",
        description: "Feeling full of joy and excitement",
        color: "#4A9B7F",
        categories: ["Grateful", "Excited", "Energetic", "Optimistic", "Proud", "Playful"],
    },
    {
        id: "happy",
        emoji: "😊",
        label: "Happy",
        description: "Feeling good, cheerful and positive",
        color: "#16A34A",
        categories: ["Content", "Peaceful", "Satisfied", "Cheerful", "Blessed", "Relaxed"],
    },
    {
        id: "calm",
        emoji: "😌",
        label: "Calm",
        description: "Feeling relaxed and at peace",
        color: "#14B8A6",
        categories: ["Serene", "Balanced", "Tranquil", "Centered", "Composed", "Mellow"],
    },
    {
        id: "grateful",
        emoji: "🙏",
        label: "Grateful",
        description: "Feeling thankful and appreciative",
        color: "#F59E0B",
        categories: ["Blessed", "Thankful", "Appreciative", "Humbled", "Fortunate", "Touched"],
    },
    {
        id: "motivated",
        emoji: "💪",
        label: "Motivated",
        description: "Feeling driven and ready to take action",
        color: "#10B981",
        categories: ["Determined", "Focused", "Inspired", "Ambitious", "Confident", "Empowered"],
    },
    {
        id: "loved",
        emoji: "❤️",
        label: "Loved",
        description: "Feeling cared for and emotionally supported",
        color: "#EC4899",
        categories: ["Cherished", "Adored", "Valued", "Connected", "Warm", "Affectionate"],
    },
    {
        id: "inspired",
        emoji: "🌟",
        label: "Inspired",
        description: "Feeling creative and full of new ideas",
        color: "#6366F1",
        categories: ["Creative", "Curious", "Innovative", "Imaginative", "Artistic", "Visionary"],
    },
    // Negative Emotions
    {
        id: "sad",
        emoji: "😢",
        label: "Sad",
        description: "Feeling down or emotionally hurt",
        color: "#3B82F6",
        categories: ["Lonely", "Disappointed", "Heartbroken", "Gloomy", "Hopeless", "Dejected"],
    },
    {
        id: "angry",
        emoji: "😡",
        label: "Angry",
        description: "Feeling irritated, frustrated or upset",
        color: "#EF4444",
        categories: ["Frustrated", "Irritated", "Furious", "Annoyed", "Resentful", "Bitter"],
    },
    {
        id: "anxious",
        emoji: "😰",
        label: "Anxious",
        description: "Feeling nervous, worried or uneasy",
        color: "#F59E0B",
        categories: ["Worried", "Nervous", "Stressed", "Panicked", "Tense", "Fearful"],
    },
    {
        id: "tired",
        emoji: "😩",
        label: "Tired",
        description: "Feeling exhausted or low on energy",
        color: "#94A3B8",
        categories: ["Exhausted", "Drained", "Sleepy", "Weary", "Fatigued", "Lethargic"],
    },
    {
        id: "overwhelmed",
        emoji: "😖",
        label: "Overwhelmed",
        description: "Feeling like there's too much to handle",
        color: "#F97316",
        categories: ["Swamped", "Pressured", "Burdened", "Overloaded", "Stretched", "Suffocated"],
    },
    {
        id: "awful",
        emoji: "😭",
        label: "Awful",
        description: "Feeling extremely upset or distressed",
        color: "#A855F7",
        categories: ["Miserable", "Terrible", "Agonized", "Suffering", "Tormented", "Distressed"],
    },
    // Neutral / Ambiguous
    {
        id: "neutral",
        emoji: "😐",
        label: "Neutral",
        description: "Feeling neither good nor bad",
        color: "#64748B",
        categories: ["Indifferent", "Numb", "Detached", "Apathetic", "Blank", "Empty"],
    },
    {
        id: "confused",
        emoji: "😕",
        label: "Confused",
        description: "Feeling unsure or unclear about something",
        color: "#8B5CF6",
        categories: ["Puzzled", "Uncertain", "Perplexed", "Bewildered", "Lost", "Disoriented"],
    },
    {
        id: "bored",
        emoji: "🥱",
        label: "Bored",
        description: "Feeling uninterested or unengaged",
        color: "#6B7280",
        categories: ["Restless", "Unstimulated", "Unengaged", "Listless", "Unenthused", "Tedious"],
    },
    {
        id: "okay",
        emoji: "🙂",
        label: "Okay",
        description: "Feeling fine, but not great",
        color: "#22C55E",
        categories: ["Fine", "Alright", "Decent", "Moderate", "Average", "So-so"],
    },
    // Complex / Mixed
    {
        id: "nostalgic",
        emoji: "🥹",
        label: "Nostalgic",
        description: "Feeling emotional about past memories",
        color: "#EC4899",
        categories: ["Sentimental", "Wistful", "Reflective", "Longing", "Reminiscent", "Bittersweet"],
    },
    {
        id: "hopeful",
        emoji: "🌈",
        label: "Hopeful",
        description: "Feeling optimistic about the future",
        color: "#10B981",
        categories: ["Optimistic", "Encouraged", "Positive", "Expectant", "Confident", "Uplifted"],
    },
    {
        id: "guilty",
        emoji: "😔",
        label: "Guilty",
        description: "Feeling responsible for something wrong",
        color: "#F59E0B",
        categories: ["Remorseful", "Regretful", "Ashamed", "Sorry", "Apologetic", "Contrite"],
    },
    {
        id: "ashamed",
        emoji: "😳",
        label: "Ashamed",
        description: "Feeling embarrassed or regretful",
        color: "#EF4444",
        categories: ["Embarrassed", "Humiliated", "Mortified", "Disgraced", "Sheepish", "Chagrined"],
    },
];

export default function JournalScreen() {
    const insets = useSafeAreaInsets();

    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const handleMoodSelect = (mood) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedMood(mood);
        setSelectedCategories([]);
    };

    const toggleCategory = (category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const handleBack = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedMood(null);
        setSelectedCategories([]);
    };

    const handleSave = async () => {
        if (selectedCategories.length === 0) {
            Alert.alert("Select Categories", "Please select at least one category");
            return;
        }

        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                Alert.alert("Error", "User not found. Please login again.");
                return;
            }

            const now = new Date();
            const dateStr = now.toISOString().split("T")[0];
            const timeStr = now.toTimeString().slice(0, 5);

            const payload = {
                date: dateStr,
                time: timeStr,
                mood: selectedMood.label,
                situations: [{
                    situation: selectedMood.label,
                    emotions: selectedCategories.map(cat => ({ emotion: cat, intensity: 3 })),
                    tags: [],
                    entry_score: 0,
                    final_adjusted: 0,
                    intensities: [3],
                    normalized_score: 50,
                    tag_adjustment: 0
                }]
            };

            await api.submitWebMood(payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success! 🌟", "Your mood has been logged.", [{
                text: "OK",
                onPress: () => {
                    setSelectedMood(null);
                    setSelectedCategories([]);
                }
            }]);
        } catch (e) {
            console.error("Mood Submit Error", e);
            Alert.alert("Error", "Could not save mood.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* White Background */}
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" }} />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                {selectedMood ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color="#374151" />
                        <Text style={styles.backText}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 80 }} />
                )}
                <Text style={styles.headerTitle}>Mood Check-in</Text>
                <View style={{ width: 80 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {!selectedMood ? (
                    // Mood Selection Screen
                    <View style={styles.card}>
                        <Text style={styles.questionText}>How are you feeling today?</Text>
                        <View style={styles.moodGrid}>
                            {MOOD_DATA.map((mood, index) => (
                                <TouchableOpacity
                                    key={mood.id}
                                    style={styles.moodCard}
                                    onPress={() => handleMoodSelect(mood)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                    <Text style={styles.moodLabel}>{mood.label}</Text>
                                    <Text style={styles.moodDescription} numberOfLines={2}>
                                        {mood.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    // Category Selection Screen
                    <View style={styles.card}>
                        <View style={styles.selectedMoodHeader}>
                            <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
                            <Text style={styles.selectedMoodLabel}>{selectedMood.label}</Text>
                            <Text style={styles.selectedMoodDescription}>{selectedMood.description}</Text>
                        </View>

                        <Text style={styles.categoryQuestion}>What specifically are you feeling?</Text>

                        <View style={styles.categoryGrid}>
                            {selectedMood.categories.map((category, index) => {
                                const isSelected = selectedCategories.includes(category);
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.categoryChip,
                                            isSelected && {
                                                backgroundColor: selectedMood.color,
                                                borderColor: selectedMood.color,
                                            }
                                        ]}
                                        onPress={() => toggleCategory(category)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            isSelected && styles.categoryTextSelected
                                        ]}>
                                            {category}
                                        </Text>
                                        {isSelected && (
                                            <CheckCircle size={16} color="#FFF" style={{ marginLeft: 4 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                selectedCategories.length === 0 && styles.saveButtonDisabled
                            ]}
                            onPress={handleSave}
                            disabled={selectedCategories.length === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={selectedCategories.length > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                start={[0, 0]}
                                end={[1, 0]}
                                style={styles.saveButtonGradient}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save Mood Check-in</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    backText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginLeft: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#4A9B7F",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: "transparent",
        borderRadius: 0,
        padding: 24,
    },
    questionText: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        textAlign: "center",
        marginBottom: 24,
    },
    moodGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        justifyContent: "space-between",
    },
    moodCard: {
        width: "30.5%",
        backgroundColor: "transparent",
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
        marginBottom: 12,
    },
    moodEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    moodLabel: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    moodDescription: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },
    selectedMoodHeader: {
        alignItems: "center",
        marginBottom: 32,
    },
    selectedMoodEmoji: {
        fontSize: 64,
        marginBottom: 12,
    },
    selectedMoodLabel: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    selectedMoodDescription: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
    },
    categoryQuestion: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 16,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 32,
    },
    categoryChip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: "#FFF",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
    },
    categoryText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#374151",
    },
    categoryTextSelected: {
        color: "#FFF",
    },
    saveButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveButtonGradient: {
        paddingVertical: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFF",
    },
});
