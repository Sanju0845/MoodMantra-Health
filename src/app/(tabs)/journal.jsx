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
    const [selectedEmotionByGroup, setSelectedEmotionByGroup] = useState({});
    const [step, setStep] = useState(1);
    const [selectedSituationTags, setSelectedSituationTags] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const SITUATION_SUB_TAGS = {
        Work: ["Deadline", "Teamwork", "Overtime", "Promotion", "Meeting"],
        PeriodSymptoms: ["Cramps", "Mood Swings", "Bloating", "Headache", "Energy Low"],
        BadHabits: ["Smoking", "Drinking", "Overeating", "Procrastination", "Negative Thinking"],
        Emotions: ["Joy", "Sadness", "Anger", "Fear", "Surprise"],
        Moon: ["Full Moon", "New Moon", "Waxing", "Waning", "Eclipse"],
        Weather: ["Sunny", "Rainy", "Cold", "Hot", "Windy"],
        Places: ["Home", "Office", "Outdoor", "Transport", "Public"],
        Beauty: ["Skincare", "Makeup", "Hair", "Fitness", "Self-Care"],
        Productivity: ["Focus", "Lazy", "Motivated", "Procrastination", "Task Done"],
        Romance: ["Love", "Date", "Breakup", "Argument", "Affection"],
        Chores: ["Cleaning", "Laundry", "Cooking", "Errands", "Repairs"],
        BetterMe: ["Goal", "Routine", "Learning", "Therapy", "Mindfulness"],
        Health: ["Exercise", "Medication", "Checkup", "Recovery", "Pain"],
        Food: ["Healthy", "Craving", "Cooking", "Diet", "Eating Out"],
        Sleep: ["Insomnia", "Nap", "Dream", "Routine", "Late Night"],
        Hobbies: ["Reading", "Gaming", "Music", "Art", "Travel"],
        Social: ["Party", "Conflict", "Support", "Lonely", "New Friends"],
        School: ["Exam", "Homework", "Class", "Presentation", "Results"]
    };

    const EMOTION_TAGS_BY_GROUP = {
        Work: ["Stressed", "Anxious", "Tired", "Motivated", "Confident", "Happy"],
        PeriodSymptoms: ["Irritated", "Fatigued", "Sensitive", "Relieved", "Calm"],
        BadHabits: ["Guilty", "Ashamed", "Determined", "Tired", "Neutral"],
        Emotions: ["Happy", "Sad", "Angry", "Peaceful", "Excited", "Lonely"],
        Moon: ["Calm", "Restless", "Inspired", "Sleepy", "Reflective"],
        Weather: ["Lazy", "Energetic", "Calm", "Bored", "Relaxed"],
        Places: ["Excited", "Curious", "Relaxed", "Anxious", "Happy"],
        Beauty: ["Confident", "Insecure", "Happy", "Calm", "Motivated"],
        Productivity: ["Focused", "Lazy", "Satisfied", "Tired", "Motivated"],
        Romance: ["Loved", "Lonely", "Happy", "Sad", "Excited"],
        Chores: ["Tired", "Productive", "Bored", "Satisfied", "Calm"],
        BetterMe: ["Motivated", "Confident", "Focused", "Tired", "Grateful"],
        Health: ["Healthy", "Weak", "Energetic", "Sick", "Grateful"],
        Food: ["Satisfied", "Guilty", "Happy", "Lazy", "Energetic"],
        Sleep: ["Rested", "Tired", "Dreamy", "Lazy", "Calm"],
        Hobbies: ["Relaxed", "Creative", "Excited", "Focused", "Happy"],
        Social: ["Excited", "Nervous", "Happy", "Confident", "Drained"],
        School: ["Focused", "Anxious", "Tired", "Curious", "Stressed", "Accomplished"]
    };

    const handleMoodSelect = (mood) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedMood(mood);
        setSelectedCategories([]);
        setSelectedEmotionByGroup({});
        setStep(1);
        setSelectedSituationTags({});
    };

    const toggleCategory = (category) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const toggleEmotionTag = (group, tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedEmotionByGroup(prev => {
            const current = prev[group] || [];
            const next = current.includes(tag)
                ? current.filter(t => t !== tag)
                : [...current, tag];
            const updated = { ...prev, [group]: next };
            if (next.length === 0) delete updated[group];
            return updated;
        });
        setSelectedCategories(prev => {
            const exists = prev.includes(tag);
            return exists ? prev.filter(t => t !== tag) : [...prev, tag];
        });
    };

    const handleBack = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedMood(null);
        setSelectedCategories([]);
        setSelectedSituationTags({});
        setSelectedEmotionByGroup({});
        setStep(1);
    };

    const toggleSituationTag = (category, tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedSituationTags(prev => {
            const current = prev[category] || [];
            const next = current.includes(tag)
                ? current.filter(t => t !== tag)
                : [...current, tag];
            const updated = { ...prev, [category]: next };
            if (next.length === 0) {
                delete updated[category];
            }
            return updated;
        });
    };

    const handleNextOrSave = async () => {
        if (step === 1) {
            const hasAnyEmotion = Object.keys(selectedEmotionByGroup).length > 0;
            if (!hasAnyEmotion) {
                Alert.alert("Select Tags", "Please select at least one tag");
                return;
            }
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setStep(2);
            return;
        }
        if (Object.keys(selectedSituationTags).length === 0) {
            Alert.alert("Select Situations", "Please select at least one situation tag");
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

            const situationsArray = Object.keys(selectedSituationTags).map(cat => ({
                situation: cat,
                emotions: (selectedEmotionByGroup[cat] || selectedCategories).map(e => ({ emotion: e, intensity: 3 })),
                tags: (selectedSituationTags[cat] || []),
                entry_score: 0,
                final_adjusted: 0,
                intensities: [3],
                normalized_score: 50,
                tag_adjustment: 0
            }));

            const payload = {
                date: dateStr,
                time: timeStr,
                mood: selectedMood.label,
                situations: situationsArray
            };

            await api.submitWebMood(payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success! 🌟", "Your mood has been logged.", [{
                text: "OK",
                onPress: () => {
                    setSelectedMood(null);
                    setSelectedCategories([]);
                    setSelectedSituationTags({});
                    setSelectedEmotionByGroup({});
                    setStep(1);
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
                ) : step === 1 ? (
                    <View style={styles.card}>
                        <View style={styles.selectedMoodHeader}>
                            <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
                            <Text style={styles.selectedMoodLabel}>{selectedMood.label}</Text>
                            <Text style={styles.selectedMoodDescription}>{selectedMood.description}</Text>
                        </View>

                        <Text style={styles.categoryQuestion}>Select tags</Text>
                        <View style={{ gap: 16 }}>
                            {Object.keys(EMOTION_TAGS_BY_GROUP).map((group) => (
                                <View key={group} style={{ marginBottom: 8 }}>
                                    <Text style={[styles.selectedMoodLabel, { fontSize: 18 }]}>{group}</Text>
                                    <View style={styles.categoryGrid}>
                                        {EMOTION_TAGS_BY_GROUP[group].map((tag, idx) => {
                                            const isSelected = (selectedEmotionByGroup[group] || []).includes(tag);
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[
                                                        styles.categoryChip,
                                                        isSelected && {
                                                            backgroundColor: selectedMood.color,
                                                            borderColor: selectedMood.color,
                                                        }
                                                    ]}
                                                    onPress={() => toggleEmotionTag(group, tag)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[
                                                        styles.categoryText,
                                                        isSelected && styles.categoryTextSelected
                                                    ]}>
                                                        {tag}
                                                    </Text>
                                                    {isSelected && (
                                                        <CheckCircle size={16} color="#FFF" style={{ marginLeft: 4 }} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                Object.keys(selectedEmotionByGroup).length === 0 && styles.saveButtonDisabled
                            ]}
                            onPress={handleNextOrSave}
                            disabled={Object.keys(selectedEmotionByGroup).length === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Object.keys(selectedEmotionByGroup).length > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                start={[0, 0]}
                                end={[1, 0]}
                                style={styles.saveButtonGradient}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Next</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.categoryQuestion}>Select tags for your situations</Text>
                        <View style={{ gap: 16 }}>
                            {Object.keys(SITUATION_SUB_TAGS).filter(cat => !!selectedEmotionByGroup[cat]).map((cat) => (
                                <View key={cat} style={{ marginBottom: 8 }}>
                                    <Text style={[styles.selectedMoodLabel, { fontSize: 18 }]}>{cat}</Text>
                                    <View style={styles.categoryGrid}>
                                        {SITUATION_SUB_TAGS[cat].map((tag, idx) => {
                                            const selected = (selectedSituationTags[cat] || []).includes(tag);
                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[
                                                        styles.categoryChip,
                                                        selected && {
                                                            backgroundColor: selectedMood.color,
                                                            borderColor: selectedMood.color,
                                                        }
                                                    ]}
                                                    onPress={() => toggleSituationTag(cat, tag)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                                                        {tag}
                                                    </Text>
                                                    {selected && (
                                                        <CheckCircle size={16} color="#FFF" style={{ marginLeft: 4 }} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[
                                styles.saveButton,
                                Object.keys(selectedSituationTags).length === 0 && styles.saveButtonDisabled
                            ]}
                            onPress={handleNextOrSave}
                            disabled={Object.keys(selectedSituationTags).length === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Object.keys(selectedSituationTags).length > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
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
