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
import { NativePieChart, CircularProgress, NativeTestResultsBarChart } from "../../../components/MoodAnalysis/NativeMoodCharts";
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
    const [dayRange, setDayRange] = useState(30);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [assessmentHistory, setAssessmentHistory] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");

    useEffect(() => {
        loadData();
    }, [therapyType, dayRange]);

    const loadData = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem("userId");
            if (!userId) return;

            // Use correct API functions
            const [analytics, history, summary] = await Promise.all([
                api.getUserAnalytics(userId, { dayRange, therapyType }),
                api.getUserAssessments(userId),
                api.getUserAssessmentSummary(userId, { days: dayRange, therapyType })
            ]);

            console.log("Analytics data:", analytics);
            console.log("Assessment history:", history);
            console.log("Summary data:", summary);

            // Merge summary into analytics data
            setAnalyticsData({
                ...analytics,
                summary: summary
            });

            // Filter history by therapy type if needed
            const filteredHistory = history && history.assessments
                ? history.assessments.filter(a => {
                    const aType = a.assessmentId?.therapyType || "individual";
                    return therapyType === "all" || aType === therapyType;
                })
                : [];

            setAssessmentHistory(filteredHistory);
        } catch (error) {
            console.error("Error loading assessment analytics:", error);
            setAssessmentHistory([]);
            setAnalyticsData(null);
        } finally {
            setLoading(false);
        }
    };

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
                    {/* Day Range Filter */}
                    <Text style={styles.filterLabel}>Select Day Range:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {[7, 30, 60, 90, "All"].map((days) => (
                            <TouchableOpacity
                                key={days}
                                onPress={() => setDayRange(days === "All" ? 365 : days)}
                                style={[
                                    styles.filterChip,
                                    dayRange === (days === "All" ? 365 : days) && styles.filterChipActive
                                ]}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    dayRange === (days === "All" ? 365 : days) && styles.filterChipTextActive
                                ]}>
                                    {days === "All" ? "All" : `${days} Days`}
                                </Text>
                            </TouchableOpacity>
                        ))}
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

                {/* Activity & Engagement */}
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

                {/* Assessment Insights */}
                <View style={styles.insightsCard}>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 16 }}>Assessment Insights</Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
                        {/* Left: Metrics */}
                        <View style={{ flex: 1 }}>
                            {/* Total Assessments */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Total Assessments</Text>
                                <Text style={{ fontSize: 32, fontWeight: "700", color: "#6366F1" }}>
                                    {analyticsData?.userassessments?.length || 0}
                                </Text>
                            </View>

                            {/* Categories Found */}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Categories</Text>
                                <Text style={{ fontSize: 32, fontWeight: "700", color: "#10B981" }}>
                                    {analyticsData?.userassessments
                                        ? [...new Set(analyticsData.userassessments.map(a => a.assessmentId?.category || "Other"))].length
                                        : 0}
                                </Text>
                            </View>

                            {/* Most Frequent */}
                            <View>
                                <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Most Frequent</Text>
                                <Text style={{ fontSize: 16, fontWeight: "700", color: "#F59E0B" }} numberOfLines={2}>
                                    {(() => {
                                        const assessments = analyticsData?.userassessments || [];
                                        if (assessments.length === 0) return "N/A";
                                        const freqMap = {};
                                        assessments.forEach(a => {
                                            const cat = a.assessmentId?.category || "Other";
                                            freqMap[cat] = (freqMap[cat] || 0) + 1;
                                        });
                                        return Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
                                    })()}
                                </Text>
                            </View>
                        </View>

                        {/* Right: Chart - Assessment Categories */}
                        <View style={{ alignItems: "center" }}>
                            {(() => {
                                const assessments = analyticsData?.userassessments || [];
                                if (assessments.length === 0) {
                                    return (
                                        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" }}>
                                            <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>No Data</Text>
                                        </View>
                                    );
                                }

                                // Process assessment data to get category counts (matching web)
                                const assessmentCounts = {};
                                assessments.forEach(assessment => {
                                    const categoriesInThisAssessment = new Set();
                                    assessment.assessmentId?.questions?.forEach(q => {
                                        const cat = q.category || "Other";
                                        categoriesInThisAssessment.add(cat);
                                    });
                                    categoriesInThisAssessment.forEach(cat => {
                                        assessmentCounts[cat] = (assessmentCounts[cat] || 0) + 1;
                                    });
                                });

                                const labels = Object.keys(assessmentCounts);
                                const values = Object.values(assessmentCounts);
                                const total = values.reduce((a, b) => a + b, 0);

                                if (total === 0) {
                                    return (
                                        <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" }}>
                                            <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>No Data</Text>
                                        </View>
                                    );
                                }

                                const colors = [
                                    "#EF5350", "#AB47BC", "#5C6BC0", "#29B6F6", "#66BB6A",
                                    "#FFCA28", "#26A69A", "#FFA726", "#8D6E63", "#78909C"
                                ];

                                let currentAngle = -90;
                                const radius = 60;
                                const center = 70;
                                const strokeWidth = 20;

                                return (
                                    <Svg width="140" height="140">
                                        {values.map((value, index) => {
                                            const percentage = value / total;
                                            const angle = percentage * 360;
                                            const endAngle = currentAngle + angle;

                                            const startX = center + radius * Math.cos((currentAngle * Math.PI) / 180);
                                            const startY = center + radius * Math.sin((currentAngle * Math.PI) / 180);
                                            const endX = center + radius * Math.cos((endAngle * Math.PI) / 180);
                                            const endY = center + radius * Math.sin((endAngle * Math.PI) / 180);

                                            const largeArcFlag = angle > 180 ? 1 : 0;

                                            const pathData = [
                                                `M ${startX} ${startY}`,
                                                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
                                            ].join(' ');

                                            const color = colors[index % colors.length];
                                            const segment = (
                                                <Path
                                                    key={index}
                                                    d={pathData}
                                                    stroke={color}
                                                    strokeWidth={strokeWidth}
                                                    fill="none"
                                                    strokeLinecap="round"
                                                />
                                            );

                                            currentAngle = endAngle;
                                            return segment;
                                        })}
                                    </Svg>
                                );
                            })()}
                        </View>
                    </View>

                    {/* Summary Message */}
                    <View style={{ marginTop: 16, padding: 12, backgroundColor: "#F8FAFC", borderRadius: 12, borderLeftWidth: 4, borderLeftColor: "#6366F1" }}>
                        <Text style={{ fontSize: 12, color: "#475569", lineHeight: 18 }}>
                            {(analyticsData?.userassessments?.length || 0) === 0
                                ? "🚀 No assessments yet. Start your first one to begin tracking insights!"
                                : (analyticsData?.userassessments?.length || 0) > 20
                                    ? "🎉 Great job! You've completed many assessments and are building strong insights."
                                    : "✍️ Keep going. Completing more assessments will give you deeper insights."}
                        </Text>
                    </View>
                </View>

                {/* Category Contribution Overview (Horizontal Bars) */}
                {(() => {
                    const summary = analyticsData?.summary || {};
                    const categories = summary?.categorySummary || [];

                    if (categories.length === 0) return null;

                    const total = categories.reduce((sum, c) => sum + (c.averageScore || 0), 0);

                    return (
                        <View style={[styles.chartCard, { borderTopWidth: 8, borderTopColor: "#B0B300" }]}>
                            <Text style={styles.chartTitle}>Category Contribution</Text>
                            <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                                Relative contribution of each category
                            </Text>

                            {/* Horizontal Progress Bars */}
                            <View style={{ gap: 16 }}>
                                {categories.map((cat, index) => {
                                    const colors = ["#60A5FA", "#F472B6", "#34D399", "#F59E0B", "#A78BFA", "#FB7185", "#38BDF8"];
                                    const color = colors[index % colors.length];
                                    const percentage = total > 0 ? ((cat.averageScore / total) * 100) : 0;

                                    return (
                                        <View key={index}>
                                            {/* Category Info */}
                                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                                <View>
                                                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 2 }}>
                                                        {cat.category}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: "#64748B" }}>
                                                        Avg Score: {cat.averageScore?.toFixed(1) || 0}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 18, fontWeight: "700", color }}>
                                                    {percentage.toFixed(1)}%
                                                </Text>
                                            </View>

                                            {/* Horizontal Progress Bar */}
                                            <View style={{ height: 12, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
                                                <View
                                                    style={{
                                                        width: `${percentage}%`,
                                                        height: "100%",
                                                        backgroundColor: color,
                                                        borderRadius: 6
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <View style={{ marginTop: 16, padding: 12, backgroundColor: "#FFFBEB", borderRadius: 8, borderWidth: 1, borderColor: "#FDE68A" }}>
                                <Text style={{ fontSize: 12, color: "#78350F", textAlign: "center" }}>
                                    Total Score: <Text style={{ fontWeight: "700" }}>{total.toFixed(0)}</Text>
                                </Text>
                            </View>
                        </View>
                    );
                })()}

                {/* Test Results Bar Chart with Category Selector (from web BarChart) */}
                {(() => {
                    const assessments = analyticsData?.userassessments || [];
                    if (assessments.length === 0) return null;

                    // Get unique categories
                    const categoriesSet = new Set();
                    assessments.forEach(assessment => {
                        assessment.assessmentId?.questions?.forEach(q => {
                            if (q.category) categoriesSet.add(q.category);
                        });
                    });
                    const categoryList = Array.from(categoriesSet);

                    // Set initial category if not set
                    if (!selectedCategory && categoryList.length > 0) {
                        setSelectedCategory(categoryList[0]);
                    }

                    // Filter assessments by selected category
                    const filteredTests = assessments.filter(assessment => {
                        return assessment.assessmentId?.questions?.some(q => q.category === selectedCategory);
                    }).slice(0, 7); // Last 7

                    const avgScore = filteredTests.length > 0
                        ? filteredTests.reduce((sum, t) => sum + (t.totalScore || 0), 0) / filteredTests.length
                        : 0;

                    return (
                        <View style={[styles.chartCard, { borderTopWidth: 8, borderTopColor: "#0B5302" }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E293B" }}>Select test:</Text>
                                <View style={{ flex: 1, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, backgroundColor: "#FFF" }}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 8 }}>
                                        {categoryList.map((cat, idx) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => setSelectedCategory(cat)}
                                                style={{
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    backgroundColor: selectedCategory === cat ? "#0B5302" : "#F9FAFB",
                                                    borderRadius: 6,
                                                    marginRight: 8
                                                }}
                                            >
                                                <Text style={{ fontSize: 12, color: selectedCategory === cat ? "#FFF" : "#64748B", fontWeight: "600" }}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, color: "#64748B" }}>Tests Taken: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{filteredTests.length}</Text></Text>
                                </View>
                                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                                    <Text style={{ fontSize: 11, color: "#64748B" }}>Avg Score: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{avgScore.toFixed(0)}</Text></Text>
                                </View>
                            </View>

                            {/* Simple Bar Visualization */}
                            <View style={{ gap: 8 }}>
                                {filteredTests.map((test, idx) => {
                                    const score = test.totalScore || 0;
                                    const maxScore = 100;
                                    const barWidth = `${(score / maxScore) * 100}%`;
                                    const colors = ["#60A5FA", "#F472B6", "#34D399", "#F59E0B", "#A78BFA", "#FB7185", "#38BDF8"];
                                    const color = colors[idx % colors.length];

                                    return (
                                        <View key={idx}>
                                            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>
                                                {new Date(test.completedAt).toLocaleDateString()} - {test.assessmentId?.title || "Test"}
                                            </Text>
                                            <View style={{ height: 32, backgroundColor: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
                                                <View style={{ width: barWidth, height: "100%", backgroundColor: color, justifyContent: "center", paddingHorizontal: 8 }}>
                                                    <Text style={{ fontSize: 11, color: "#FFF", fontWeight: "700" }}>{score}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 12 }}>
                                Displays data from the 7 most recent assessments
                            </Text>
                        </View>
                    );
                })()}

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

                {/* Pie Chart - Assessment Contribution Overview */}
                {assessmentHistory.length > 0 && (
                    <View style={[styles.chartCard, { borderTopWidth: 8, borderTopColor: "#B0B300" }]}>
                        <Text style={styles.chartTitle}>Your Assessment Contribution Overview</Text>
                        <Text style={{ fontSize: 12, color: "#64748B", marginBottom: 12 }}>
                            Showing relative contribution of each category to your overall score
                        </Text>
                        <NativePieChart data={assessmentHistory} width={SCREEN_WIDTH - 72} />
                    </View>
                )}

                {/* Bar Chart - Test Results */}
                {assessmentHistory.length > 0 && (
                    <View style={[styles.chartCard, { borderTopWidth: 8, borderTopColor: "#0B5302" }]}>
                        <Text style={styles.chartTitle}>Test Results Overview</Text>
                        <NativeTestResultsBarChart data={assessmentHistory} width={SCREEN_WIDTH - 72} />
                        <Text style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>
                            Displays data from the most recent assessments
                        </Text>
                    </View>
                )}

                {/* Individual Summary Reports */}
                <View style={styles.reportsSection}>
                    <Text style={styles.sectionTitle}></Text>
                    {assessmentHistory.slice(0, 5).map((assessment, index) => (
                        <View key={index} style={styles.reportCard}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                                <Text style={styles.reportTitle}>{assessment.assessmentId?.title || "Assessment"}</Text>
                                <Text style={styles.reportScore}>{assessment.score || 0}/100</Text>
                            </View>
                            <Text style={styles.reportCategory}>{assessment.assessmentId?.category || "General"}</Text>
                            <Text style={styles.reportDate}>
                                {new Date(assessment.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                })}
                            </Text>
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${assessment.score || 0}%` }]} />
                            </View>
                        </View>
                    ))}
                </View>
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
