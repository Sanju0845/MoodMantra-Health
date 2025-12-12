import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertCircle,
    ArrowLeft,
} from "lucide-react-native";
import api from "../../../utils/api";

export default function TakeAssessmentScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { id, title, therapyType } = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [assessment, setAssessment] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [startTime] = useState(new Date().toISOString());
    const [progressAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    useEffect(() => {
        if (assessment) {
            const progress = ((currentQuestion + 1) / assessment.questions.length) * 100;
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [currentQuestion, assessment]);

    const fetchAssessment = async () => {
        try {
            // Reset to first question whenever loading a new assessment
            setCurrentQuestion(0);
            const data = await api.getAssessmentById(id);
            console.log("[TakeAssessment] Fetched assessment:", data?.title);
            setAssessment(data);
            setAnswers(new Array(data.questions?.length || 0).fill(null));
        } catch (error) {
            console.error("[TakeAssessment] Error:", error);
            Alert.alert("Error", "Failed to load assessment", [
                { text: "OK", onPress: () => router.back() },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerSelect = (value) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = {
            questionId: assessment.questions[currentQuestion]._id,
            selectedOption: value,
        };
        setAnswers(newAnswers);

        // Auto-advance after short delay
        if (currentQuestion < assessment.questions.length - 1) {
            setTimeout(() => {
                setCurrentQuestion(currentQuestion + 1);
            }, 300);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleNext = () => {
        if (currentQuestion < assessment.questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handleSubmit = async () => {
        // Check if all questions are answered
        const unanswered = answers.filter((a) => a === null).length;
        if (unanswered > 0) {
            Alert.alert(
                "Incomplete Assessment",
                `Please answer all questions. You have ${unanswered} unanswered question(s).`
            );
            return;
        }

        setSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem("userId");

            if (!userId) {
                Alert.alert(
                    "Login Required",
                    "Please login to save your assessment results.",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Login", onPress: () => router.push("/(auth)/signin") },
                    ]
                );
                setSubmitting(false);
                return;
            }

            const result = await api.submitAssessment({
                userId,
                assessmentId: id,
                title: assessment.title,
                answers,
                therapyType: therapyType || "individual",
                startTime,
            });

            console.log("[TakeAssessment] Submitted:", result);

            // Navigate to result screen
            router.replace({
                pathname: "/(tabs)/assessment/result",
                params: {
                    score: result.totalScore,
                    result: result.result,
                    recommendations: JSON.stringify(result.recommendations || []),
                    title: assessment.title,
                },
            });
        } catch (error) {
            console.error("[TakeAssessment] Submit error:", error);
            Alert.alert("Error", error.message || "Failed to submit assessment");
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (answers.some((a) => a !== null)) {
            Alert.alert(
                "Exit Assessment?",
                "Your progress will not be saved.",
                [
                    { text: "Continue", style: "cancel" },
                    { text: "Exit", style: "destructive", onPress: () => router.back() },
                ]
            );
        } else {
            router.back();
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar style="light" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.loadingText}>Loading assessment...</Text>
                </View>
            </View>
        );
    }

    if (!assessment) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.errorContainer}>
                    <AlertCircle size={48} color="#EF4444" />
                    <Text style={styles.errorText}>Assessment not found</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const question = assessment.questions[currentQuestion];
    const currentAnswer = answers[currentQuestion]?.selectedOption;
    const isLastQuestion = currentQuestion === assessment.questions.length - 1;

    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"],
    });

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="light" />

            {/* Header with Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleClose} style={styles.backHeaderButton}>
                    <ArrowLeft size={20} color="#FFFFFF" />
                    <Text style={styles.backHeaderText}>Back</Text>
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {assessment.title}
                    </Text>
                    <Text style={styles.headerProgress}>
                        Question {currentQuestion + 1} of {assessment.questions.length}
                    </Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { width: progressWidth }
                        ]}
                    />
                </View>
            </View>

            {/* Question */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.questionText}>{question.text}</Text>

                {/* Options */}
                <View style={styles.optionsContainer}>
                    {question.options.map((option, index) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.optionButton,
                                    isSelected && styles.optionButtonSelected,
                                ]}
                                onPress={() => handleAnswerSelect(option.value)}
                                activeOpacity={0.7}
                            >
                                <View style={[
                                    styles.optionRadio,
                                    isSelected && styles.optionRadioSelected,
                                ]}>
                                    {isSelected && <Check size={14} color="#FFFFFF" />}
                                </View>
                                <Text style={[
                                    styles.optionText,
                                    isSelected && styles.optionTextSelected,
                                ]}>
                                    {option.text}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Navigation Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 90 }]}>
                <TouchableOpacity
                    style={[styles.navButton, currentQuestion === 0 && styles.navButtonDisabled]}
                    onPress={handlePrevious}
                    disabled={currentQuestion === 0}
                >
                    <ChevronLeft size={20} color={currentQuestion === 0 ? "#D1D5DB" : "#6B7280"} />
                    <Text style={[
                        styles.navButtonText,
                        currentQuestion === 0 && styles.navButtonTextDisabled,
                    ]}>
                        Previous
                    </Text>
                </TouchableOpacity>

                {isLastQuestion ? (
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!currentAnswer || submitting) && styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!currentAnswer || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <Text style={styles.submitButtonText}>Submit</Text>
                                <Check size={18} color="#FFFFFF" />
                            </>
                        )}
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.navButton, styles.navButtonNext]}
                        onPress={handleNext}
                    >
                        <Text style={[styles.navButtonText, styles.navButtonTextNext]}>
                            Next
                        </Text>
                        <ChevronRight size={20} color="#8B5CF6" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#8B5CF6",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#FFFFFF",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    errorText: {
        fontSize: 18,
        color: "#374151",
        marginTop: 16,
    },
    backButton: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: "#8B5CF6",
        borderRadius: 8,
    },
    backButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backHeaderButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
    },
    backHeaderText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: "500",
        color: "#FFFFFF",
    },
    headerInfo: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    headerProgress: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    headerSpacer: {
        width: 60,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    progressTrack: {
        height: 6,
        backgroundColor: "rgba(255,255,255,0.3)",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#FEF08A",
        borderRadius: 3,
    },
    content: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    contentContainer: {
        padding: 24,
        paddingTop: 32,
    },
    questionText: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        lineHeight: 28,
        marginBottom: 32,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    optionButtonSelected: {
        borderColor: "#8B5CF6",
        backgroundColor: "#F5F3FF",
    },
    optionRadio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    optionRadioSelected: {
        borderColor: "#8B5CF6",
        backgroundColor: "#8B5CF6",
    },
    optionText: {
        flex: 1,
        fontSize: 16,
        color: "#374151",
        lineHeight: 22,
    },
    optionTextSelected: {
        color: "#7C3AED",
        fontWeight: "500",
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 16,
        backgroundColor: "#FFFFFF",
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    navButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
    },
    navButtonNext: {
        backgroundColor: "#F5F3FF",
    },
    navButtonDisabled: {
        opacity: 0.5,
    },
    navButtonText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#6B7280",
    },
    navButtonTextNext: {
        color: "#8B5CF6",
    },
    navButtonTextDisabled: {
        color: "#D1D5DB",
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: "#8B5CF6",
        gap: 8,
    },
    submitButtonDisabled: {
        backgroundColor: "#C4B5FD",
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
