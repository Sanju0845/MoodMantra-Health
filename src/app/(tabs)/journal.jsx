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
import { ArrowLeft, CheckCircle, TrendingUp, Home, Calendar, Check } from "lucide-react-native";
import { useRouter } from "expo-router";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

const { width } = Dimensions.get("window");

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

const EMOTION_TAGS_BY_GROUP = {
    Work: ["Stress", "Achievement", "Colleagues", "Challenge", "Deadline"],
    Relationships: ["Love", "Conflict", "Connection", "Loneliness", "Support"],
    Health: ["Energy", "Exercise", "Sleep", "Pain", "Wellness"],
    Personal: ["Growth", "Confidence", "Anxiety", "Relaxation", "Excitement"],
    Family: ["Bonding", "Arguments", "Care", "Celebration", "Worry"],
    Social: ["Friends", "Party", "Isolation", "Fun", "Awkward"],
    Finance: ["Security", "Debt", "Success", "Worry", "Investment"],
    Hobbies: ["Creative", "Learning", "Boredom", "Achievement", "Joy"],
};

const SITUATION_SUB_TAGS = {
    Work: ["Deadline", "Teamwork", "Overtime", "Promotion", "Meeting"],
    Relationships: ["Quality Time", "Argument", "Distance", "Understanding", "Support"],
    Health: ["Exercise", "Meditation", "Illness", "Recovery", "Routine"],
    Personal: ["Self-Care", "Therapy", "Journaling", "Goal Setting", "Reflection"],
    Family: ["Dinner Together", "Celebration", "Dispute", "Support", "Absence"],
    Social: ["Hangout", "Event", "Networking", "Isolation", "Game Night"],
    Finance: ["Budget", "Investment", "Bills", "Savings", "Bonus"],
    Hobbies: ["Reading", "Art", "Music", "Sports", "Gaming"],
};

export default function JournalScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [selectedMood, setSelectedMood] = useState(null);
    const [selectedEmotionByGroup, setSelectedEmotionByGroup] = useState({});
    const [step, setStep] = useState(1);
    const [selectedSituationTags, setSelectedSituationTags] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    const confettiAnims = useRef(
        Array.from({ length: 20 }, () => ({
            y: new Animated.Value(0),
            x: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, [step]);

    const handleMoodSelect = (mood) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedMood(mood);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        if (step === 2) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setStep(1);
        } else {
            setSelectedMood(null);
            setSelectedEmotionByGroup({});
            setSelectedSituationTags({});
            setStep(1);
        }
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
        const screenHeight = Dimensions.get('window').height;
        const screenWidth = Dimensions.get('window').width;

        confettiAnims.forEach((anim, index) => {
            // Random starting position at top of screen
            const startX = Math.random() * screenWidth;

            anim.y.setValue(-20);
            anim.x.setValue(startX);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: screenHeight + 50,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: startX + (Math.random() - 0.5) * 100,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    delay: 1500,
                    duration: 500,
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
                Alert.alert("Select Tags", "Please select at least one emotion");
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
        router.push("/(tabs)/mood/dashboard");
    };

    const getTotalSelectedEmotions = () => {
        return Object.values(selectedEmotionByGroup).reduce((sum, arr) => sum + arr.length, 0);
    };

    const getTotalSelectedSituations = () => {
        return Object.values(selectedSituationTags).reduce((sum, arr) => sum + arr.length, 0);
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Clean Professional Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerContent}>
                    {selectedMood ? (
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <ArrowLeft size={24} color="#1F2937" />
                        </TouchableOpacity>
                    ) : <View style={{ width: 40 }} />}
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>How are you feeling?</Text>
                        <Text style={styles.headerSubtitle}>Track your emotional journey</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Progress Indicator */}
                {selectedMood && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
                        <View style={styles.progressLine} />
                        <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                    {!selectedMood ? (
                        // STEP 0: Mood Selection - Improved UI
                        <View>
                            <View style={styles.moodGrid}>
                                {MOOD_DATA.map((mood) => (
                                    <TouchableOpacity
                                        key={mood.id}
                                        style={styles.moodCard}
                                        onPress={() => handleMoodSelect(mood)}
                                        activeOpacity={0.7}
                                    >
                                        <LinearGradient
                                            colors={[mood.color + '10', mood.color + '05']}
                                            style={styles.moodCardGradient}
                                        >
                                            <View style={[styles.moodCardInner, { borderColor: mood.color + '40' }]}>
                                                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                                                <Text style={[styles.moodLabel, { color: mood.color }]}>{mood.label}</Text>
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    ) : step === 1 ? (
                        // STEP 1: Emotion Tags Selection
                        <View>
                            <View style={styles.selectedMoodCard}>
                                <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
                                <View style={styles.selectedMoodInfo}>
                                    <Text style={styles.selectedMoodLabel}>{selectedMood.label}</Text>
                                    <Text style={styles.selectedMoodSubtext}>
                                        {getTotalSelectedEmotions()} emotion{getTotalSelectedEmotions() !== 1 ? 's' : ''} selected
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.sectionTitle}>What emotions are you experiencing?</Text>
                            <Text style={styles.sectionSubtext}>Select one or more emotions from the categories below</Text>

                            {Object.keys(EMOTION_TAGS_BY_GROUP).map((group) => {
                                const selectedInGroup = selectedEmotionByGroup[group] || [];
                                return (
                                    <View key={group} style={styles.categoryCard}>
                                        <View style={styles.categoryHeader}>
                                            <Text style={styles.categoryTitle}>{group}</Text>
                                            {selectedInGroup.length > 0 && (
                                                <View style={styles.selectedCountBadge}>
                                                    <Text style={styles.selectedCountBadgeText}>{selectedInGroup.length}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.emotionTagsContainer}>
                                            {EMOTION_TAGS_BY_GROUP[group].map((tag) => {
                                                const isSelected = selectedInGroup.includes(tag);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.emotionTag,
                                                            isSelected && styles.emotionTagSelected
                                                        ]}
                                                        onPress={() => toggleEmotionTag(group, tag)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.emotionTagText, isSelected && styles.emotionTagTextSelected]}>
                                                            {tag}
                                                        </Text>
                                                        {isSelected && <Check size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}

                            <TouchableOpacity
                                style={[styles.continueButton, getTotalSelectedEmotions() === 0 && styles.continueButtonDisabled]}
                                onPress={handleNextOrSave}
                                disabled={getTotalSelectedEmotions() === 0 || submitting}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={getTotalSelectedEmotions() > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                    start={[0, 0]}
                                    end={[1, 0]}
                                    style={styles.continueButtonGradient}
                                >
                                    <Text style={styles.continueButtonText}>Continue</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // STEP 2: Situation Tags Selection
                        <View>
                            <Text style={styles.sectionTitle}>Add situation details</Text>
                            <Text style={styles.sectionSubtext}>
                                {getTotalSelectedSituations()} detail{getTotalSelectedSituations() !== 1 ? 's' : ''} selected
                            </Text>

                            {Object.keys(SITUATION_SUB_TAGS).filter(cat => !!selectedEmotionByGroup[cat]).map((cat) => {
                                const selectedInCat = selectedSituationTags[cat] || [];
                                return (
                                    <View key={cat} style={styles.categoryCard}>
                                        <View style={styles.categoryHeader}>
                                            <Text style={styles.categoryTitle}>{cat}</Text>
                                            {selectedInCat.length > 0 && (
                                                <View style={styles.selectedCountBadge}>
                                                    <Text style={styles.selectedCountBadgeText}>{selectedInCat.length}</Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.emotionTagsContainer}>
                                            {SITUATION_SUB_TAGS[cat].map((tag) => {
                                                const isSelected = selectedInCat.includes(tag);
                                                return (
                                                    <TouchableOpacity
                                                        key={tag}
                                                        style={[
                                                            styles.emotionTag,
                                                            isSelected && styles.emotionTagSelected
                                                        ]}
                                                        onPress={() => toggleSituationTag(cat, tag)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Text style={[styles.emotionTagText, isSelected && styles.emotionTagTextSelected]}>
                                                            {tag}
                                                        </Text>
                                                        {isSelected && <Check size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                );
                            })}

                            <TouchableOpacity
                                style={[styles.continueButton, getTotalSelectedSituations() === 0 && styles.continueButtonDisabled]}
                                onPress={handleNextOrSave}
                                disabled={getTotalSelectedSituations() === 0 || submitting}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={getTotalSelectedSituations() > 0 ? ["#4A9B7F", "#14B8A6"] : ["#D1D5DB", "#9CA3AF"]}
                                    start={[0, 0]}
                                    end={[1, 0]}
                                    style={styles.continueButtonGradient}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <Text style={styles.continueButtonText}>Save Mood</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Success Modal with Confetti on Top */}
            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.successIcon}>
                            <CheckCircle size={60} color="#4A9B7F" />
                        </View>
                        <Text style={styles.modalTitle}>Mood Saved!</Text>
                        <Text style={styles.modalText}>
                            Great job tracking your emotions today
                        </Text>

                        <TouchableOpacity style={styles.modalButton} onPress={handleGoToAnalytics} activeOpacity={0.8}>
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
                            onPress={() => {
                                setShowSuccessModal(false);
                                setSelectedMood(null);
                                setSelectedSituationTags({});
                                setSelectedEmotionByGroup({});
                                setStep(1);
                                router.push("/(tabs)/mood/calendar");
                            }}
                            activeOpacity={0.8}
                        >
                            <Calendar size={20} color="#4A9B7F" />
                            <Text style={styles.modalButtonTextSecondary}>Mood Calendar</Text>
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

                    {/* Confetti - Inside Modal to appear on top */}
                    {showConfetti && (
                        <View style={styles.confettiContainer} pointerEvents="none">
                            {confettiAnims.map((anim, i) => (
                                <Animated.View
                                    key={i}
                                    style={[
                                        styles.confetti,
                                        {
                                            backgroundColor: ['#4A9B7F', '#14B8A6', '#F59E0B', '#EC4899', '#6366F1'][i % 5],
                                            transform: [{ translateY: anim.y }, { translateX: anim.x }],
                                            opacity: anim.opacity,
                                        },
                                    ]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#FFFFFF',
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    progressContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D1D5DB',
    },
    progressDotActive: {
        backgroundColor: '#4A9B7F',
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    emojiSelectionHeader: {
        marginBottom: 32,
        alignItems: "center",
    },
    questionText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 6,
        textAlign: 'center',
    },
    questionSubtext: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    moodGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    moodCard: {
        width: (width - 56) / 3,
        marginBottom: 12,
    },
    moodCardGradient: {
        borderRadius: 24,
        overflow: "hidden",
    },
    moodCardInner: {
        aspectRatio: 1,
        borderRadius: 20,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    moodEmoji: {
        fontSize: 32,
        marginBottom: 4,
    },
    moodLabel: {
        fontSize: 11,
        fontWeight: '600',
    },
    selectedMoodCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    selectedMoodEmoji: {
        fontSize: 48,
        marginRight: 16,
    },
    selectedMoodInfo: {
        flex: 1,
    },
    selectedMoodLabel: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    selectedMoodSubtext: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    sectionSubtext: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 20,
    },
    categoryCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    categoryHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    categoryTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    selectedCountBadge: {
        backgroundColor: "#4A9B7F",
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    selectedCountBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    emotionTagsContainer: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    emotionTag: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
    },
    emotionTagSelected: {
        backgroundColor: "#4A9B7F",
        borderColor: "#4A9B7F",
    },
    emotionTagText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#6B7280",
    },
    emotionTagTextSelected: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    continueButton: {
        marginTop: 24,
        borderRadius: 16,
        overflow: "hidden",
    },
    continueButtonDisabled: {
        opacity: 0.5,
    },
    continueButtonGradient: {
        paddingVertical: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 32,
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    successIcon: {
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    modalText: {
        fontSize: 15,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
    },
    modalButton: {
        width: "100%",
        marginBottom: 12,
        borderRadius: 12,
        overflow: "hidden",
    },
    modalButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 8,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    modalButtonSecondary: {
        backgroundColor: "#F3F4F6",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        gap: 8,
    },
    modalButtonTextSecondary: {
        fontSize: 16,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    confettiContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        elevation: 9999,
    },
    confetti: {
        position: "absolute",
        width: 12,
        height: 12,
        borderRadius: 6,
        top: 0,
        left: 0,
    },
});
