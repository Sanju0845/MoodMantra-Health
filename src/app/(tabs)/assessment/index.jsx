import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    ClipboardList,
    ChevronRight,
    Brain,
    Heart,
    Smile,
    Users,
    User,
    Sparkles,
    Clock,
    CheckCircle,
} from "lucide-react-native";
import api from "../../../utils/api";

// Therapy type icons and colors
const therapyTypeConfig = {
    individual: { icon: User, color: "#8B5CF6", bgColor: "#F3E8FF", label: "Individual" },
    couple: { icon: Heart, color: "#EC4899", bgColor: "#FCE7F3", label: "Couples" },
    family: { icon: Users, color: "#10B981", bgColor: "#D1FAE5", label: "Family" },
    child: { icon: Smile, color: "#F59E0B", bgColor: "#FEF3C7", label: "Child" },
};

export default function AssessmentScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assessments, setAssessments] = useState([]);
    const [userAssessments, setUserAssessments] = useState([]);
    const [selectedTherapyType, setSelectedTherapyType] = useState("individual");
    const [userId, setUserId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            // Get user ID
            const storedUserId = await AsyncStorage.getItem("userId");
            setUserId(storedUserId);

            // Fetch assessments by therapy type
            const assessmentsData = await api.getAssessments(selectedTherapyType);
            console.log("[Assessment] Fetched assessments:", assessmentsData?.length || 0);
            setAssessments(Array.isArray(assessmentsData) ? assessmentsData : []);

            // Fetch user's assessment history if logged in
            if (storedUserId) {
                try {
                    const userAssessmentsData = await api.getUserAssessments(storedUserId);
                    setUserAssessments(Array.isArray(userAssessmentsData) ? userAssessmentsData : []);
                } catch (err) {
                    console.log("[Assessment] No user assessments found");
                    setUserAssessments([]);
                }
            }
        } catch (error) {
            console.error("[Assessment] Error fetching data:", error);
            setAssessments([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedTherapyType]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleStartAssessment = (assessment) => {
        router.push({
            pathname: "/(tabs)/assessment/take",
            params: {
                id: assessment._id,
                title: assessment.title,
                therapyType: selectedTherapyType,
            },
        });
    };

    // Check if user has completed this assessment recently
    const hasCompletedRecently = (assessmentId) => {
        const recent = userAssessments.find(
            (ua) => ua.assessmentId === assessmentId
        );
        if (!recent) return false;
        // Consider "recently" as within the last 7 days
        const completedDate = new Date(recent.completedAt);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return completedDate > sevenDaysAgo;
    };

    const TherapyTypeTab = ({ type, config }) => (
        <TouchableOpacity
            onPress={() => {
                setSelectedTherapyType(type);
                setLoading(true);
            }}
            style={[
                styles.therapyTab,
                selectedTherapyType === type && {
                    backgroundColor: config.bgColor,
                    borderColor: config.color,
                },
            ]}
        >
            <config.icon
                size={18}
                color={selectedTherapyType === type ? config.color : "#9CA3AF"}
            />
            <Text
                style={[
                    styles.therapyTabText,
                    selectedTherapyType === type && { color: config.color },
                ]}
            >
                {config.label}
            </Text>
        </TouchableOpacity>
    );

    const AssessmentCard = ({ assessment }) => {
        const completed = hasCompletedRecently(assessment._id);
        const config = therapyTypeConfig[selectedTherapyType];

        return (
            <TouchableOpacity
                style={styles.assessmentCard}
                onPress={() => handleStartAssessment(assessment)}
                activeOpacity={0.7}
            >
                <View style={[styles.cardAccent, { backgroundColor: config.color }]} />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.cardIcon, { backgroundColor: config.bgColor }]}>
                            <ClipboardList size={24} color={config.color} />
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle}>{assessment.title}</Text>
                            <View style={styles.cardMeta}>
                                <Clock size={14} color="#9CA3AF" />
                                <Text style={styles.cardMetaText}>
                                    {assessment.questions?.length || 0} questions
                                </Text>
                                {completed && (
                                    <>
                                        <CheckCircle size={14} color="#10B981" style={{ marginLeft: 8 }} />
                                        <Text style={[styles.cardMetaText, { color: "#10B981" }]}>
                                            Completed
                                        </Text>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {assessment.description}
                    </Text>
                    <View style={styles.cardFooter}>
                        <View style={[styles.startButton, { backgroundColor: config.color }]}>
                            <Text style={styles.startButtonText}>
                                {completed ? "Retake" : "Start Now"}
                            </Text>
                            <ChevronRight size={16} color="#FFFFFF" />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.loadingText}>Loading assessments...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Brain size={28} color="#8B5CF6" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Assessments</Text>
                        <Text style={styles.headerSubtitle}>Understand your mental health</Text>
                    </View>
                </View>
            </View>

            {/* Therapy Type Tabs */}
            <View style={styles.therapyTabs}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Object.entries(therapyTypeConfig).map(([type, config]) => (
                        <TherapyTypeTab key={type} type={type} config={config} />
                    ))}
                </ScrollView>
            </View>

            {/* Assessments List */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 100 },
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={styles.infoBanner}>
                    <Sparkles size={20} color="#F59E0B" />
                    <Text style={styles.infoBannerText}>
                        Take assessments to get personalized recommendations and track your progress
                    </Text>
                </View>

                {assessments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <ClipboardList size={48} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No assessments available</Text>
                        <Text style={styles.emptySubtitle}>
                            Check back later for {therapyTypeConfig[selectedTherapyType].label.toLowerCase()} therapy assessments
                        </Text>
                    </View>
                ) : (
                    assessments.map((assessment) => (
                        <AssessmentCard key={assessment._id} assessment={assessment} />
                    ))
                )}

                {/* User's Recent Assessments */}
                {userAssessments.length > 0 && (
                    <View style={styles.historySection}>
                        <Text style={styles.sectionTitle}>Your Recent Results</Text>
                        {userAssessments.slice(0, 3).map((result) => (
                            <View key={result._id} style={styles.historyCard}>
                                <View style={styles.historyHeader}>
                                    <Text style={styles.historyTitle}>{result.title}</Text>
                                    <Text style={styles.historyDate}>
                                        {new Date(result.completedAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.historyResult}>
                                    <Text style={styles.historyScore}>Score: {result.totalScore}</Text>
                                    <Text style={[
                                        styles.historyResultText,
                                        {
                                            color: result.result?.includes("Severe") ? "#EF4444" :
                                                result.result?.includes("Moderate") ? "#F59E0B" : "#10B981"
                                        }
                                    ]}>
                                        {result.result}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: "#6B7280",
    },
    header: {
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerText: {
        marginLeft: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#6B7280",
        marginTop: 2,
    },
    therapyTabs: {
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    therapyTab: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#FFFFFF",
    },
    therapyTabText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: "500",
        color: "#6B7280",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    infoBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    infoBannerText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 14,
        color: "#92400E",
        lineHeight: 20,
    },
    assessmentCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: "hidden",
    },
    cardAccent: {
        height: 4,
    },
    cardContent: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    cardMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 4,
    },
    cardMetaText: {
        fontSize: 13,
        color: "#9CA3AF",
        marginLeft: 4,
    },
    cardDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: "row",
        justifyContent: "flex-end",
    },
    startButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    startButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
        marginRight: 4,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 8,
        paddingHorizontal: 40,
    },
    historySection: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 12,
    },
    historyCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    historyHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    historyTitle: {
        fontSize: 15,
        fontWeight: "500",
        color: "#1F2937",
    },
    historyDate: {
        fontSize: 13,
        color: "#9CA3AF",
    },
    historyResult: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    historyScore: {
        fontSize: 14,
        color: "#6B7280",
    },
    historyResultText: {
        fontSize: 14,
        fontWeight: "500",
    },
});
