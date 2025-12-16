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
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
    CheckCircle,
    Briefcase,
    Heart,
    Moon,
    Coffee,
    BookOpen,
    Home,
    Target,
    Info,
    MessageCircle,
    Dumbbell,
    ChevronDown,
} from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const MOOD_DATA = [
    { emoji: "😁", label: "Joyful", color: "#22C55E" },
    { emoji: "😊", label: "Happy", color: "#16A34A" },
    { emoji: "😌", label: "Calm", color: "#14B8A6" },
    { emoji: "🙏", label: "Grateful", color: "#F59E0B" },
    { emoji: "😐", label: "Neutral", color: "#64748B" },
    { emoji: "🙂", label: "Okay", color: "#4ADE80" },
    { emoji: "😢", label: "Sad", color: "#3B82F6" },
    { emoji: "😩", label: "Tired", color: "#94A3B8" },
    { emoji: "😰", label: "Anxious", color: "#F97316" },
    { emoji: "😡", label: "Angry", color: "#EF4444" },
];

const SITUATION_ICONS = {
    "Work Stress": Briefcase,
    "Poor Sleep": Moon,
    "Exercise": Dumbbell,
    "Family Time": Heart,
    "Social Activity": MessageCircle,
    "Hobby/Relaxation": Coffee,
    "Learning": BookOpen,
    "Good Eating": Home,
    "Travel": Target,
    "Other": Info,
};

// --- Components ---

const DetailChip = ({ label, isSelected, onPress, color = "#4A9B7F" }) => (
    <TouchableOpacity
        style={[
            styles.detailChip,
            isSelected && { backgroundColor: color, borderColor: color }
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.detailChipText, isSelected && { color: "#FFF", fontWeight: "600" }]}>{label}</Text>
    </TouchableOpacity>
);

export default function JournalScreen() {
    const insets = useSafeAreaInsets();

    // UI State
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [expandedSituation, setExpandedSituation] = useState(null);

    // Data State
    const [rawMoodsData, setRawMoodsData] = useState([]);

    // Form Selection State
    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedSituationIds, setSelectedSituationIds] = useState([]);
    const [selectedDetails, setSelectedDetails] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.getAllMoodsTemplate();
            if (res.success && res.data) setRawMoodsData(res.data);
        } catch (e) {
            console.log("Error", e);
        } finally {
            setLoading(false);
        }
    };

    const handleMoodSelect = (moodItem) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedMood(moodItem);
    };

    const toggleSituation = (situationName) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        if (selectedSituationIds.includes(situationName)) {
            setSelectedSituationIds(prev => prev.filter(id => id !== situationName));
            if (expandedSituation === situationName) setExpandedSituation(null);
        } else {
            setSelectedSituationIds(prev => [...prev, situationName]);
            setExpandedSituation(situationName);
        }
    };

    const toggleDetail = (key) => {
        setSelectedDetails(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleSituationPress = (situationName) => {
        if (selectedSituationIds.includes(situationName)) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpandedSituation(expandedSituation === situationName ? null : situationName);
        } else {
            toggleSituation(situationName);
        }
    };



    const handleSubmit = async () => {
        if (!selectedMood) {
            Alert.alert("Mood Required", "Please select how you're feeling!");
            return;
        }
        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) {
                Alert.alert("Error", "User not found. Please login again.");
                return;
            }

            // Map mood label to backend enum and score
            // Backend Enums: very_happy, happy, neutral, sad, very_sad, anxious, stressed, excited, calm, angry
            const MOOD_MAPPING = {
                "Joyful": "very_happy",
                "Happy": "happy",
                "Calm": "calm",
                "Grateful": "excited", // Mapping generic positive to valid enum
                "Good": "happy",
                "Okay": "neutral",
                "Neutral": "neutral",
                "Sad": "sad",
                "Tired": "stressed", // 'tired' not in enum, 'stressed' is close or 'sad'
                "Anxious": "anxious",
                "Angry": "angry",
                "Weird": "neutral"
            };

            const backendMoodLabel = MOOD_MAPPING[selectedMood.label] || "neutral";

            const MOOD_SCORES = {
                "Joyful": 5, "Happy": 4, "Calm": 4, "Grateful": 5,
                "Good": 4, "Okay": 3, "Neutral": 3,
                "Sad": 2, "Tired": 2, "Anxious": 1, "Angry": 1,
                "Weird": 3
            };
            const score = MOOD_SCORES[selectedMood.label] || 3;

            // Process Details to separate Emotions and Tags
            const emotions = [];
            const tags = [];

            // selectedDetails contains strings like "Situation-Emotion" or "Situation-Tag"
            // We need to parse them roughly or just send them as is if simpler
            // But let's try to be cleaner:
            selectedDetails.forEach(detail => {
                const parts = detail.split("-");
                if (parts.length > 1) {
                    // This is heuristic, but safe enough
                    emotions.push(parts[1]);
                } else {
                    tags.push(detail);
                }
            });

            // Activity Mapping
            const ACTIVITY_MAPPING = {
                "Work Stress": "work",
                "Poor Sleep": "sleep",
                "Exercise": "exercise",
                "Family Time": "family",
                "Social Activity": "social",
                "Hobby/Relaxation": "hobby",
                "Learning": "study",
                "Good Eating": "eating",
                "Travel": "travel",
                "Other": "other"
            };

            const validActivities = selectedSituationIds.map(id => ACTIVITY_MAPPING[id] || "other");

            // Construct Payload aligned with Web MoodTrackingService
            const payload = {
                moodLabel: backendMoodLabel,
                moodScore: score,
                timestamp: new Date().toISOString(),
                activities: validActivities,
                emotions: emotions,
                notes: tags.join(", "), // Storing tags in notes for now
                source: "mobile"
            };

            await api.addMoodEntry(userId, payload);

            Alert.alert("Check-in Complete! 🌟", "Your mood has been logged.", [{
                text: "OK", onPress: () => {
                    setSelectedMood(null);
                    setSelectedSituationIds([]);
                    setSelectedDetails([]);
                    setExpandedSituation(null);
                }
            }]);

        } catch (e) {
            console.error("Mood Submit Error", e);
            Alert.alert("Error", "Could not save mood.");
        } finally {
            setSubmitting(false);
        }
    };

    const getCurrentDate = () => {
        return new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View>
                    <Text style={styles.headerDate}>{getCurrentDate()}</Text>
                    <Text style={styles.headerTitle}>Daily Check-in</Text>
                </View>
                <View style={[styles.avatarContainer, { borderColor: selectedMood ? selectedMood.color : '#E2E8F0' }]}>
                    <LinearGradient colors={["#ECFDF5", "#FFF"]} style={styles.avatarGradient}>
                        <Text style={{ fontSize: 24 }}>{selectedMood ? selectedMood.emoji : "😶"}</Text>
                    </LinearGradient>
                </View>
            </View>

            {/* Scrollable Content Area */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Mood Selector */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionLabel}>How do you feel?</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodScroll}>
                        {MOOD_DATA.map((mood, idx) => {
                            const isSelected = selectedMood?.label === mood.label;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.moodItem,
                                        isSelected && { backgroundColor: mood.color + "20", borderColor: mood.color, transform: [{ scale: 1.05 }] }
                                    ]}
                                    onPress={() => handleMoodSelect(mood)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.moodEmoji, isSelected && { fontSize: 32 }]}>{mood.emoji}</Text>
                                    {isSelected && <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* 2. Situations */}
                <View style={styles.sectionContainer}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionLabel}>What's happening?</Text>
                        {selectedSituationIds.length > 0 && (
                            <Text style={styles.selectionCount}>{selectedSituationIds.length} selected</Text>
                        )}
                    </View>

                    <View style={styles.situationFlow}>
                        {rawMoodsData.map((item) => {
                            const isSelected = selectedSituationIds.includes(item.situation);
                            const isExpanded = expandedSituation === item.situation;
                            const Icon = SITUATION_ICONS[item.situation] || Info;
                            const activeDetails = selectedDetails.filter(k => k.startsWith(`${item.situation}-`)).length;

                            return (
                                <View key={item._id} style={[styles.situationWrapper, isSelected && styles.situationWrapperActive]}>
                                    <TouchableOpacity
                                        style={[styles.situationPill, isSelected && styles.situationPillActive]}
                                        onPress={() => handleSituationPress(item.situation)}
                                        activeOpacity={0.8}
                                    >
                                        <Icon size={16} color={isSelected ? "#FFF" : "#64748B"} />
                                        <Text style={[styles.situationText, isSelected && styles.situationTextActive]}>{item.situation}</Text>
                                        {activeDetails > 0 && (
                                            <View style={styles.badge}><Text style={styles.badgeText}>{activeDetails}</Text></View>
                                        )}
                                        {isSelected && (
                                            <ChevronDown size={14} color="#FFF" style={{ marginLeft: 4, transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                                        )}
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.subMenuContainer}>
                                            <Text style={styles.subLabel}>Emotions</Text>
                                            <View style={styles.detailRow}>
                                                {item.emotions?.map(e => (
                                                    <DetailChip
                                                        key={e}
                                                        label={e}
                                                        isSelected={selectedDetails.includes(`${item.situation}-${e}`)}
                                                        onPress={() => toggleDetail(`${item.situation}-${e}`)}
                                                    />
                                                ))}
                                            </View>

                                            {item.tags && item.tags.length > 0 && (
                                                <>
                                                    <Text style={[styles.subLabel, { marginTop: 10 }]}>Tags</Text>
                                                    <View style={styles.detailRow}>
                                                        {item.tags.map(t => (
                                                            <DetailChip
                                                                key={t}
                                                                label={t}
                                                                color="#6366F1"
                                                                isSelected={selectedDetails.includes(`${item.situation}-${t}`)}
                                                                onPress={() => toggleDetail(`${item.situation}-${t}`)}
                                                            />
                                                        ))}
                                                    </View>
                                                </>
                                            )}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
                {/* 3. Inline Action Button (Scrolls with content) */}
                <View style={styles.inlineButtonContainer}>
                    {selectedMood ? (
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                            disabled={submitting}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={["#4A9B7F", "#3B8068"]}
                                start={[0, 0]} end={[1, 0]}
                                style={styles.gradientBtn}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.btnText}>Log {selectedMood.label}</Text>
                                        <CheckCircle size={18} color="#FFF" />
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <Text style={styles.placeholderText}>Select a mood to continue</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: "#FFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    headerTitle: { fontSize: 24, fontWeight: "800", color: "#1E293B", letterSpacing: -0.5 },
    headerDate: { fontSize: 13, fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: 4 },
    avatarContainer: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 2,
        backgroundColor: "#FFF",
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4
    },
    avatarGradient: { flex: 1, borderRadius: 20, justifyContent: "center", alignItems: "center" },

    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
        paddingBottom: 100, // Bottom padding for comfortable scrolling
    },

    // Sections
    sectionContainer: { marginBottom: 24 },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 12 },
    sectionLabel: { fontSize: 16, fontWeight: "700", color: "#334155", marginLeft: 20, marginBottom: 12 },
    selectionCount: { fontSize: 12, color: "#4A9B7F", fontWeight: "600", backgroundColor: "#ECFDF5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

    // Moods
    moodScroll: { paddingHorizontal: 20, gap: 12, paddingBottom: 10 },
    moodItem: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", shadowColor: "#94A3B8", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 2, borderWidth: 2, borderColor: "transparent" },
    moodEmoji: { fontSize: 28 },
    moodLabel: { fontSize: 10, fontWeight: "700", position: 'absolute', bottom: -20, width: 80, textAlign: 'center' },

    // Situations
    situationFlow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20 },
    situationWrapper: { borderRadius: 16, overflow: 'hidden' },
    situationWrapperActive: { width: '100%', backgroundColor: "#FFF", marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#64748B", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    situationPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "#E2E8F0", gap: 8 },
    situationPillActive: { backgroundColor: "#4A9B7F", borderColor: "#4A9B7F", borderRadius: 0, borderWidth: 0, paddingVertical: 12 },
    situationText: { fontSize: 14, fontWeight: "600", color: "#475569" },
    situationTextActive: { color: "#FFF" },
    badge: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
    badgeText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

    // Submenu
    subMenuContainer: { padding: 16, backgroundColor: "#F8FAFC" },
    subLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", marginBottom: 8 },
    detailRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    detailChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0" },
    detailChipText: { fontSize: 12, color: "#64748B", fontWeight: "500" },

    // Inline Button
    inlineButtonContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 20,
        alignItems: "center",
    },
    submitButton: { width: "100%", shadowColor: "#4A9B7F", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    gradientBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
    btnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
    placeholderContainer: { alignItems: "center", paddingVertical: 20, opacity: 0.5 },
    placeholderText: { fontStyle: "italic", color: "#94A3B8" },
});
