import React, { useMemo, useState } from "react";
import { View, Text, Dimensions, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Modal, StyleSheet, ActivityIndicator } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, G, Rect } from "react-native-svg";
import { Target } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/api";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Colors matching web version exactly (from pieChartSummary.jsx)
const COLORS = [
    "#60A5FA", // blue-400
    "#F472B6", // pink-400
    "#34D399", // green-400
    "#F59E0B", // amber-500
    "#A78BFA", // purple-400
    "#FB7185", // rose-400
    "#38BDF8", // sky-400
];

// Helper function to format category names (capitalize and format)
const formatCategoryName = (category) => {
    if (!category || category === "Other") return "Other";
    // Convert camelCase or snake_case to Title Case
    return category
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize first letter of each word
        .trim();
};

// 1. Assessment Insights Component (Donut Chart + Metrics)
export const NativeAssessmentInsights = ({ data = [] }) => {
    const { labels, assessmentCounts, totalCoverage, categoriesFound, mostFrequent } = useMemo(() => {
        const assessmentCountsMap = {};

        data.forEach((assessment) => {
            const categoriesInThisAssessment = new Set();
            
            // Extract categories from questions
            if (assessment.assessmentId?.questions && Array.isArray(assessment.assessmentId.questions)) {
                assessment.assessmentId.questions.forEach((q) => {
                    const cat = q.category || "Other";
                    if (cat && cat !== "undefined" && cat !== "null") {
                        categoriesInThisAssessment.add(cat);
                    }
                });
            }

            // Count each assessment once per category
            categoriesInThisAssessment.forEach((cat) => {
                const categoryName = formatCategoryName(cat);
                assessmentCountsMap[categoryName] = (assessmentCountsMap[categoryName] || 0) + 1;
            });
        });

        const labels = Object.keys(assessmentCountsMap).sort(); // Sort for consistent display
        const values = Object.values(assessmentCountsMap);
        const total = values.reduce((a, b) => a + b, 0);
        const mostFrequentCat = labels.length > 0
            ? labels.find(cat => assessmentCountsMap[cat] === Math.max(...values)) || "N/A"
            : "N/A";

        return { labels, assessmentCounts: assessmentCountsMap, totalCoverage: total, categoriesFound: labels.length, mostFrequent: mostFrequentCat };
    }, [data]);

    const getStatus = (avgScore) => {
        if (avgScore >= 8) return "Excellent 🌟";
        if (avgScore >= 6) return "Good 🙂";
        if (avgScore >= 4) return "Needs Attention ⚡";
        return "N/A";
    };

    // Donut chart rendering
    const radius = 60;
    const center = 100;
    const strokeWidth = 20;

    // Sort labels by count (high to low) for both chart and legend
    const sortedLabels = [...labels].sort((a, b) => (assessmentCounts[b] || 0) - (assessmentCounts[a] || 0));

    let currentAngle = -90;
    const segments = sortedLabels.map((label, index) => {
        const value = assessmentCounts[label] || 0;
        const percentage = totalCoverage > 0 ? value / totalCoverage : 0;
        const angle = percentage * 360;

        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;

        const startX = center + radius * Math.cos((startAngle * Math.PI) / 180);
        const startY = center + radius * Math.sin((startAngle * Math.PI) / 180);
        const endX = center + radius * Math.cos((endAngle * Math.PI) / 180);
        const endY = center + radius * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        const pathData = [
            `M ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`
        ].join(' ');

        currentAngle = endAngle;

        return {
            path: pathData,
            color: COLORS[index % COLORS.length],
            label,
            value,
            percentage: (percentage * 100).toFixed(1)
        };
    });

    return (
        <View style={{
            backgroundColor: "#FEE2E2",
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderRightWidth: 8,
            borderRightColor: "#E00D65",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
        }}>
            <View style={{ flexDirection: "column", gap: 16 }}>
                {/* Chart Section */}
                <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 8 }}>Assessment</Text>
                    <View style={{ height: 200, alignItems: "center", justifyContent: "center" }}>
                        {segments.length > 0 ? (
                            <Svg width="200" height="200">
                                {/* Background circle */}
                                <Circle cx={center} cy={center} r={radius} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} />
                                {/* Segments */}
                                {segments.map((segment, index) => (
                                    <Path
                                        key={index}
                                        d={segment.path}
                                        stroke={segment.color}
                                        strokeWidth={strokeWidth}
                                        fill="none"
                                        strokeLinecap="round"
                                    />
                                ))}
                                {/* Center text */}
                                <SvgText
                                    x={center}
                                    y={center}
                                    fontSize="14"
                                    fill="#1E293B"
                                    textAnchor="middle"
                                    fontWeight="bold"
                                >
                                    {totalCoverage}
                                </SvgText>
                                <SvgText
                                    x={center}
                                    y={center + 20}
                                    fontSize="12"
                                    fill="#64748B"
                                    textAnchor="middle"
                                >
                                    Assessments
                                </SvgText>
                            </Svg>
                        ) : (
                            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: "#F1F5F9", justifyContent: "center", alignItems: "center" }}>
                                <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center" }}>No Data</Text>
                            </View>
                        )}
                    </View>

                    {/* Legend/Labels for Donut Chart - Compact mobile view, sorted high to low */}
                    {segments.length > 0 && (
                        <View style={{ marginTop: 12, padding: 10, backgroundColor: "#FFF", borderRadius: 10, borderWidth: 1, borderColor: "#E5E7EB" }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#1E293B", marginBottom: 8 }}>Categories:</Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                                {segments.map((segment, index) => (
                                    <View key={index} style={{ 
                                        flexDirection: "row", 
                                        alignItems: "center", 
                                        backgroundColor: "#F9FAFB",
                                        paddingHorizontal: 8,
                                        paddingVertical: 4,
                                        borderRadius: 8,
                                        marginRight: 6,
                                        marginBottom: 4,
                                        borderWidth: 1,
                                        borderColor: segment.color + "40"
                                    }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: segment.color, marginRight: 6 }} />
                                        <Text style={{ fontSize: 10, color: "#1E293B", fontWeight: "600", marginRight: 4 }} numberOfLines={1}>
                                            {segment.label}
                                        </Text>
                                        <Text style={{ fontSize: 9, fontWeight: "700", color: segment.color }}>
                                            {segment.value} ({segment.percentage}%)
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Summary - Compact */}
                    <View style={{ marginTop: 10, padding: 8, backgroundColor: "#DBEAFE", borderRadius: 8 }}>
                        <Text style={{ fontSize: 11, color: "#1E40AF", marginBottom: 2 }}>Summary</Text>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: "#1E40AF", lineHeight: 16 }}>
                            {data.length === 0
                                ? "No assessments yet. Start your first one!"
                                : data.length > 20
                                    ? "Great job! You've completed many assessments."
                                    : "Keep going. Complete more for deeper insights."}
                        </Text>
                    </View>
                </View>

                {/* Insights Section - Compact Grid */}
                <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 10 }}>Assessment Insights</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        <View style={{ flex: 1, minWidth: "48%", padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Total Assessments</Text>
                            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1E40AF" }}>{data.length}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: "48%", padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Categories Found</Text>
                            <Text style={{ fontSize: 20, fontWeight: "700", color: "#1E40AF" }}>{categoriesFound}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: "48%", padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Most Frequent</Text>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E40AF" }} numberOfLines={1}>{mostFrequent}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: "48%", padding: 10, backgroundColor: "#DBEAFE", borderRadius: 10 }}>
                            <Text style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>Best Status</Text>
                            <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E40AF" }}>N/A</Text>
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );
};

// 4. Summary Chart (Pie Chart for Category Contribution)
export const NativeSummaryChart = ({ data = {} }) => {
    const [selectedSegment, setSelectedSegment] = useState(null);
    const categories = Array.isArray(data) ? data : data?.categorySummary ?? [];

    if (!categories.length) {
        return (
            <View style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 20, marginBottom: 16, borderTopWidth: 8, borderTopColor: "#B0B300" }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 8, textAlign: "center" }}>
                    Your Assessment Contribution Overview
                </Text>
                <Text style={{ textAlign: "center", color: "#64748B", marginTop: 20 }}>No data available</Text>
            </View>
        );
    }

    // Map data exactly like web version
    const pieData = categories.map((c, idx) => {
        const rawName = c.category ?? `Category ${idx + 1}`;
        const maxLabelLength = 18;
        const displayName =
            rawName.length > maxLabelLength
                ? `${rawName.slice(0, maxLabelLength - 1)}…`
                : rawName;

        return {
            name: rawName,
            displayName,
            value: c.averageScore || 0,
            ...c, // Spread to include all properties (category, results, etc.)
        };
    });

    // Calculate total exactly like web version
    const total = pieData.reduce((sum, c) => sum + c.value, 0);

    // Render donut chart (matching web version)
    const outerRadius = 100;
    const innerRadius = 50; // Makes it a donut chart
    const center = 140; // Center of 280x280 viewBox
    const paddingAngle = 3; // Degrees between segments
    const labelDistance = 20; // Distance from outer edge to label

    let currentAngle = -90;
    const segments = pieData.map((item, index) => {
        const percentage = total > 0 ? item.value / total : 0;
        // Calculate angle, accounting for padding (distribute padding proportionally)
        const totalPadding = paddingAngle * pieData.length;
        const availableAngle = 360 - totalPadding;
        const angle = percentage * availableAngle;

        const startAngle = currentAngle;
        const midAngle = currentAngle + angle / 2; // Middle of the segment for label positioning
        const endAngle = currentAngle + angle;

        // Outer arc points
        const startX = center + outerRadius * Math.cos((startAngle * Math.PI) / 180);
        const startY = center + outerRadius * Math.sin((startAngle * Math.PI) / 180);
        const endX = center + outerRadius * Math.cos((endAngle * Math.PI) / 180);
        const endY = center + outerRadius * Math.sin((endAngle * Math.PI) / 180);

        // Inner arc points
        const innerStartX = center + innerRadius * Math.cos((startAngle * Math.PI) / 180);
        const innerStartY = center + innerRadius * Math.sin((startAngle * Math.PI) / 180);
        const innerEndX = center + innerRadius * Math.cos((endAngle * Math.PI) / 180);
        const innerEndY = center + innerRadius * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        // Create donut segment path
        const pathData = [
            `M ${startX} ${startY}`,
            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            `L ${innerEndX} ${innerEndY}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX} ${innerStartY}`,
            'Z'
        ].join(' ');

        // Label position (outside the donut)
        const labelRadius = outerRadius + labelDistance;
        const labelX = center + labelRadius * Math.cos((midAngle * Math.PI) / 180);
        const labelY = center + labelRadius * Math.sin((midAngle * Math.PI) / 180);

        // Line from segment to label
        const lineEndX = center + (outerRadius + 10) * Math.cos((midAngle * Math.PI) / 180);
        const lineEndY = center + (outerRadius + 10) * Math.sin((midAngle * Math.PI) / 180);

        currentAngle = endAngle + paddingAngle; // Add padding after each segment

        return {
            path: pathData,
            color: COLORS[index % COLORS.length],
            name: item.name,
            displayName: item.displayName,
            value: item.value,
            percentage: (percentage * 100).toFixed(1),
            labelX,
            labelY,
            lineEndX,
            lineEndY,
            midAngle
        };
    });

    return (
        <View style={{ backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 16, borderTopWidth: 8, borderTopColor: "#b0b300", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>
            {/* Title and subtitle - matching web exactly */}
            <View style={{ marginBottom: 12, alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 4, textAlign: "center" }}>
                    Your Assessment Contribution Overview
                </Text>
                <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center" }}>
                    Showing relative contribution of each category to your overall score
                </Text>
            </View>

            <View style={{ height: 340, alignItems: "center", justifyContent: "center" }}>
                <Svg width="280" height="280" viewBox="0 0 280 280">
                    {segments.map((segment, index) => {
                        const categoryData = pieData[index];
                        return (
                            <G key={index}>
                                {/* Donut segment */}
                                <Path
                                    d={segment.path}
                                    fill={segment.color}
                                    onPress={() => setSelectedSegment(categoryData)}
                                />
                                {/* Line from segment to label - matching web style */}
                                <Line
                                    x1={segment.lineEndX}
                                    y1={segment.lineEndY}
                                    x2={segment.labelX}
                                    y2={segment.labelY}
                                    stroke="#9CA3AF"
                                    strokeWidth="1"
                                    strokeOpacity="0.6"
                                />
                                {/* Label text - nicer mobile-friendly labels (name on top, percent below) */}
                                <SvgText
                                    x={segment.labelX}
                                    y={segment.labelY - 4}
                                    fontSize="11"
                                    fill="#1E293B"
                                    textAnchor={segment.midAngle > 90 && segment.midAngle < 270 ? "end" : "start"}
                                    fontWeight="500"
                                >
                                    {segment.displayName}
                                </SvgText>
                                <SvgText
                                    x={segment.labelX}
                                    y={segment.labelY + 9}
                                    fontSize="10"
                                    fill="#6B7280"
                                    textAnchor={segment.midAngle > 90 && segment.midAngle < 270 ? "end" : "start"}
                                >
                                    {segment.percentage}%
                                </SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>


            {/* Total Score - matching web version exactly */}
            <View style={{ marginTop: 16, padding: 12 }}>
                <Text style={{ fontSize: 12, color: "#4B5563", textAlign: "center" }}>
                    Total Score: <Text style={{ fontWeight: "600" }}>{total.toFixed(1)}</Text>
                </Text>
            </View>

            {/* Category Details Modal */}
            <Modal
                visible={!!selectedSegment}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedSegment(null)}
            >
                <TouchableOpacity
                    style={pieChartStyles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedSegment(null)}
                >
                    <View style={pieChartStyles.modalContent}>
                        <TouchableOpacity
                            style={pieChartStyles.closeBtn}
                            onPress={() => setSelectedSegment(null)}
                        >
                            <Text style={pieChartStyles.closeBtnText}>✕</Text>
                        </TouchableOpacity>

                        {selectedSegment && (
                            <>
                                <Text style={pieChartStyles.modalTitle}>
                                    {selectedSegment.category || selectedSegment.name}
                                </Text>

                                <View style={pieChartStyles.detailRow}>
                                    <Text style={pieChartStyles.detailLabel}>Average Score:</Text>
                                    <Text style={[pieChartStyles.detailValue, pieChartStyles.scoreValue]}>
                                        {selectedSegment.averageScore?.toFixed(1) || selectedSegment.value?.toFixed(1) || 0}
                                    </Text>
                                </View>

                                <View style={pieChartStyles.detailRow}>
                                    <Text style={pieChartStyles.detailLabel}>Contribution:</Text>
                                    <Text style={pieChartStyles.detailValue}>
                                        {selectedSegment.percentage || 0}%
                                    </Text>
                                </View>

                                {selectedSegment.results && selectedSegment.results.length > 0 && (
                                    <>
                                        <Text style={pieChartStyles.sectionTitle}>Assessments:</Text>
                                        <ScrollView style={pieChartStyles.resultsContainer}>
                                            {selectedSegment.results.map((res, idx) => (
                                                <View key={idx} style={pieChartStyles.resultItem}>
                                                    <Text style={pieChartStyles.resultTitle}>{res.title}</Text>
                                                    <View style={pieChartStyles.resultRow}>
                                                        <Text style={pieChartStyles.resultLabel}>Score:</Text>
                                                        <Text style={pieChartStyles.resultValue}>{res.score}</Text>
                                                        <Text style={pieChartStyles.resultLabel}>Result:</Text>
                                                        <Text style={pieChartStyles.resultValue}>{res.result}</Text>
                                                    </View>
                                                    {res.keyRecommendation && (
                                                        <Text style={pieChartStyles.recommendation}>
                                                            {res.keyRecommendation}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </>
                                )}

                                {selectedSegment.overallKeyRecommendation && (
                                    <View style={pieChartStyles.recommendationBox}>
                                        <Text style={pieChartStyles.recommendationTitle}>Key Recommendation:</Text>
                                        <Text style={pieChartStyles.recommendationText}>
                                            {selectedSegment.overallKeyRecommendation}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const pieChartStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        maxHeight: "80%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    closeBtnText: {
        fontSize: 18,
        color: "#6B7280",
        fontWeight: "600",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 20,
        textAlign: "center",
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: "#1F2937",
        flex: 1,
        textAlign: "right",
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#B0B300",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginTop: 8,
        marginBottom: 12,
    },
    resultsContainer: {
        maxHeight: 200,
        marginBottom: 12,
    },
    resultItem: {
        backgroundColor: "#F9FAFB",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#6366F1",
    },
    resultTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 6,
    },
    resultRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 6,
    },
    resultLabel: {
        fontSize: 12,
        color: "#6B7280",
    },
    resultValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#1F2937",
    },
    recommendation: {
        fontSize: 11,
        fontStyle: "italic",
        color: "#92400E",
        lineHeight: 16,
        marginTop: 4,
    },
    recommendationBox: {
        backgroundColor: "#FFFBEB",
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FDE68A",
        marginTop: 12,
    },
    recommendationTitle: {
        fontSize: 13,
        fontWeight: "700",
        color: "#78350F",
        marginBottom: 6,
    },
    recommendationText: {
        fontSize: 12,
        fontStyle: "italic",
        color: "#92400E",
        lineHeight: 18,
    },
});

// 3. Bar Chart Component (Category-specific test results)
export const NativeTestResultsBarChart = ({ data = [], category, avgScore = 0, testTaken = 0 }) => {
    const [selectedBar, setSelectedBar] = useState(null);
    const [fullAssessmentData, setFullAssessmentData] = useState(null);
    const [loadingAssessment, setLoadingAssessment] = useState(false);

    if (!data || data.length === 0) {
        return null;
    }

    const chartWidth = SCREEN_WIDTH - 80;
    const chartHeight = 250;
    const padding = 50;
    const maxScore = Math.max(...data.map(d => d.totalScore || 0), 30);

    const barWidth = (chartWidth - padding * 2) / data.length * 0.7;

    return (
        <View style={{ backgroundColor: "#ECFDF5", borderRadius: 16, padding: 20, marginBottom: 16, borderTopWidth: 8, borderTopColor: "#0B5302", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12 }}>{category} Chart</Text>

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Tests Taken: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{testTaken}</Text></Text>
                </View>
                <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Avg Score: <Text style={{ fontWeight: "700", color: "#1E293B" }}>{avgScore.toFixed(0)}</Text></Text>
                </View>
            </View>

            <View style={{ backgroundColor: "#FFF", borderRadius: 12, padding: 10 }}>
                <Svg width={chartWidth} height={chartHeight}>
                    {/* Grid lines */}
                    {[0, maxScore / 2, maxScore].map((score, i) => {
                        const y = chartHeight - padding - (score / maxScore) * (chartHeight - padding * 2);
                        return (
                            <React.Fragment key={i}>
                                <Line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#F2F2F2" strokeWidth="1" />
                                <SvgText x={padding - 30} y={y + 5} fontSize="10" fill="#6B7280">{Math.round(score)}</SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Bars - tappable */}
                    {data.map((item, index) => {
                        const score = item.totalScore || 0;
                        const barHeight = (score / maxScore) * (chartHeight - padding * 2);
                        const x = padding + (index * (chartWidth - padding * 2) / data.length);
                        const y = chartHeight - padding - barHeight;

                        return (
                            <G key={index}>
                                {/* Visible bar - make it tappable */}
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={COLORS[index % COLORS.length]}
                                    rx={6}
                                    onPress={async () => {
                                        console.log("Bar clicked:", item);
                                        // Show modal immediately with basic data
                                        setSelectedBar(item);
                                        setFullAssessmentData({
                                            title: item.assessmentId?.title || "Assessment Result",
                                            date: item.completedAt,
                                            answers: [],
                                            totalScore: item.totalScore || 0,
                                            result: item.result || "N/A",
                                            recommendations: []
                                        });
                                        
                                        // Then fetch full assessment data in background
                                        if (item.completedAt) {
                                            setLoadingAssessment(true);
                                            try {
                                                // Use the exact date from completedAt
                                                const dateStr = item.completedAt;
                                                console.log("Fetching assessment for date:", dateStr);
                                                
                                                const response = await api.getAssessmentByDate(dateStr);
                                                console.log("Assessment response:", response);
                                                
                                                if (response?.data && response.data.length > 0) {
                                                    let matching = response.data.find(
                                                        (a) => a.assessmentId?.title === item.assessmentId?.title
                                                    ) || response.data[0];
                                                    
                                                    const formattedData = {
                                                        title: matching.assessmentId?.title || item.assessmentId?.title || "Assessment Result",
                                                        date: matching.completedAt || item.completedAt,
                                                        answers: matching.answers || [],
                                                        totalScore: matching.totalScore || item.totalScore || 0,
                                                        result: matching.result || item.result || "N/A",
                                                        recommendations: matching.recommendations || []
                                                    };
                                                    
                                                    console.log("Formatted data:", formattedData);
                                                    setFullAssessmentData(formattedData);
                                                }
                                            } catch (error) {
                                                console.error("Error fetching assessment details:", error);
                                                // Keep the basic info we already set
                                            } finally {
                                                setLoadingAssessment(false);
                                            }
                                        }
                                    }}
                                />
                                {/* Larger invisible touch area for easier tapping */}
                                <Rect
                                    x={x - 10}
                                    y={0}
                                    width={barWidth + 20}
                                    height={chartHeight}
                                    fill="transparent"
                                    onPress={async () => {
                                        console.log("Bar clicked (touch area):", item);
                                        // Show modal immediately
                                        setSelectedBar(item);
                                        setFullAssessmentData({
                                            title: item.assessmentId?.title || "Assessment Result",
                                            date: item.completedAt,
                                            answers: [],
                                            totalScore: item.totalScore || 0,
                                            result: item.result || "N/A",
                                            recommendations: []
                                        });
                                        
                                        if (item.completedAt) {
                                            setLoadingAssessment(true);
                                            try {
                                                const response = await api.getAssessmentByDate(item.completedAt);
                                                
                                                if (response?.data && response.data.length > 0) {
                                                    let matching = response.data.find(
                                                        (a) => a.assessmentId?.title === item.assessmentId?.title
                                                    ) || response.data[0];
                                                    
                                                    setFullAssessmentData({
                                                        title: matching.assessmentId?.title || item.assessmentId?.title || "Assessment Result",
                                                        date: matching.completedAt || item.completedAt,
                                                        answers: matching.answers || [],
                                                        totalScore: matching.totalScore || item.totalScore || 0,
                                                        result: matching.result || item.result || "N/A",
                                                        recommendations: matching.recommendations || []
                                                    });
                                                }
                                            } catch (error) {
                                                console.error("Error:", error);
                                            } finally {
                                                setLoadingAssessment(false);
                                            }
                                        }
                                    }}
                                />
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={y - 5}
                                    fontSize="10"
                                    fill="#1E293B"
                                    textAnchor="middle"
                                    fontWeight="bold"
                                >
                                    {score}
                                </SvgText>
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={chartHeight - padding + 15}
                                    fontSize="9"
                                    fill="#6B7280"
                                    textAnchor="middle"
                                >
                                    {new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>

            <Text style={{ fontSize: 11, color: "#64748B", marginTop: 12 }}>
                Displays data from the 7 most recent assessments
            </Text>

            {/* Bar Details Modal */}
            <Modal
                visible={!!selectedBar}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setSelectedBar(null);
                    setFullAssessmentData(null);
                }}
            >
                <View style={barChartStyles.modalOverlay}>
                    {/* Tap outside the card to close */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            setSelectedBar(null);
                            setFullAssessmentData(null);
                        }}
                    >
                        <View style={StyleSheet.absoluteFillObject} />
                    </TouchableWithoutFeedback>

                    <View style={barChartStyles.modalContent}>
                        <TouchableOpacity
                            style={barChartStyles.closeBtn}
                            onPress={() => {
                                setSelectedBar(null);
                                setFullAssessmentData(null);
                            }}
                        >
                            <Text style={barChartStyles.closeBtnText}>✕</Text>
                        </TouchableOpacity>

                        {loadingAssessment ? (
                            <View style={{ padding: 40, alignItems: "center" }}>
                                <ActivityIndicator size="large" color="#0B5302" />
                                <Text style={{ marginTop: 12, color: "#64748B" }}>Loading assessment details...</Text>
                            </View>
                        ) : fullAssessmentData ? (
                            <ScrollView 
                                style={{ maxHeight: "90%", width: "100%" }} 
                                showsVerticalScrollIndicator={true} 
                                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 4, flexGrow: 1 }}
                            >
                                {/* Title - matching web exactly */}
                                <Text style={barChartStyles.modalTitle}>
                                    {fullAssessmentData.title || "Assessment Result"}
                                </Text>

                                {/* Questions and Answers - matching web layout exactly */}
                                {fullAssessmentData.answers && fullAssessmentData.answers.length > 0 ? (
                                    <View style={{ marginBottom: 32, gap: 20 }}>
                                        {fullAssessmentData.answers.map((answer, idx) => {
                                            const questionText = answer.question?.text || `Question ID: ${answer.questionId}`;
                                            const selectedOptionObj = answer.question?.options?.find(
                                                (o) => o.value === answer.selectedOption
                                            );
                                            const selectedOptionText = selectedOptionObj
                                                ? selectedOptionObj.text
                                                : `Option ${answer.selectedOption}`;
                                            const questionScore = answer.selectedOption;
                                            const maxQuestionScore = answer.question?.options
                                                ? Math.max(...answer.question.options.map((o) => o.value))
                                                : answer.selectedOption;
                                            const progressPercent = Math.round((questionScore / maxQuestionScore) * 100);

                                            return (
                                                <View key={answer._id?.$oid || answer._id || idx} style={barChartStyles.questionCard}>
                                                    {/* Question and Score Badge */}
                                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                                                        <Text style={[barChartStyles.questionText, { flex: 1, marginRight: 12 }]}>
                                                            {idx + 1}. {questionText}
                                                        </Text>
                                                        <View style={barChartStyles.scoreBadge}>
                                                            <Text style={barChartStyles.scoreBadgeText}>
                                                                {questionScore}/{maxQuestionScore}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    
                                                    {/* Answer */}
                                                    <Text style={barChartStyles.answerText}>
                                                        Answer: <Text style={barChartStyles.answerValue}>{selectedOptionText}</Text>
                                                    </Text>
                                                    
                                                    {/* Progress Bar */}
                                                    <View style={barChartStyles.progressBarContainer}>
                                                        <View style={[barChartStyles.progressBarFill, { width: `${progressPercent}%` }]} />
                                                    </View>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : (
                                    <Text style={{ textAlign: "center", color: "#94A3B8", marginBottom: 20 }}>
                                        No answers available.
                                    </Text>
                                )}

                                {/* Total Score & Result - matching web exactly */}
                                <View style={barChartStyles.scoreCard}>
                                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                                        <Text style={{ fontSize: 24, color: "#3B82F6", marginRight: 12 }}>✓</Text>
                                        <Text style={barChartStyles.scoreCardTitle}>Your Score</Text>
                                    </View>
                                    <Text style={barChartStyles.totalScoreText}>
                                        <Text style={{ fontWeight: "600" }}>Total Score:</Text> {fullAssessmentData.totalScore || 0} / {
                                            fullAssessmentData.answers && fullAssessmentData.answers.length > 0
                                                ? fullAssessmentData.answers.reduce((acc, answer) => {
                                                    const maxQ = answer.question?.options
                                                        ? Math.max(...answer.question.options.map((o) => o.value))
                                                        : answer.selectedOption;
                                                    return acc + maxQ;
                                                }, 0)
                                                : "-"
                                        }
                                    </Text>
                                    <Text style={barChartStyles.resultText}>
                                        <Text style={{ fontWeight: "600" }}>Result:</Text> {fullAssessmentData.result || "N/A"}
                                    </Text>
                                </View>

                                {/* Recommendations - matching web list style */}
                                {fullAssessmentData.recommendations && fullAssessmentData.recommendations.length > 0 && (
                                    <View style={barChartStyles.recommendationsCard}>
                                        <Text style={barChartStyles.sectionTitle}>Recommendations</Text>
                                        {fullAssessmentData.recommendations.map((rec, i) => (
                                            <View key={i} style={barChartStyles.recommendationItem}>
                                                <Text style={barChartStyles.recommendationBullet}>•</Text>
                                                <Text style={barChartStyles.recommendationText}>{rec}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </ScrollView>
                        ) : selectedBar ? (
                            <ScrollView
                                style={{ maxHeight: "90%", width: "100%" }}
                                showsVerticalScrollIndicator={true}
                                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 4, flexGrow: 1 }}
                            >
                                <Text style={barChartStyles.modalTitle}>Test Details</Text>
                                <View style={barChartStyles.detailRow}>
                                    <Text style={barChartStyles.detailLabel}>Date:</Text>
                                    <Text style={barChartStyles.detailValue}>
                                        {selectedBar.completedAt ? new Date(selectedBar.completedAt).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : "N/A"}
                                    </Text>
                                </View>
                                <View style={barChartStyles.detailRow}>
                                    <Text style={barChartStyles.detailLabel}>Test:</Text>
                                    <Text style={barChartStyles.detailValue}>
                                        {selectedBar.assessmentId?.title || "Test"}
                                    </Text>
                                </View>
                                <View style={barChartStyles.detailRow}>
                                    <Text style={barChartStyles.detailLabel}>Score:</Text>
                                    <Text style={[barChartStyles.detailValue, barChartStyles.scoreValue]}>
                                        {selectedBar.totalScore || 0}
                                    </Text>
                                </View>
                                <View style={barChartStyles.detailRow}>
                                    <Text style={barChartStyles.detailLabel}>Result:</Text>
                                    <Text style={barChartStyles.detailValue}>
                                        {selectedBar.result || "N/A"}
                                    </Text>
                                </View>
                            </ScrollView>
                        ) : (
                            <View style={{ padding: 40, alignItems: "center" }}>
                                <Text style={{ color: "#64748B" }}>No data available</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const barChartStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 24,
        width: "100%",
        maxWidth: 400,
        maxHeight: "90%",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    closeBtn: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1,
    },
    closeBtnText: {
        fontSize: 18,
        color: "#6B7280",
        fontWeight: "600",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 24,
        marginTop: 16,
        textAlign: "center",
    },
    dateBadge: {
        backgroundColor: "#DBEAFE",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    dateBadgeText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1E40AF",
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 12,
    },
    questionCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    questionText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937",
        lineHeight: 20,
    },
    scoreBadge: {
        backgroundColor: "#DBEAFE",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    scoreBadgeText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E40AF",
    },
    answerText: {
        fontSize: 13,
        color: "#4B5563",
        marginBottom: 12,
        lineHeight: 18,
    },
    answerValue: {
        color: "#3B82F6",
        fontWeight: "600",
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: "#E5E7EB",
        borderRadius: 6,
        overflow: "hidden",
    },
    progressBarFill: {
        height: "100%",
        backgroundColor: "#3B82F6",
        borderRadius: 6,
    },
    scoreCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#BFDBFE",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    scoreCardTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
    },
    totalScoreText: {
        fontSize: 20,
        color: "#1F2937",
        marginBottom: 8,
    },
    resultText: {
        fontSize: 18,
        color: "#4B5563",
    },
    recommendationsCard: {
        backgroundColor: "#FFF",
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    recommendationItem: {
        flexDirection: "row",
        marginBottom: 8,
    },
    recommendationBullet: {
        fontSize: 16,
        color: "#4B5563",
        marginRight: 8,
    },
    recommendationText: {
        fontSize: 13,
        color: "#4B5563",
        flex: 1,
        lineHeight: 20,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: "600",
        color: "#6B7280",
        flex: 1,
    },
    detailValue: {
        fontSize: 14,
        color: "#1F2937",
        flex: 2,
        textAlign: "right",
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0B5302",
    },
});

