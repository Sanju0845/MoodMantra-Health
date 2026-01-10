import { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
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
    Compass,
} from "lucide-react-native";
import api from "../../../utils/api";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.7;
const CARD_SPACING = 12;

// Therapy type icons and colors
const therapyTypeConfig = {
    individual: { icon: User, color: "#8B5CF6", bgColor: "#F3E8FF", label: "Individual" },
    couple: { icon: Heart, color: "#EC4899", bgColor: "#FCE7F3", label: "Couples" },
    family: { icon: Users, color: "#10B981", bgColor: "#D1FAE5", label: "Family" },
    child: { icon: Smile, color: "#F59E0B", bgColor: "#FEF3C7", label: "Child" },
};

export default function ExploreScreen() {
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
            const storedUserId = await AsyncStorage.getItem("userId");
            setUserId(storedUserId);

            const data = await api.getAssessments(selectedTherapyType);
            setAssessments(Array.isArray(data) ? data : []);

            if (storedUserId) {
                try {
                    const userAssessmentsData = await api.getUserAssessments(storedUserId);
                    setUserAssessments(Array.isArray(userAssessmentsData) ? userAssessmentsData : []);
                } catch (err) {
                    console.log("[Explore] No user assessments found");
                    setUserAssessments([]);
                }
            }
        } catch (error) {
            console.error("[Explore] Error fetching data:", error);
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

    const hasCompletedRecently = (assessmentId) => {
        const recent = userAssessments.find(
            (ua) => ua.assessmentId === assessmentId
        );
        if (!recent) return false;
        const completedDate = new Date(recent.completedAt);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return completedDate > sevenDaysAgo;
    };

    const TherapyTypeCapsule = ({ type, config }) => {
        const isSelected = selectedTherapyType === type;

        return (
            <TouchableOpacity
                onPress={() => {
                    setSelectedTherapyType(type);
                    setLoading(true);
                }}
                style={[
                    styles.capsule,
                    isSelected && {
                        backgroundColor: config.color,
                        shadowColor: config.color,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                        transform: [{ scale: 1.02 }],
                    },
                ]}
                activeOpacity={0.8}
            >
                <View style={[
                    styles.capsuleIconBg,
                    isSelected && { backgroundColor: 'rgba(255, 255, 255, 0.25)' }
                ]}>
                    <config.icon
                        size={18}
                        color={isSelected ? "#FFFFFF" : config.color}
                        strokeWidth={2.5}
                    />
                </View>
                <Text
                    style={[
                        styles.capsuleText,
                        isSelected && { color: "#FFFFFF", fontWeight: "700" },
                    ]}
                >
                    {config.label}
                </Text>
            </TouchableOpacity>
        );
    };

    const AssessmentCarouselCard = ({ assessment, isFirst, isLast }) => {
        const completed = hasCompletedRecently(assessment._id);
        const config = therapyTypeConfig[selectedTherapyType];

        return (
            <TouchableOpacity
                style={[
                    styles.carouselCard,
                    isFirst && { marginLeft: 20 },
                    isLast && { marginRight: 20 },
                ]}
                onPress={() => handleStartAssessment(assessment)}
                activeOpacity={0.95}
            >
                <LinearGradient
                    colors={[config.color, config.color + 'E6', config.color + 'CC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.carouselCardGradient}
                >
                    {/* Decorative Background Pattern */}
                    <View style={styles.cardPattern}>
                        <View style={[styles.patternCircle, { top: -20, right: -20 }]} />
                        <View style={[styles.patternCircle, { bottom: 10, left: -30, opacity: 0.1 }]} />
                    </View>

                    <View style={styles.carouselCardContent}>
                        <View style={styles.carouselCardHeader}>
                            <View style={styles.carouselCardIconContainer}>
                                <ClipboardList size={32} color="#FFFFFF" strokeWidth={2} />
                            </View>
                            {completed && (
                                <View style={styles.completedBadge}>
                                    <CheckCircle size={14} color="#10B981" strokeWidth={3} />
                                    <Text style={styles.completedBadgeText}>Completed</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.cardBody}>
                            <Text style={styles.carouselCardTitle} numberOfLines={2}>
                                {assessment.title}
                            </Text>
                            <Text style={styles.carouselCardDescription} numberOfLines={2}>
                                {assessment.description}
                            </Text>
                        </View>

                        <View style={styles.cardDivider} />

                        <View style={styles.carouselCardFooter}>
                            <View style={styles.carouselCardMeta}>
                                <Clock size={16} color="rgba(255, 255, 255, 0.95)" strokeWidth={2} />
                                <Text style={styles.carouselCardMetaText}>
                                    {assessment.questions?.length || 0} Questions
                                </Text>
                            </View>
                            <View style={styles.carouselStartButton}>
                                <Text style={styles.carouselStartButtonText}>
                                    {completed ? "Retake" : "Begin"}
                                </Text>
                                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const TeenAssessmentSection = () => (
        <View style={styles.teenSection}>
            <View style={styles.sectionHeaderContainer}>
                <View style={styles.sectionHeaderLeft}>
                    <View style={styles.teenIconContainer}>
                        <Sparkles size={18} color="#FF6B6B" strokeWidth={2} />
                    </View>
                    <View>
                        <Text style={styles.teenTitle}>Teen Assessment</Text>
                        <Text style={styles.teenSubtitle}>Ages 13-19</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.comingSoonCard}
                activeOpacity={0.9}
                onPress={() => router.push("/(tabs)/teen-assessment")}
            >
                <LinearGradient
                    colors={['#FF6B6B', '#FF8E53', '#FFA940']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.comingSoonGradient}
                >
                    {/* Background Pattern */}
                    <View style={styles.comingSoonPattern}>
                        <View style={[styles.patternCircle, { top: -40, right: -40, width: 120, height: 120, opacity: 0.15 }]} />
                        <View style={[styles.patternCircle, { bottom: -20, left: -20, width: 80, height: 80, opacity: 0.1 }]} />
                    </View>

                    <View style={styles.comingSoonIcon}>
                        <Sparkles size={40} color="rgba(255, 255, 255, 0.95)" strokeWidth={2} />
                    </View>

                    <Text style={styles.comingSoonTitle}>Teen Assessment</Text>
                    <Text style={styles.comingSoonText}>
                        Discover your natural strengths, interests, skills, and career paths designed specifically for ages 13-19
                    </Text>

                    <View style={styles.comingSoonBadge}>
                        <View style={styles.badgeDot} />
                        <Text style={styles.comingSoonBadgeText}>START YOUR JOURNEY</Text>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <StatusBar style="dark" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8B5CF6" />
                    <Text style={styles.loadingText}>Loading your assessments...</Text>
                </View>
            </View>
        );
    }

    const completedCount = assessments.filter(a => hasCompletedRecently(a._id)).length;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Clean Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Assessments</Text>
                    <Text style={styles.headerSubtitle}>Find the right assessment for you</Text>
                </View>
            </View>

            {/* Divider Line */}
            <View style={styles.headerDivider} />

            {/* Main Content */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 140 },
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Therapy Type Capsules */}
                <View style={styles.capsulesSection}>
                    <Text style={styles.capsulesSectionTitle}>Select Category</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.capsulesContent}
                    >
                        {Object.entries(therapyTypeConfig).map(([type, config]) => (
                            <TherapyTypeCapsule key={type} type={type} config={config} />
                        ))}
                    </ScrollView>
                </View>

                {/* Assessment Carousel */}
                {assessments.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <ClipboardList size={64} color="#D1D5DB" strokeWidth={1.5} />
                        </View>
                        <Text style={styles.emptyTitle}>No Assessments Yet</Text>
                        <Text style={styles.emptySubtitle}>
                            We're preparing {therapyTypeConfig[selectedTherapyType].label.toLowerCase()} therapy assessments for you. Check back soon!
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.carouselHeader}>
                            <Text style={styles.carouselHeaderTitle}>
                                {therapyTypeConfig[selectedTherapyType].label} Therapy
                            </Text>
                            <Text style={styles.carouselHeaderCount}>
                                {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.carouselContent}
                            snapToInterval={CARD_WIDTH + CARD_SPACING}
                            decelerationRate="fast"
                            style={styles.carouselScrollView}
                        >
                            {assessments.map((assessment, index) => (
                                <AssessmentCarouselCard
                                    key={assessment._id}
                                    assessment={assessment}
                                    isFirst={index === 0}
                                    isLast={index === assessments.length - 1}
                                />
                            ))}
                        </ScrollView>
                    </>
                )}

                {/* Teen Assessment Section */}
                <TeenAssessmentSection />

                {/* User's Recent Results */}
                {userAssessments.length > 0 && (
                    <View style={styles.historySection}>
                        <View style={styles.historySectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Results</Text>
                            <View style={styles.historyBadge}>
                                <Text style={styles.historyBadgeText}>{userAssessments.length}</Text>
                            </View>
                        </View>
                        {userAssessments.slice(0, 3).map((result) => (
                            <View key={result._id} style={styles.historyCard}>
                                <View style={styles.historyCardLeft}>
                                    <View style={[
                                        styles.historyCardIcon,
                                        {
                                            backgroundColor: result.result?.includes("Severe") ? "#FEE2E2" :
                                                result.result?.includes("Moderate") ? "#FEF3C7" : "#D1FAE5"
                                        }
                                    ]}>
                                        <Brain
                                            size={20}
                                            color={
                                                result.result?.includes("Severe") ? "#EF4444" :
                                                    result.result?.includes("Moderate") ? "#F59E0B" : "#10B981"
                                            }
                                            strokeWidth={2}
                                        />
                                    </View>
                                    <View style={styles.historyCardInfo}>
                                        <Text style={styles.historyTitle} numberOfLines={1}>{result.title}</Text>
                                        <Text style={styles.historyDate}>
                                            {new Date(result.completedAt).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.historyCardRight}>
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
        backgroundColor: "#FFFFFF",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },

    // Header Styles
    header: {
        backgroundColor: "#FFFFFF",
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    headerContent: {
        paddingHorizontal: 24,
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
        fontSize: 32,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.5,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 15,
        color: "#6B7280",
        fontWeight: "500",
    },
    headerDivider: {
        height: 1,
        backgroundColor: "#E5E7EB",
    },

    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 24,
    },

    // Capsules Section
    capsulesSection: {
        marginBottom: 28,
    },
    capsulesSectionTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#6B7280",
        textTransform: "uppercase",
        letterSpacing: 1,
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    capsulesContent: {
        paddingHorizontal: 24,
        gap: 12,
    },
    capsule: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 14,
        borderRadius: 28,
        backgroundColor: "#FFFFFF",
        gap: 10,
        borderWidth: 2,
        borderColor: "#F3F4F6",
    },
    capsuleIconBg: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
    },
    capsuleText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
    },

    // Carousel Section
    carouselHeader: {
        paddingHorizontal: 20,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    carouselHeaderTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.3,
    },
    carouselHeaderCount: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF",
    },
    carouselScrollView: {
        marginBottom: 24,
    },
    carouselContent: {
        paddingVertical: 8,
    },
    carouselCard: {
        width: CARD_WIDTH,
        marginRight: CARD_SPACING,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    carouselCardGradient: {
        position: "relative",
        overflow: "hidden",
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
    carouselCardContent: {
        padding: 14,
    },
    carouselCardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    carouselCardIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
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
    completedBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#10B981",
        letterSpacing: 0.3,
    },
    cardBody: {
        marginBottom: 14,
    },
    carouselCardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 6,
        lineHeight: 22,
        letterSpacing: -0.3,
    },
    carouselCardDescription: {
        fontSize: 13,
        color: "rgba(255, 255, 255, 0.9)",
        lineHeight: 18,
        fontWeight: "500",
    },
    cardDivider: {
        height: 1,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        marginBottom: 18,
    },
    carouselCardFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    carouselCardMeta: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    carouselCardMetaText: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.98)",
        fontWeight: "600",
    },
    carouselStartButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.22)",
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    carouselStartButtonText: {
        fontSize: 15,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.2,
    },

    // Empty State
    emptyState: {
        alignItems: "center",
        paddingVertical: 70,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 10,
        letterSpacing: -0.5,
    },
    emptySubtitle: {
        fontSize: 15,
        color: "#9CA3AF",
        textAlign: "center",
        lineHeight: 22,
        fontWeight: "500",
    },

    // Teen Assessment Section
    teenSection: {
        marginTop: 6,
        marginBottom: 24,
        paddingHorizontal: 20,
    },
    sectionHeaderContainer: {
        marginBottom: 12,
    },
    sectionHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
    },
    teenIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: "#FEE2E2",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    teenTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.3,
    },
    teenSubtitle: {
        fontSize: 11,
        fontWeight: "500",
        color: "#9CA3AF",
        marginTop: 2,
    },
    comingSoonCard: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#FF6B6B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10,
    },
    comingSoonPattern: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    comingSoonGradient: {
        padding: 20,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 150,
        position: "relative",
    },
    comingSoonIcon: {
        marginBottom: 12,
    },
    comingSoonTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFFFFF",
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    comingSoonText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.95)",
        textAlign: "center",
        lineHeight: 19,
        paddingHorizontal: 10,
        fontWeight: "500",
        marginBottom: 18,
    },
    comingSoonBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.18)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: "rgba(255, 255, 255, 0.35)",
        gap: 8,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#FFFFFF",
    },
    comingSoonBadgeText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 1.2,
    },

    // History Section
    historySection: {
        marginTop: 8,
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    historySectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1F2937",
        letterSpacing: -0.5,
    },
    historyBadge: {
        backgroundColor: "#8B5CF6",
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
    },
    historyBadgeText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    historyCard: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#F3F4F6",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    historyCardLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    historyCardIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 14,
    },
    historyCardInfo: {
        flex: 1,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    historyDate: {
        fontSize: 13,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    historyCardRight: {
        backgroundColor: "#F9FAFB",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginLeft: 12,
    },
    historyResultText: {
        fontSize: 13,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
});
