import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    ActivityIndicator
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Calendar, TrendingUp, Award, BarChart3, Target, Heart, Book, Leaf } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";
import NativeAssessmentHistory from "../../../components/MoodAnalysis/NativeAssessmentHistory";
import { NativeAssessmentInsights, NativeSummaryChart, NativeTestResultsBarChart as CategoryBarChart } from "../../../components/MoodAnalysis/NativeAssessmentCharts";
import Svg, { Path } from "react-native-svg";


const SCREEN_WIDTH = Dimensions.get("window").width;

// Helper for Stats Cards
const StatsCard = ({ title, value, subtext, icon: Icon, color, change, textStatus }) => (
    <View style={{ width: "48%", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", flex: 1 }}>{title}</Text>
            {Icon && <Icon size={18} color={color} />}
        </View>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 4 }}>
            {value} <Text style={{ fontSize: 12, fontWeight: "normal", color: "#000" }}>{textStatus}</Text>
        </Text>

        {change !== undefined && (
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                {change >= 0 ? <TrendingUp size={14} color="#3B82F6" /> : <TrendingUp size={14} color="#EF4444" style={{ transform: [{ rotate: '180deg' }] }} />}
                <Text style={{ fontSize: 11, color: change >= 0 ? "#3B82F6" : "#EF4444", marginLeft: 4 }}>
                    {Math.abs(change)}% from last
                </Text>
            </View>
        )}
        <Text style={{ fontSize: 11, color: "#94A3B8" }}>{subtext}</Text>
    </View>
);


export default function AssessmentAnalytics() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [therapyType, setTherapyType] = useState("individual");
    // Match web: "" = all days
    const [dayRange, setDayRange] = useState("");
    const [analyticsData, setAnalyticsData] = useState(null);
    const [assessmentHistory, setAssessmentHistory] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [testCategories, setTestCategories] = useState([]);
    const [testResults, setTestResults] = useState([]);
    const [testResultsAvg, setTestResultsAvg] = useState(0);
    const [testResultsCount, setTestResultsCount] = useState(0);

    useEffect(() => {
        loadData();
    }, [therapyType, dayRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) return;

            // Use correct API functions (align query params with web)
            const [analytics, history, summary, categories] = await Promise.all([
                api.getUserAnalytics(userId, { days: dayRange || undefined, therapyType }),
                api.getUserAssessments(userId),
                api.getUserAssessmentSummary(userId, { days: dayRange, therapyType }),
                api.getUserTestCategories(userId, therapyType).catch(() => ({ category: [] }))
            ]);

            console.log("Analytics data:", analytics);
            console.log("Assessment history:", history);
            console.log("Summary data:", summary);
            console.log("Test categories:", categories);

            // Merge summary into analytics data
            setAnalyticsData({
                ...analytics,
                summary: summary
            });

            // Filter history by therapy type if needed
            // Use analytics.userAssessmentRecent30 if available (matching web), otherwise use history.assessments
            const historyData = analytics?.userAssessmentRecent30 || (history && history.assessments ? history.assessments : []);
            const filteredHistory = Array.isArray(historyData) ? historyData.filter(a => {
                const aType = a.assessmentId?.therapyType || "individual";
                return therapyType === "all" || aType === therapyType;
            }) : [];

            setAssessmentHistory(filteredHistory);

            // Set test categories and select first one
            const categoryList = categories?.category || [];
            setTestCategories(categoryList);
            if (categoryList.length > 0 && !selectedCategory) {
                setSelectedCategory(categoryList[0]);
            }

        } catch (error) {
            console.error("Error loading assessment analytics:", error);
            setAssessmentHistory([]);
            setAnalyticsData(null);
        } finally {
            setLoading(false);
        }
    };

    // Load test results when category changes
    useEffect(() => {
        const loadTestResults = async () => {
            if (!selectedCategory) return;
            try {
                const userId = await AsyncStorage.getItem("userId");
                if (!userId) return;

                const results = await api.getUserTestResults(userId, selectedCategory, dayRange || "");
                setTestResults(results.data || []);
                setTestResultsAvg(results.overallAvg || 0);
                setTestResultsCount(results.data?.length || 0);
            } catch (error) {
                console.error("Error loading test results:", error);
                setTestResults([]);
            }
        };

        loadTestResults();
    }, [selectedCategory, dayRange, therapyType]);

    if (loading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Assessment Analytics</Text>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                {/* Filter Options */}
                <View style={{ marginBottom: 20 }}>
                    {/* Day Range Filter (match web semantics: \"\" = All) */}
                    <Text style={styles.filterLabel}>Select Day Range:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {["All", "7", "30", "60", "90"].map((label) => {
                            const value = label === "All" ? "" : label;
                            const isActive = dayRange === value;
                            return (
                                <TouchableOpacity
                                    key={label}
                                    onPress={() => setDayRange(value)}
                                    style={[
                                        styles.filterChip,
                                        isActive && styles.filterChipActive
                                    ]}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        isActive && styles.filterChipTextActive
                                    ]}>
                                        {label === "All" ? "All" : `${label} Days`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Therapy Type Filter */}
                    <Text style={styles.filterLabel}>Therapy Type:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {["individual", "couple", "family", "child"].map((type) => (
                            <TouchableOpacity
                                key={type}
                                onPress={() => setTherapyType(type)}
                                style={[
                                    styles.therapyChip,
                                    therapyType === type && styles.therapyChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.therapyChipText,
                                    therapyType === type && styles.therapyChipTextActive
                                ]}>
                                    {type.charAt(0).toUpperCase() + type.slice(1)} Therapy
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Analytics Cards */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 }}>
                    <StatsCard
                        title="Overall Wellbeing"
                        value={analyticsData?.overallWellbeingCurrent || 0}
                        change={analyticsData?.overallWellbeingChange}
                        subtext={`Previous: ${analyticsData?.overallWellbeingLast || 0}`}
                        icon={Heart}
                        color="#3B82F6"
                        textStatus={analyticsData?.overallWellbeingCurrent >= 25 ? "Excellent 🌟" : analyticsData?.overallWellbeingCurrent >= 15 ? "Good 🙂" : "Needs Attention ⚡"}
                    />
                    <StatsCard
                        title="Journaling Consistency"
                        value={`${analyticsData?.journalingConsistency || 0}%`}
                        change={analyticsData?.journalingChange}
                        subtext="Days with entries"
                        icon={Book}
                        color="#6366F1"
                    />
                    <StatsCard
                        title="Emotional Wellbeing"
                        value={analyticsData?.therapyMetric?.current || 0}
                        change={analyticsData?.therapyMetric?.change}
                        subtext={`Previous: ${analyticsData?.therapyMetric?.last || 0}`}
                        icon={Leaf}
                        color="#10B981"
                    />
                    <StatsCard
                        title="Goal Achievement"
                        value={`${analyticsData?.goalAchievement || 0}%`}
                        change={analyticsData?.goalChange}
                        subtext="Goals completed"
                        icon={Calendar}
                        color="#A855F7"
                    />
                </View>

                {/* 5. Activity & Engagement - Component 5 */}
                <View style={styles.activityCard}>
                    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
                        <TrendingUp size={20} color="#6366F1" />
                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B", marginLeft: 8 }}>
                            Activity & Engagement
                        </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                        Track your assessment completion and engagement patterns
                    </Text>

                    {/* Completed vs Pending */}
                    <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                        <View style={[styles.activityBox, { backgroundColor: "#E0F2FE", borderWidth: 1, borderColor: "#7DD3FC" }]}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#0284C7" }}>
                                {analyticsData?.completedCount || 0}
                            </Text>
                            <Text style={styles.activityLabel}>Completed</Text>
                        </View>
                        <View style={[styles.activityBox, { backgroundColor: "#E0F2FE", borderWidth: 1, borderColor: "#BAE6FD" }]}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#075985" }}>
                                {analyticsData?.pendingCount || 0}
                            </Text>
                            <Text style={styles.activityLabel}>Pending</Text>
                        </View>
                    </View>

                    {/* Completion Rate Progress Bar */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151", marginBottom: 6 }}>
                            Completion Rate
                        </Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, {
                                width: `${Math.round(
                                    (analyticsData?.completedCount || 0) /
                                    Math.max(1, (analyticsData?.completedCount || 0) + (analyticsData?.pendingCount || 0)) * 100
                                )}%`
                            }]} />
                        </View>
                        <Text style={{ fontSize: 12, color: "#64748B", textAlign: "right", marginTop: 4 }}>
                            {Math.round(
                                (analyticsData?.completedCount || 0) /
                                Math.max(1, (analyticsData?.completedCount || 0) + (analyticsData?.pendingCount || 0)) * 100
                            )}%
                        </Text>
                    </View>

                    {/* Current Streak */}
                    <View style={{ backgroundColor: "#E0F2FE", padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: "#BAE6FD", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Award size={18} color="#0284C7" />
                            <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>Current Streak</Text>
                            <Text style={{ fontSize: 10, color: "#64748B" }}>Keep it up!</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Text style={{ fontSize: 24, fontWeight: "700", color: "#1E293B" }}>
                                {analyticsData?.streak || 0}
                            </Text>
                            <Text style={{ fontSize: 12, color: "#64748B" }}>days</Text>
                        </View>
                    </View>

                    {/* Time Insights */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Calendar size={18} color="#0284C7" />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}>Time Insights</Text>
                    </View>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>Avg. per assessment:</Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0284C7" }}>
                                {analyticsData?.avgPerAssessment || "0 min"}
                            </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 4 }}>Total time spent:</Text>
                            <Text style={{ fontSize: 13, fontWeight: "600", color: "#0284C7" }}>
                                {analyticsData?.totalTimeSpent || "0 hours"}
                            </Text>
                        </View>
                    </View>

                    {/* Achievement Badges */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <Award size={18} color="#F59E0B" />
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}>Achievement Badges</Text>
                    </View>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {[
                            { key: "firstAssessment", label: "First Assessment", emoji: "🎯" },
                            { key: "weekStreak", label: "Week Streak", emoji: "🔥" },
                            { key: "consistentTracker", label: "Consistent Tracker", emoji: "📊" },
                            { key: "monthChampion", label: "Month Champion", emoji: "🏆" },
                            { key: "mindfulWriter", label: "Mindful Writer", emoji: "✍️" },
                            { key: "earlyBird", label: "Early Bird", emoji: "🌅" }
                        ].map((badge) => {
                            const isUnlocked = analyticsData?.badges?.[badge.key] || false;
                            return (
                                <View
                                    key={badge.key}
                                    style={{
                                        flex: 1,
                                        minWidth: "30%",
                                        maxWidth: "31%",
                                        padding: 10,
                                        borderRadius: 12,
                                        backgroundColor: isUnlocked ? "#E0F2FE" : "#F3F4F6",
                                        borderWidth: 1,
                                        borderColor: isUnlocked ? "#BAE6FD" : "#E5E7EB",
                                        alignItems: "center",
                                        opacity: isUnlocked ? 1 : 0.5
                                    }}
                                >
                                    <Text style={{ fontSize: 24, marginBottom: 4 }}>{badge.emoji}</Text>
                                    <Text style={{ fontSize: 9, color: isUnlocked ? "#0284C7" : "#9CA3AF", textAlign: "center", fontWeight: "600" }}>
                                        {badge.label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* 1. Assessment Insights - Component 1 */}
                <NativeAssessmentInsights data={analyticsData?.userassessments || []} />

                {/* 2. Assessment History Chart - Component 2 (Right after Assessment Insights) */}
                <NativeAssessmentHistory
                    data={assessmentHistory || []}
                    avgScore={analyticsData?.avgScoreRecent30 || analyticsData?.summary?.overallAvgScore || 0}
                />

                {/* 4. Summary Chart (Category Contribution Overview) - Component 4 */}
                <NativeSummaryChart data={analyticsData?.summary || {}} />

                {/* 3. Bar Chart (Category-specific test results) - Component 3 */}
                {testCategories.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 12 }}>Select test:</Text>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                            {testCategories.map((cat, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => setSelectedCategory(cat)}
                                    style={{
                                        paddingHorizontal: 16,
                                        paddingVertical: 10,
                                        backgroundColor: selectedCategory === cat ? "#0B5302" : "#F9FAFB",
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: selectedCategory === cat ? "#0B5302" : "#E2E8F0",
                                        minWidth: 100,
                                    }}
                                >
                                    <Text style={{ fontSize: 13, color: selectedCategory === cat ? "#FFF" : "#64748B", fontWeight: "600", textAlign: "center" }}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {selectedCategory && testResults.length > 0 && (
                            <CategoryBarChart
                                data={testResults.slice(0, 7)}
                                category={selectedCategory}
                                avgScore={testResultsAvg}
                                testTaken={testResultsCount}
                            />
                        )}
                    </View>
                )}

                {/* Individual Summary Report (from web) */}
                {(() => {
                    const summary = analyticsData?.summary || {};
                    const categories = summary?.categorySummary || [];
                    const testTaken = summary?.testTaken || 0;
                    const overallAvgScore = summary?.overallAvgScore || 0;

                    if (categories.length === 0) return null;

                    return (
                        <View style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 4, borderColor: "#72059C" }}>
                            {/* Header */}
                            <Text style={{ fontSize: 18, fontWeight: "700", color: "#1E293B", textAlign: "center", marginBottom: 16 }}>
                                {therapyType.charAt(0).toUpperCase() + therapyType.slice(1)} Summary Report
                            </Text>

                            {/* Stats */}
                            <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" }}>
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                                        Total Tests Taken
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366F1" }}>
                                        {testTaken}
                                    </Text>
                                </View>

                                <View style={{ width: 1, backgroundColor: "#E2E8F0" }} />

                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                                        Overall Avg Score
                                    </Text>
                                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#6366F1" }}>
                                        {overallAvgScore?.toFixed(1) || 0}
                                    </Text>
                                </View>
                            </View>

                            {/* Categories */}
                            <View style={{ gap: 16 }}>
                                {categories.map((cat, index) => (
                                    <View key={index} style={{ backgroundColor: "#F5F5F5", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" }}>
                                        <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12 }}>
                                            {cat.category}
                                        </Text>

                                        {cat.overallKeyRecommendation && (
                                            <View style={{ backgroundColor: "#EEF2FF", borderLeftWidth: 4, borderLeftColor: "#6366F1", padding: 12, borderRadius: 8, marginBottom: 12 }}>
                                                <Text style={{ fontSize: 12, fontStyle: "italic", color: "#475569", lineHeight: 18 }}>
                                                    {cat.overallKeyRecommendation}
                                                </Text>
                                            </View>
                                        )}

                                        <View>
                                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", textTransform: "uppercase", marginBottom: 8 }}>
                                                ASSESSMENTS
                                            </Text>
                                            <View style={{ gap: 8 }}>
                                                {cat.results?.map((r, idx) => (
                                                    <View key={idx} style={{ backgroundColor: "#FFF", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" }}>
                                                        <Text style={{ fontSize: 13, fontWeight: "600", color: "#1E293B", marginBottom: 6 }}>
                                                            {r.title}
                                                        </Text>
                                                        <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                                                            Score: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{r.score}</Text> | Result: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{r.result}</Text>
                                                        </Text>
                                                        {r.keyRecommendation && (
                                                            <Text style={{ fontSize: 10, fontStyle: "italic", color: "#64748B", lineHeight: 16 }}>
                                                                {r.keyRecommendation}
                                                            </Text>
                                                        )}
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    );
                })()}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB"
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0"
    },
    backButton: {
        padding: 8,
        marginRight: 12
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B"
    },
    scrollView: {
        flex: 1,
        padding: 20
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#475569",
        marginBottom: 8
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0"
    },
    filterChipActive: {
        backgroundColor: "#FEF3C7",
        borderColor: "#F59E0B"
    },
    filterChipText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600"
    },
    filterChipTextActive: {
        color: "#D97706"
    },
    therapyChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: "#fff",
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E2E8F0"
    },
    therapyChipActive: {
        backgroundColor: "#6366F1",
        borderColor: "#6366F1"
    },
    therapyChipText: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600"
    },
    therapyChipTextActive: {
        color: "#fff"
    },
    insightCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1
    },
    badgeCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1
    },
    activityCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1
    },
    activityBox: {
        flex: 1,
        minWidth: "22%",
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 12,
        alignItems: "center"
    },
    activityLabel: {
        fontSize: 10,
        color: "#64748B",
        marginBottom: 4
    },
    activityValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B"
    },
    insightsCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4
    },
    summarySection: {
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 12
    },
    summaryCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        width: "48%",
        alignItems: "center",
        marginBottom: 12,
        elevation: 1
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: "700",
        color: "#1E293B",
        marginVertical: 8
    },
    summaryLabel: {
        fontSize: 12,
        color: "#64748B"
    },
    chartCard: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 16
    },
    reportsSection: {
        marginBottom: 16
    },
    reportCard: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        elevation: 1
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B"
    },
    reportScore: {
        fontSize: 16,
        fontWeight: "700",
        color: "#6366F1"
    },
    reportCategory: {
        fontSize: 12,
        color: "#10B981",
        marginBottom: 4
    },
    reportDate: {
        fontSize: 11,
        color: "#94A3B8",
        marginBottom: 8
    },
    progressBar: {
        height: 6,
        backgroundColor: "#E2E8F0",
        borderRadius: 3,
        overflow: "hidden"
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#6366F1",
        borderRadius: 3
    }
});
