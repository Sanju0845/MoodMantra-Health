import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Trophy,
    CheckCircle,
    ArrowLeft,
    ClipboardList,
    Sparkles,
    Calendar,
    UserCheck,
} from "lucide-react-native";

export default function AssessmentResultScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { score, result, recommendations, title } = useLocalSearchParams();

    const parsedRecommendations = recommendations ? JSON.parse(recommendations) : [];

    // Determine severity color and icon based on result text
    const getSeverityStyle = () => {
        const resultLower = result?.toLowerCase() || "";
        if (resultLower.includes("severe") || resultLower.includes("high")) {
            return { color: "#EF4444", bgColor: "#FEE2E2", icon: "alert" };
        } else if (resultLower.includes("moderate") || resultLower.includes("medium")) {
            return { color: "#F59E0B", bgColor: "#FEF3C7", icon: "warning" };
        } else if (resultLower.includes("mild") || resultLower.includes("low")) {
            return { color: "#10B981", bgColor: "#D1FAE5", icon: "good" };
        }
        return { color: "#8B5CF6", bgColor: "#F3E8FF", icon: "neutral" };
    };

    const severity = getSeverityStyle();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 220 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Trophy size={48} color="#F59E0B" />
                    </View>
                    <Text style={styles.headerTitle}>Assessment Complete!</Text>
                    <Text style={styles.headerSubtitle}>{title}</Text>
                </View>

                {/* Score Card */}
                <View style={styles.scoreCard}>
                    <View style={styles.scoreContent}>
                        <Text style={styles.scoreLabel}>Your Score</Text>
                        <Text style={styles.scoreValue}>{score}</Text>
                    </View>
                    <View style={[styles.resultBadge, { backgroundColor: severity.bgColor }]}>
                        <Text style={[styles.resultText, { color: severity.color }]}>
                            {result}
                        </Text>
                    </View>
                </View>

                {/* Recommendations */}
                {parsedRecommendations.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Sparkles size={20} color="#8B5CF6" />
                            <Text style={styles.sectionTitle}>Recommendations</Text>
                        </View>
                        <View style={styles.recommendationsList}>
                            {parsedRecommendations.map((rec, index) => (
                                <View key={index} style={styles.recommendationItem}>
                                    <CheckCircle size={18} color="#10B981" />
                                    <Text style={styles.recommendationText}>{rec}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Next Steps */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <UserCheck size={20} color="#8B5CF6" />
                        <Text style={styles.sectionTitle}>Next Steps</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push("/(tabs)/doctors")}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: "#DBEAFE" }]}>
                            <UserCheck size={24} color="#3B82F6" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Consult a Professional</Text>
                            <Text style={styles.actionSubtitle}>
                                Talk to a therapist about your results
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push("/(tabs)/assessment")}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: "#F3E8FF" }]}>
                            <ClipboardList size={24} color="#8B5CF6" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Take Another Assessment</Text>
                            <Text style={styles.actionSubtitle}>
                                Explore more mental health evaluations
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => router.push("/(tabs)/journal")}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: "#D1FAE5" }]}>
                            <Calendar size={24} color="#10B981" />
                        </View>
                        <View style={styles.actionContent}>
                            <Text style={styles.actionTitle}>Track Your Mood</Text>
                            <Text style={styles.actionSubtitle}>
                                Monitor how you feel over time
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Back Button - inside scroll */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.replace("/(tabs)/assessment")}
                >
                    <ArrowLeft size={20} color="#6B7280" />
                    <Text style={styles.backButtonText}>Back to Assessments</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#FEF3C7",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6B7280",
    },
    scoreCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    scoreContent: {
        alignItems: "center",
        marginBottom: 16,
    },
    scoreLabel: {
        fontSize: 14,
        color: "#6B7280",
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 56,
        fontWeight: "700",
        color: "#1F2937",
    },
    resultBadge: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    resultText: {
        fontSize: 16,
        fontWeight: "600",
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginLeft: 8,
    },
    recommendationsList: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
    },
    recommendationItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    recommendationText: {
        flex: 1,
        fontSize: 15,
        color: "#374151",
        marginLeft: 12,
        lineHeight: 22,
    },
    actionCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    actionContent: {
        flex: 1,
        marginLeft: 14,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
    },
    actionSubtitle: {
        fontSize: 13,
        color: "#6B7280",
        marginTop: 2,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        marginTop: 8,
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 15,
        fontWeight: "500",
        color: "#6B7280",
    },
});
