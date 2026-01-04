import { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
    Sparkles,
    ChevronRight,
    Brain,
    Heart,
    Lightbulb,
    Target,
    CheckCircle2,
    Clock,
    User,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function TeenAssessmentHome() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [hasStarted, setHasStarted] = useState(false);
    const [progress, setProgress] = useState(null);

    useEffect(() => {
        checkProgress();
    }, []);

    const checkProgress = async () => {
        try {
            const savedProgress = await AsyncStorage.getItem("teenAssessmentProgress");
            if (savedProgress) {
                setProgress(JSON.parse(savedProgress));
                setHasStarted(true);
            }
        } catch (error) {
            console.error("Error checking progress:", error);
        }
    };

    const modules = [
        {
            id: "A",
            title: "Natural Liking",
            subtitle: "What you're drawn to",
            description: "Discover what naturally energizes and excites you",
            icon: Heart,
            color: "#FF6B6B",
            bgColor: "#FEE2E2",
            questions: 5,
        },
        {
            id: "B",
            title: "Natural Strength",
            subtitle: "How your brain works",
            description: "Understand your cognitive processing style",
            icon: Brain,
            color: "#8B5CF6",
            bgColor: "#F3E8FF",
            questions: 5,
        },
        {
            id: "C",
            title: "Current Skill",
            subtitle: "What you can do",
            description: "Measure your present-day abilities",
            icon: Target,
            color: "#10B981",
            bgColor: "#D1FAE5",
            questions: 4,
        },
        {
            id: "D",
            title: "Friction & Comfort",
            subtitle: "What drains you",
            description: "Identify stress points and sources of energy",
            icon: Lightbulb,
            color: "#F59E0B",
            bgColor: "#FEF3C7",
            questions: 5,
        },
    ];

    const startAssessment = async () => {
        // Reset progress if starting fresh
        if (!hasStarted) {
            await AsyncStorage.removeItem("teenAssessmentProgress");
            await AsyncStorage.removeItem("teenAssessmentResults");
        }
        router.push("/(tabs)/teen-assessment/profile");
    };

    const continueAssessment = () => {
        if (progress) {
            router.push({
                pathname: "/(tabs)/teen-assessment/module",
                params: { module: progress.currentModule },
            });
        }
    };

    const viewResults = () => {
        router.push("/(tabs)/teen-assessment/report");
    };

    const ModuleCard = ({ module, index }) => {
        const Icon = module.icon;
        const completed = progress?.completed?.includes(module.id);
        const isCurrent = progress?.currentModule === module.id;

        return (
            <View style={styles.moduleCardWrapper}>
                <LinearGradient
                    colors={[module.color, module.color + "E6", module.color + "CC"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.moduleCard}
                >
                    {/* Background Pattern */}
                    <View style={styles.cardPattern}>
                        <View style={[styles.patternCircle, { top: -30, right: -30 }]} />
                        <View style={[styles.patternCircle, { bottom: -20, left: -20, opacity: 0.1 }]} />
                    </View>

                    <View style={styles.moduleCardContent}>
                        {/* Header */}
                        <View style={styles.moduleCardHeader}>
                            <View style={styles.moduleIconContainer}>
                                <Icon size={28} color="#FFFFFF" strokeWidth={2} />
                            </View>
                            {completed && (
                                <View style={styles.completedBadge}>
                                    <CheckCircle2 size={14} color="#10B981" strokeWidth={3} />
                                    <Text style={styles.completedText}>Done</Text>
                                </View>
                            )}
                            {isCurrent && !completed && (
                                <View style={styles.currentBadge}>
                                    <View style={styles.pulseDot} />
                                    <Text style={styles.currentText}>Current</Text>
                                </View>
                            )}
                        </View>

                        {/* Module Info */}
                        <View style={styles.moduleInfo}>
                            <Text style={styles.moduleNumber}>Module {module.id}</Text>
                            <Text style={styles.moduleTitle}>{module.title}</Text>
                            <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
                            <Text style={styles.moduleDescription}>{module.description}</Text>
                        </View>

                        {/* Footer */}
                        <View style={styles.moduleCardFooter}>
                            <View style={styles.moduleMetaRow}>
                                <Clock size={16} color="rgba(255, 255, 255, 0.9)" strokeWidth={2} />
                                <Text style={styles.moduleMetaText}>{module.questions} Questions</Text>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </View>
        );
    };

    const totalModules = modules.length;
    const completedModules = progress?.completed?.length || 0;
    const progressPercent = progress ? (completedModules / totalModules) * 100 : 0;

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <LinearGradient
                colors={["#FF6B6B", "#FF8E53", "#FFA940"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.header, { paddingTop: insets.top + 12 }]}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                            <Sparkles size={20} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Teen Assessment</Text>
                            <Text style={styles.headerSubtitle}>Ages 13-19 • Discover Your Path</Text>
                        </View>
                    </View>
                </View>

                {/* Progress Indicator (if started) */}
                {hasStarted && progress && !progress.isComplete && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressInfo}>
                            <Text style={styles.progressLabel}>Your Progress</Text>
                            <Text style={styles.progressText}>
                                {completedModules} of {totalModules} modules
                            </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                        </View>
                    </View>
                )}
            </LinearGradient>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Introduction Card */}
                {!hasStarted && (
                    <View style={styles.introCard}>
                        <Text style={styles.introTitle}>Discover Your Strengths & Interests</Text>
                        <Text style={styles.introText}>
                            This assessment helps you understand:
                        </Text>
                        <View style={styles.introList}>
                            <View style={styles.introListItem}>
                                <Heart size={18} color="#FF6B6B" strokeWidth={2} />
                                <Text style={styles.introListText}>What naturally excites you</Text>
                            </View>
                            <View style={styles.introListItem}>
                                <Brain size={18} color="#8B5CF6" strokeWidth={2} />
                                <Text style={styles.introListText}>How your brain processes info</Text>
                            </View>
                            <View style={styles.introListItem}>
                                <Target size={18} color="#10B981" strokeWidth={2} />
                                <Text style={styles.introListText}>Your current skills & abilities</Text>
                            </View>
                            <View style={styles.introListItem}>
                                <Lightbulb size={18} color="#F59E0B" strokeWidth={2} />
                                <Text style={styles.introListText}>What drains or stresses you</Text>
                            </View>
                        </View>

                        <View style={styles.disclaimerBox}>
                            <Text style={styles.disclaimerTitle}>Important to Know:</Text>
                            <Text style={styles.disclaimerText}>
                                • This is NOT a medical or psychological diagnosis{"\n"}
                                • This is NOT an IQ test or ranking{"\n"}
                                • This is NOT a job prediction tool{"\n"}
                                • This IS guidance for your exploration journey
                            </Text>
                        </View>

                        <View style={styles.timeEstimate}>
                            <Clock size={20} color="#6B7280" strokeWidth={2} />
                            <Text style={styles.timeText}>Estimated time: 15-20 minutes</Text>
                        </View>
                    </View>
                )}

                {/* Modules Overview */}
                <View style={styles.modulesSection}>
                    <Text style={styles.sectionTitle}>Assessment Modules</Text>
                    <Text style={styles.sectionSubtitle}>
                        Complete all 4 modules to get your personalized report
                    </Text>

                    {modules.map((module, index) => (
                        <ModuleCard key={module.id} module={module} index={index} />
                    ))}
                </View>

                {/* Call to Action */}
                {!hasStarted && (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={startAssessment}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={["#FF6B6B", "#FF8E53"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <User size={22} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.startButtonText}>Start Your Assessment</Text>
                            <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {hasStarted && progress && !progress.isComplete && (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={continueAssessment}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={["#10B981", "#059669"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Text style={styles.startButtonText}>Continue Assessment</Text>
                            <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {progress?.isComplete && (
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={viewResults}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={["#8B5CF6", "#7C3AED"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.startButtonGradient}
                        >
                            <Sparkles size={22} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.startButtonText}>View Your Report</Text>
                            <ChevronRight size={22} color="#FFFFFF" strokeWidth={2.5} />
                        </LinearGradient>
                    </TouchableOpacity>
                )}
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
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
        elevation: 10,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.25)",
    },
    headerTextContainer: {
        marginLeft: 14,
        flex: 1,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: -0.3,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.88)",
        fontWeight: "500",
        letterSpacing: 0.1,
    },
    progressContainer: {
        marginTop: 16,
        marginHorizontal: 20,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.2)",
    },
    progressInfo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10,
    },
    progressLabel: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.95)",
    },
    progressText: {
        fontSize: 13,
        fontWeight: "700",
        color: "#FFFFFF",
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
    introCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        marginBottom: 28,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    introTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    introText: {
        fontSize: 15,
        color: "#6B7280",
        marginBottom: 16,
        lineHeight: 22,
    },
    introList: {
        marginBottom: 20,
    },
    introListItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
        gap: 12,
    },
    introListText: {
        fontSize: 14,
        color: "#374151",
        fontWeight: "500",
        flex: 1,
    },
    disclaimerBox: {
        backgroundColor: "#FEF3C7",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
    },
    disclaimerTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#92400E",
        marginBottom: 8,
    },
    disclaimerText: {
        fontSize: 13,
        color: "#78350F",
        lineHeight: 20,
    },
    timeEstimate: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: "#F3F4F6",
        padding: 12,
        borderRadius: 10,
    },
    timeText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },
    modulesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 16,
    },
    moduleCardWrapper: {
        marginBottom: 16,
    },
    moduleCard: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    cardPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
    },
    patternCircle: {
        position: "absolute",
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(255, 255, 255, 0.12)",
    },
    moduleCardContent: {
        padding: 20,
    },
    moduleCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    moduleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    completedBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    completedText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#10B981",
        letterSpacing: 0.3,
    },
    currentBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.3)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.4)",
    },
    pulseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#FFFFFF",
    },
    currentText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
    moduleInfo: {
        marginBottom: 18,
    },
    moduleNumber: {
        fontSize: 12,
        fontWeight: "700",
        color: "rgba(255, 255, 255, 0.85)",
        marginBottom: 6,
        letterSpacing: 1,
        textTransform: "uppercase",
    },
    moduleTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    moduleSubtitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "rgba(255, 255, 255, 0.9)",
        marginBottom: 8,
    },
    moduleDescription: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.85)",
        lineHeight: 20,
    },
    moduleCardFooter: {
        borderTopWidth: 1,
        borderTopColor: "rgba(255, 255, 255, 0.2)",
        paddingTop: 14,
    },
    moduleMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    moduleMetaText: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.95)",
        fontWeight: "600",
    },
    startButton: {
        marginTop: 8,
        marginBottom: 24,
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 8,
    },
    startButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 12,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.3,
    },
});
