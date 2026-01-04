import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    ArrowLeft,
    ChevronRight,
    Clock,
    Check,
    Heart,
    Brain,
    Target,
    Lightbulb,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { assessmentModules } from "./assessmentData";

const iconMap = {
    Heart,
    Brain,
    Target,
    Lightbulb,
};

export default function ModuleScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams();
    const moduleId = params.module;

    const moduleData = assessmentModules[moduleId];
    const Icon = iconMap[moduleData.icon];

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [startTimes, setStartTimes] = useState({});
    const [textResponses, setTextResponses] = useState({});

    useEffect(() => {
        // Record start time for current question (for Module B timing)
        if (moduleData.type === "timed-quiz") {
            const questionId = getCurrentQuestion().id;
            if (!startTimes[questionId]) {
                setStartTimes((prev) => ({
                    ...prev,
                    [questionId]: Date.now(),
                }));
            }
        }
    }, [currentQuestionIndex]);

    const getCurrentQuestion = () => {
        if (moduleData.type === "open-ended") {
            return moduleData.tasks[currentQuestionIndex];
        }
        return moduleData.questions[currentQuestionIndex];
    };

    const getTotalQuestions = () => {
        if (moduleData.type === "open-ended") {
            return moduleData.tasks.length;
        }
        return moduleData.questions.length;
    };

    const handleSelectOption = (optionIndex) => {
        const currentQuestion = getCurrentQuestion();
        setAnswers({
            ...answers,
            [currentQuestion.id]: optionIndex,
        });
    };

    const handleTextResponse = (text) => {
        const currentQuestion = getCurrentQuestion();
        setTextResponses({
            ...textResponses,
            [currentQuestion.id]: text,
        });
    };

    const canProceed = () => {
        const currentQuestion = getCurrentQuestion();

        if (moduleData.type === "open-ended") {
            const text = textResponses[currentQuestion.id] || "";
            const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
            return wordCount >= currentQuestion.minWords;
        }

        return answers[currentQuestion.id] !== undefined;
    };

    const handleNext = () => {
        if (currentQuestionIndex < getTotalQuestions() - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            completeModule();
        }
    };

    const completeModule = async () => {
        try {
            // Calculate scores based on module type
            let moduleResults = {};

            if (moduleData.type === "multiple-choice") {
                // Module A: Natural Liking
                const domainScores = { A: 0, C: 0, S: 0, P: 0 };
                Object.keys(answers).forEach((questionId) => {
                    const question = moduleData.questions.find((q) => q.id === questionId);
                    const selectedOption = question.options[answers[questionId]];
                    domainScores[selectedOption.domain] += 2;
                });
                moduleResults = { type: "interest", scores: domainScores };
            } else if (moduleData.type === "timed-quiz") {
                // Module B: Natural Strength
                const domainScores = { A: 0, C: 0, S: 0, P: 0 };
                Object.keys(answers).forEach((questionId) => {
                    const question = moduleData.questions.find((q) => q.id === questionId);
                    const selectedOption = question.options[answers[questionId]];

                    if (selectedOption.correct) {
                        domainScores[selectedOption.domain] += 2;

                        // Bonus for fast response (under 10 seconds)
                        const timeTaken = (Date.now() - startTimes[questionId]) / 1000;
                        if (timeTaken < 10) {
                            domainScores[selectedOption.domain] += 1;
                        }
                    }
                });
                moduleResults = { type: "strength", scores: domainScores };
            } else if (moduleData.type === "open-ended") {
                // Module C: Current Skill
                // For MVP, we'll do basic scoring. In production, use AI/NLP
                const taskScores = {};
                Object.keys(textResponses).forEach((taskId) => {
                    const task = moduleData.tasks.find((t) => t.id === taskId);
                    const text = textResponses[taskId];
                    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

                    // Basic scoring (0-5)
                    let score = 3; // Default
                    if (wordCount >= task.maxWords * 0.8) score = 4;
                    if (text.includes("because") || text.includes("Therefore") || text.includes("However")) {
                        score += 1;
                    }

                    taskScores[taskId] = {
                        domain: task.domain,
                        score: Math.min(score, 5),
                    };
                });

                // Aggregate to domains
                const domainScores = { A: 0, C: 0, S: 0, P: 0 };
                const domainCounts = { A: 0, C: 0, S: 0, P: 0 };

                Object.values(taskScores).forEach((taskScore) => {
                    domainScores[taskScore.domain] += taskScore.score;
                    domainCounts[taskScore.domain] += 1;
                });

                // Convert to 0-10 scale
                Object.keys(domainScores).forEach((domain) => {
                    if (domainCounts[domain] > 0) {
                        domainScores[domain] = (domainScores[domain] / domainCounts[domain]) * 2;
                    }
                });

                moduleResults = { type: "skill", scores: domainScores, responses: textResponses };
            } else if (moduleData.type === "friction-assessment") {
                // Module D: Friction & Comfort
                let totalScore = 0;
                let maxScore = 0;

                Object.keys(answers).forEach((questionId) => {
                    const question = moduleData.questions.find((q) => q.id === questionId);
                    const selectedOption = question.options[answers[questionId]];
                    totalScore += selectedOption.score;
                    maxScore += 2;
                });

                // Convert to 0-10 scale
                const comfortScore = (totalScore / maxScore) * 10;

                moduleResults = {
                    type: "comfort",
                    score: comfortScore,
                    // Distribute evenly across domains for now
                    scores: {
                        A: comfortScore,
                        C: comfortScore,
                        S: comfortScore,
                        P: comfortScore,
                    }
                };
            }

            // Save results
            const existingResults = await AsyncStorage.getItem("teenAssessmentResults");
            const results = existingResults ? JSON.parse(existingResults) : {};
            results[moduleId] = moduleResults;
            await AsyncStorage.setItem("teenAssessmentResults", JSON.stringify(results));

            // Update progress
            const progressData = await AsyncStorage.getItem("teenAssessmentProgress");
            const progress = JSON.parse(progressData);

            if (!progress.completed.includes(moduleId)) {
                progress.completed.push(moduleId);
            }

            // Determine next module
            const moduleOrder = ["A", "B", "C", "D"];
            const currentIndex = moduleOrder.indexOf(moduleId);

            if (currentIndex < moduleOrder.length - 1) {
                progress.currentModule = moduleOrder[currentIndex + 1];
                await AsyncStorage.setItem("teenAssessmentProgress", JSON.stringify(progress));

                // Navigate to next module
                Alert.alert(
                    "Module Complete! 🎉",
                    `Great job! Ready for the next module?`,
                    [
                        {
                            text: "Take a Break",
                            onPress: () => router.push("/(tabs)/teen-assessment"),
                        },
                        {
                            text: "Continue",
                            onPress: () =>
                                router.push({
                                    pathname: "/(tabs)/teen-assessment/module",
                                    params: { module: moduleOrder[currentIndex + 1] },
                                }),
                        },
                    ]
                );
            } else {
                // All modules complete
                progress.isComplete = true;
                progress.completedAt = new Date().toISOString();
                await AsyncStorage.setItem("teenAssessmentProgress", JSON.stringify(progress));

                Alert.alert(
                    "Assessment Complete! 🎊",
                    "Congratulations! You've completed all modules. Let's see your results!",
                    [
                        {
                            text: "View Report",
                            onPress: () => router.push("/(tabs)/teen-assessment/report"),
                        },
                    ]
                );
            }
        } catch (error) {
            console.error("Error completing module:", error);
            Alert.alert("Error", "Failed to save your responses. Please try again.");
        }
    };

    const currentQuestion = getCurrentQuestion();
    const currentQuestionNumber = currentQuestionIndex + 1;
    const totalQuestions = getTotalQuestions();
    const progressPercent = (currentQuestionNumber / totalQuestions) * 100;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient
                colors={[moduleData.color, moduleData.color + "E6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerTop}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={styles.headerModuleNumber}>Module {moduleId}</Text>
                        <Text style={styles.headerTitle}>{moduleData.title}</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                            Question {currentQuestionNumber} of {totalQuestions}
                        </Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                </View>
            </LinearGradient>

            {/* Question Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Question Card */}
                <View style={styles.questionCard}>
                    <View style={styles.questionIconContainer}>
                        <Icon size={32} color={moduleData.color} strokeWidth={2} />
                    </View>

                    <Text style={styles.questionText}>
                        {currentQuestion.question || currentQuestion.prompt}
                    </Text>

                    {/* Render based on module type */}
                    {(moduleData.type === "multiple-choice" ||
                        moduleData.type === "timed-quiz" ||
                        moduleData.type === "friction-assessment") && (
                            <View style={styles.optionsContainer}>
                                {currentQuestion.options.map((option, index) => {
                                    const isSelected = answers[currentQuestion.id] === index;
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={[
                                                styles.optionButton,
                                                isSelected && {
                                                    ...styles.optionButtonSelected,
                                                    borderColor: moduleData.color,
                                                    backgroundColor: moduleData.color + "15",
                                                },
                                            ]}
                                            onPress={() => handleSelectOption(index)}
                                            activeOpacity={0.7}
                                        >
                                            <View
                                                style={[
                                                    styles.optionRadio,
                                                    isSelected && {
                                                        ...styles.optionRadioSelected,
                                                        backgroundColor: moduleData.color,
                                                    },
                                                ]}
                                            >
                                                {isSelected && (
                                                    <Check size={16} color="#FFFFFF" strokeWidth={3} />
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    isSelected && styles.optionTextSelected,
                                                ]}
                                            >
                                                {option.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                    {moduleData.type === "open-ended" && (
                        <View style={styles.textInputContainer}>
                            <Text style={styles.textInputHint}>
                                Word count: {currentQuestion.minWords} - {currentQuestion.maxWords} words
                            </Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="Type your answer here..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={8}
                                value={textResponses[currentQuestion.id] || ""}
                                onChangeText={handleTextResponse}
                                textAlignVertical="top"
                            />
                            <Text style={styles.wordCounter}>
                                {(textResponses[currentQuestion.id] || "")
                                    .trim()
                                    .split(/\s+/)
                                    .filter(Boolean).length}{" "}
                                words
                            </Text>
                        </View>
                    )}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                    style={[
                        styles.nextButton,
                        !canProceed() && styles.nextButtonDisabled,
                    ]}
                    onPress={handleNext}
                    disabled={!canProceed()}
                    activeOpacity={0.9}
                >
                    <LinearGradient
                        colors={
                            canProceed()
                                ? [moduleData.color, moduleData.color + "CC"]
                                : ["#D1D5DB", "#9CA3AF"]
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.nextButtonGradient}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentQuestionIndex < totalQuestions - 1
                                ? "Next Question"
                                : "Complete Module"}
                        </Text>
                        <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        paddingBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    headerTop: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    headerInfo: {
        flex: 1,
        alignItems: "center",
    },
    headerModuleNumber: {
        fontSize: 12,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.85)",
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: -0.3,
        marginTop: 2,
    },
    progressContainer: {
        marginHorizontal: 20,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    progressInfo: {
        marginBottom: 8,
    },
    progressText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#FFFFFF",
        textAlign: "center",
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: "rgba(255, 255, 255, 0.25)",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#FFFFFF",
        borderRadius: 3,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
        paddingHorizontal: 20,
    },
    questionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    questionIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    questionText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        lineHeight: 26,
        marginBottom: 24,
    },
    optionsContainer: {
        gap: 12,
    },
    optionButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        padding: 16,
        gap: 14,
    },
    optionButtonSelected: {
        borderWidth: 2,
    },
    optionRadio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: "#D1D5DB",
        justifyContent: "center",
        alignItems: "center",
    },
    optionRadioSelected: {
        borderColor: "transparent",
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: "#374151",
        fontWeight: "500",
        lineHeight: 22,
    },
    optionTextSelected: {
        fontWeight: "700",
        color: "#1F2937",
    },
    textInputContainer: {
        marginTop: 8,
    },
    textInputHint: {
        fontSize: 13,
        color: "#6B7280",
        marginBottom: 10,
        fontWeight: "500",
    },
    textInput: {
        backgroundColor: "#F9FAFB",
        borderWidth: 2,
        borderColor: "#E5E7EB",
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        color: "#1F2937",
        minHeight: 160,
        fontWeight: "500",
    },
    wordCounter: {
        fontSize: 13,
        color: "#9CA3AF",
        marginTop: 8,
        textAlign: "right",
        fontWeight: "600",
    },
    nextButton: {
        marginBottom: 24,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    nextButtonDisabled: {
        shadowOpacity: 0.05,
        elevation: 2,
    },
    nextButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 12,
    },
    nextButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
