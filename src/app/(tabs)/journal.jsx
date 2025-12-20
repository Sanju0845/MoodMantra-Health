import { useState, useEffect, useRef } from "react";
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
    Animated,
    Modal,
} from "react-native";
import * as Haptics from 'expo-haptics';
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, CheckCircle, ChevronDown, ChevronUp, TrendingUp, Home } from "lucide-react-native";
import { useRouter } from "expo-router";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const MOOD_DATA = [
    { id: "joyful", emoji: "😁", label: "Joyful", color: "#4A9B7F" },
    { id: "happy", emoji: "😊", label: "Happy", color: "#16A34A" },
    { id: "calm", emoji: "😌", label: "Calm", color: "#14B8A6" },
    { id: "grateful", emoji: "🙏", label: "Grateful", color: "#F59E0B" },
    { id: "motivated", emoji: "💪", label: "Motivated", color: "#10B981" },
    { id: "loved", emoji: "❤️", label: "Loved", color: "#EC4899" },
    { id: "inspired", emoji: "🌟", label: "Inspired", color: "#6366F1" },
    { id: "sad", emoji: "😢", label: "Sad", color: "#3B82F6" },
    { id: "angry", emoji: "😡", label: "Angry", color: "#EF4444" },
    { id: "anxious", emoji: "😰", label: "Anxious", color: "#F59E0B" },
    { id: "tired", emoji: "😩", label: "Tired", color: "#94A3B8" },
    { id: "overwhelmed", emoji: "😖", label: "Overwhelmed", color: "#F97316" },
    { id: "awful", emoji: "😭", label: "Awful", color: "#A855F7" },
    { id: "neutral", emoji: "😐", label: "Neutral", color: "#64748B" },
    { id: "confused", emoji: "😕", label: "Confused", color: "#8B5CF6" },
    { id: "bored", emoji: "🥱", label: "Bored", color: "#6B7280" },
    { id: "okay", emoji: "🙂", label: "Okay", color: "#22C55E" },
    { id: "nostalgic", emoji: "🥹", label: "Nostalgic", color: "#EC4899" },
    { id: "hopeful", emoji: "🌈", label: "Hopeful", color: "#10B981" },
    { id: "guilty", emoji: "😔", label: "Guilty", color: "#F59E0B" },
    { id: "ashamed", emoji: "😳", label: "Ashamed", color: "#EF4444" },
];

export default function JournalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedEmotionByGroup, setSelectedEmotionByGroup] = useState({});
    const [step, setStep] = useState(1);
    const [selectedSituationTags, setSelectedSituationTags] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

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
        setSelectedEmotionByGroup({});
        setStep(1);
        setSelectedSituationTags({});
        setExpandedGroups({});
    };

    const toggleGroup = (group) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
    };

    const toggleEmotionTag = (group, tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedEmotionByGroup(prev => {
            const current = prev[group] || [];
            const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
            const updated = { ...prev, [group]: next };
            if (next.length === 0) delete updated[group];
            return updated;
        });
    };

    const handleBack = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSelectedMood(null);
        setSelectedSituationTags({});
        setSelectedEmotionByGroup({});
        setStep(1);
        setExpandedGroups({});
    };

    const toggleSituationTag = (category, tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedSituationTags(prev => {
            const current = prev[category] || [];
            const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
            const updated = { ...prev, [category]: next };
            if (next.length === 0) delete updated[category];
            return updated;
        });
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

        setTimeout(() => setShowConfetti(false), 3000);
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
                emotions: (selectedEmotionByGroup[cat] || []).map(e => ({ emotion: e, intensity: 3 })),
                tags: (selectedSituationTags[cat] || []),
                entry_score: 0,
                final_adjusted: 0,
                intensities: [3],
                normalized_score: 50,
                tag_adjustment: 0
            }));

            const payload = { date: dateStr, time: timeStr, mood: selectedMood.label, situations: situationsArray };
            await api.submitWebMood(payload);

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            triggerConfetti();
            setShowSuccessModal(true);
        } catch (e) {
            console.error("Mood Submit Error", e);
            Alert.alert("Error", "Could not save mood.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleGoHome = () => {
        setShowSuccessModal(false);
        setSelectedMood(null);
        setSelectedSituationTags({});
        setSelectedEmotionByGroup({});
        setStep(1);
        router.push("/(tabs)/home");
    };

    const handleGoToAnalytics = () => {
        setShowSuccessModal(false);
        setSelectedMood(null);
        setSelectedSituationTags({});
        setSelectedEmotionByGroup({});
        setStep(1);
        router.push("/(tabs)/mood/dashboard");
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                {selectedMood ? (
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color="#4A9B7F" />
                    </TouchableOpacity>
                ) : <View style={{ width: 40 }} />}
                <Text style={styles.headerTitle}>Mood Check-in</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                {!selectedMood ? (
                    <View>
                        <Text style={styles.questionText}>How are you feeling today?</Text>
                        <View style={styles.moodGrid}>
                            {MOOD_DATA.map((mood) => (
                                <TouchableOpacity
                                    key={mood.id}
                                    style={styles.moodCard}
                                    onPress={() => handleMoodSelect(mood)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.moodCardInner, { borderColor: mood.color }]}>
                                        <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                        <Text style={styles.moodLabel}>{mood.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : step === 1 ? (
                    <View>
                        <View style={styles.selectedMoodHeader}>
                            <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
                            <Text style={styles.selectedMoodLabel}>{selectedMood.label}</Text>
                        </View>

                        <Text style={styles.sectionTitle}>Select your emotions</Text>
                        {Object.keys(EMOTION_TAGS_BY_GROUP).map((group) => {
                            const isExpanded = expandedGroups[group];
                            const selectedCount = (selectedEmotionByGroup[group] || []).length;
                            return (
                                <View key={group} style={styles.groupCard}>
                                    <TouchableOpacity
                                        style={styles.groupHeader}
                                        onPress={() => toggleGroup(group)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.groupHeaderLeft}>
                                            <Text style={styles.groupTitle}>{group}</Text>
                                            {selectedCount > 0 && (
                                                <View style={styles.selectedBadge}>
                                                    <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {isExpanded ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.tagGrid}>
                                            {EMOTION_TAGS_BY_GROUP[group].map((tag) => {
                                                const isSelected = (selectedEmotionByGroup[group] || []).includes(tag);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[styles.tagChip, isSelected && { backgroundColor: "#4A9B7F", borderColor: "#4A9B7F" }]}
                                                        onPress={() => toggleEmotionTag(group, tag)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                                                        {isSelected && <CheckCircle size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.actionButton, Object.keys(selectedEmotionByGroup).length === 0 && styles.actionButtonDisabled]}
                            onPress={handleNextOrSave}
                            disabled={Object.keys(selectedEmotionByGroup).length === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Object.keys(selectedEmotionByGroup).length > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                start={[0, 0]}
                                end={[1, 0]}
                                style={styles.actionButtonGradient}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionButtonText}>Next</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View>
                        <Text style={styles.sectionTitle}>Select situation details</Text>
                        {Object.keys(SITUATION_SUB_TAGS).filter(cat => !!selectedEmotionByGroup[cat]).map((cat) => {
                            const isExpanded = expandedGroups[cat];
                            const selectedCount = (selectedSituationTags[cat] || []).length;
                            return (
                                <View key={cat} style={styles.groupCard}>
                                    <TouchableOpacity
                                        style={styles.groupHeader}
                                        onPress={() => toggleGroup(cat)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.groupHeaderLeft}>
                                            <Text style={styles.groupTitle}>{cat}</Text>
                                            {selectedCount > 0 && (
                                                <View style={styles.selectedBadge}>
                                                    <Text style={styles.selectedBadgeText}>{selectedCount}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {isExpanded ? <ChevronUp size={20} color="#6B7280" /> : <ChevronDown size={20} color="#6B7280" />}
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.tagGrid}>
                                            {SITUATION_SUB_TAGS[cat].map((tag) => {
                                                const selected = (selectedSituationTags[cat] || []).includes(tag);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[styles.tagChip, selected && { backgroundColor: "#4A9B7F", borderColor: "#4A9B7F" }]}
                                                        onPress={() => toggleSituationTag(cat, tag)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.tagText, selected && styles.tagTextSelected]}>{tag}</Text>
                                                        {selected && <CheckCircle size={14} color="#FFF" style={{ marginLeft: 4 }} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                        <TouchableOpacity
                            style={[styles.actionButton, Object.keys(selectedSituationTags).length === 0 && styles.actionButtonDisabled]}
                            onPress={handleNextOrSave}
                            disabled={Object.keys(selectedSituationTags).length === 0 || submitting}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={Object.keys(selectedSituationTags).length > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                start={[0, 0]}
                                end={[1, 0]}
                                style={styles.actionButtonGradient}
                            >
                                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.actionButtonText}>Save Mood Check-in</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Confetti Overlay */}
            {showConfetti && (
                <View style={styles.confettiContainer}>
                    {confettiAnims.map((anim, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.confetti,
                                {
                                    backgroundColor: ["#F87171", "#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#EC4899"][i % 6],
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

            {/* Success Modal */}
            <Modal visible={showSuccessModal} transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIcon}>
                            <CheckCircle size={64} color="#4A9B7F" />
                        </View>
                        <Text style={styles.successTitle}>Mood Logged! 🌟</Text>
                        <Text style={styles.successMessage}>Your mood has been successfully saved</Text>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.modalButton}
                                onPress={handleGoToAnalytics}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={["#4A9B7F", "#14B8A6"]}
                                    start={[0, 0]}
                                    end={[1, 0]}
                                    style={styles.modalButtonGradient}
                                >
                                    <TrendingUp size={20} color="#FFF" />
                                    <Text style={styles.modalButtonText}>Check Analytics</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonSecondary]}
                                onPress={handleGoHome}
                                activeOpacity={0.8}
                            >
                                <Home size={20} color="#4A9B7F" />
                                <Text style={styles.modalButtonTextSecondary}>Go Home</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F8FAFC" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center" },
    headerTitle: { fontSize: 24, fontWeight: "700", color: "#4A9B7F" },
    scrollView: { flex: 1 },
    scrollContent: { padding: 20 },
    questionText: { fontSize: 24, fontWeight: "700", color: "#1F2937", textAlign: "center", marginBottom: 32 },
    moodGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
    moodCard: { width: "30%", aspectRatio: 1 },
    moodCardInner: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF", borderRadius: 20, borderWidth: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    moodEmoji: { fontSize: 48, marginBottom: 8 },
    moodLabel: { fontSize: 13, fontWeight: "600", color: "#1F2937" },
    selectedMoodHeader: { alignItems: "center", marginBottom: 32, backgroundColor: "#FFF", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    selectedMoodEmoji: { fontSize: 64, marginBottom: 12 },
    selectedMoodLabel: { fontSize: 28, fontWeight: "700", color: "#1F2937" },
    sectionTitle: { fontSize: 20, fontWeight: "700", color: "#1F2937", marginBottom: 20 },
    groupCard: { backgroundColor: "#FFF", borderRadius: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, overflow: "hidden" },
    groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
    groupHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    groupTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
    selectedBadge: { backgroundColor: "#4A9B7F", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
    selectedBadgeText: { fontSize: 12, fontWeight: "700", color: "#FFF" },
    tagGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingTop: 0 },
    tagChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "#F3F4F6", borderWidth: 1.5, borderColor: "#E5E7EB", flexDirection: "row", alignItems: "center" },
    tagText: { fontSize: 13, fontWeight: "600", color: "#374151" },
    tagTextSelected: { color: "#FFF" },
    actionButton: { borderRadius: 16, overflow: "hidden", marginTop: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
    actionButtonDisabled: { opacity: 0.5 },
    actionButtonGradient: { paddingVertical: 16, alignItems: "center", justifyContent: "center" },
    actionButtonText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
    modalContent: { backgroundColor: "#FFF", borderRadius: 24, padding: 32, width: "100%", maxWidth: 400, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
    successIcon: { marginBottom: 24 },
    successTitle: { fontSize: 28, fontWeight: "700", color: "#1F2937", marginBottom: 12, textAlign: "center" },
    successMessage: { fontSize: 16, color: "#6B7280", marginBottom: 32, textAlign: "center" },
    modalButtons: { width: "100%", gap: 12 },
    modalButton: { borderRadius: 16, overflow: "hidden" },
    modalButtonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
    modalButtonText: { fontSize: 17, fontWeight: "700", color: "#FFF" },
    modalButtonSecondary: { backgroundColor: "#F3F4F6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16 },
    modalButtonTextSecondary: { fontSize: 17, fontWeight: "600", color: "#4A9B7F" },
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
