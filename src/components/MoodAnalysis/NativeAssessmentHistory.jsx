import React, { useState } from "react";
import { View, Text, Dimensions, ScrollView, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Target } from "lucide-react-native";
import Svg, { Line, Circle, Polyline, Text as SvgText, G } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

const NativeAssessmentHistory = ({ data = [], avgScore = 0 }) => {
    const [selectedPoint, setSelectedPoint] = useState(null);
    console.log("📊 Assessment History - Data:", data);
    console.log("📊 Assessment History - Avg Score:", avgScore);
    console.log("📊 Assessment History - Data length:", data?.length);
    if (!data || data.length === 0) {
        return (
            <View style={{
                backgroundColor: "#EEF2FF",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                borderTopWidth: 6,
                borderTopColor: "#8B5CF6",
            }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                    <Target size={20} color="#3B82F6" />
                    <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginLeft: 8 }}>
                        Assessment History
                    </Text>
                </View>
                <Text style={{ fontSize: 14, color: "#6B7280", textAlign: "center", marginTop: 20 }}>
                    No assessment data available
                </Text>
            </View>
        );
    }

    // Prepare chart data (chronological)
    const chartData = [...data].reverse(); // oldest -> newest

    // To avoid a cluttered chart when there are many assessments,
    // only show the most recent N points and allow horizontal scroll if needed.
    const MAX_VISIBLE_POINTS = 15;
    const visibleData =
        chartData.length > MAX_VISIBLE_POINTS
            ? chartData.slice(chartData.length - MAX_VISIBLE_POINTS)
            : chartData;

    const maxScore = 40; // Y-axis goes to 40, matching web version
    const baseWidth = SCREEN_WIDTH - 80;
    const chartHeight = 250;
    const padding = 40;
    const minPointSpacing = 28;

    // Dynamic width so points have enough breathing room
    const chartWidth =
        visibleData.length > 1
            ? Math.max(
                baseWidth,
                padding * 2 + minPointSpacing * (visibleData.length - 1)
            )
            : baseWidth;

    // Calculate points for the line (only visible data)
    const points = visibleData.map((item, index) => {
        const x = padding + (index / Math.max(visibleData.length - 1, 1)) * (chartWidth - padding * 2);
        const y = chartHeight - padding - ((item.totalScore || 0) / maxScore) * (chartHeight - padding * 2);
        return { x, y, score: item.totalScore || 0 };
    });

    // Create polyline path
    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <View style={{
            backgroundColor: "#E0E7FF", // indigo-200 equivalent
            borderRadius: 16,
            padding: 20,
            marginBottom: 16,
            borderTopWidth: 8,
            borderTopColor: "#72059C", // Matching web border color
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
        }}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Target size={20} color="#3B82F6" />
                <Text style={{ fontSize: 16, fontWeight: "600", color: "#1F2937", marginLeft: 8 }}>
                    Assessment History
                </Text>
            </View>

            {/* Average Score - Matching web style */}
            <View style={{
                backgroundColor: "#F3F4F6",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 8,
                alignSelf: "flex-start",
                marginBottom: 16,
            }}>
                <Text style={{ fontSize: 12, color: "#374151", fontWeight: "600" }}>
                    Average: {avgScore}/30
                </Text>
            </View>

            {/* Section Title - Matching web */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>
                Assessment Over Time
            </Text>

            {/* SVG Line Chart - in a horizontal ScrollView so it doesn't feel cramped */}
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 12, paddingVertical: 12, paddingHorizontal: 0, marginBottom: 16 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 12 }}
                >
                <Svg width={chartWidth} height={chartHeight}>
                    {/* Grid lines - Y-axis 0 to 40, matching web */}
                    {[0, 10, 20, 30, 40].map((score, i) => {
                        const y = chartHeight - padding - (score / maxScore) * (chartHeight - padding * 2);
                        return (
                            <React.Fragment key={i}>
                                <Line
                                    x1={padding}
                                    y1={y}
                                    x2={chartWidth - padding}
                                    y2={y}
                                    stroke="#F2F2F2"
                                    strokeWidth="1"
                                />
                                <SvgText
                                    x={padding - 25}
                                    y={y + 5}
                                    fontSize="10"
                                    fill="#6B7280"
                                >
                                    {score}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}

                    {/* Line chart */}
                    {points.length > 1 && (
                        <Polyline
                            points={polylinePoints}
                            fill="none"
                            stroke="#8224ED"
                            strokeWidth="3"
                        />
                    )}

                    {/* Data points - tappable */}
                    {points.map((point, index) => {
                        const item = visibleData[index];
                        return (
                            <G key={index}>
                                <Circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="8"
                                    fill="transparent"
                                    onPress={() => setSelectedPoint(item)}
                                />
                                <Circle
                                    cx={point.x}
                                    cy={point.y}
                                    r="6"
                                    fill="#004C99"
                                    stroke="#FFFFFF"
                                    strokeWidth="2"
                                />
                            </G>
                        );
                    })}

                    {/* X-axis labels (for visible data only) */}
                    {visibleData.map((item, index) => {
                        const date = new Date(item.completedAt);
                        const label = `${date.getMonth() + 1}/${date.getDate()}`;
                        const x = padding + (index / Math.max(visibleData.length - 1, 1)) * (chartWidth - padding * 2);
                        return (
                            <SvgText
                                key={index}
                                x={x}
                                y={chartHeight - 10}
                                fontSize="10"
                                fill="#6B7280"
                                textAnchor="middle"
                            >
                                {label}
                            </SvgText>
                        );
                    })}
                </Svg>
            </ScrollView>
            </View>

            {/* Recent Assessments List */}
            <View style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F2937", marginBottom: 12 }}>
                    Recent Assessments
                </Text>
                {data.slice(0, 3).map((item, index) => {
                    const date = new Date(item.completedAt);
                    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                    return (
                        <View
                            key={index}
                            style={{
                                backgroundColor: "#FFFFFF",
                                padding: 12,
                                borderRadius: 12,
                                marginBottom: 8,
                                borderLeftWidth: 4,
                                borderLeftColor: item.totalScore >= 20 ? "#10B981" : item.totalScore >= 10 ? "#F59E0B" : "#EF4444",
                            }}
                        >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                <Text style={{ fontSize: 13, fontWeight: "600", color: "#1F2937", flex: 1 }}>
                                    {item.assessmentId?.title || "Assessment"}
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: "700", color: "#8B5CF6" }}>
                                    {item.totalScore}/30
                                </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
                                {dateStr}
                            </Text>
                            <View style={{
                                backgroundColor: item.result === "Minimal" ? "#D1FAE5" : item.result === "Mild" ? "#FEF3C7" : "#FEE2E2",
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                alignSelf: "flex-start",
                            }}>
                                <Text style={{
                                    fontSize: 11,
                                    fontWeight: "600",
                                    color: item.result === "Minimal" ? "#065F46" : item.result === "Mild" ? "#92400E" : "#991B1B",
                                }}>
                                    {item.result}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            {/* Point Details Modal */}
            <Modal
                visible={!!selectedPoint}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedPoint(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedPoint(null)}
                >
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setSelectedPoint(null)}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>

                        {selectedPoint && (
                            <>
                                <Text style={styles.modalTitle}>Assessment Details</Text>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date:</Text>
                                    <Text style={styles.detailValue}>
                                        {new Date(selectedPoint.completedAt).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Assignment:</Text>
                                    <Text style={styles.detailValue}>
                                        {selectedPoint.assessmentId?.title || "Assessment"}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Score:</Text>
                                    <Text style={[styles.detailValue, styles.scoreValue]}>
                                        {selectedPoint.totalScore}/30
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Result:</Text>
                                    <View style={[
                                        styles.resultBadge,
                                        {
                                            backgroundColor: selectedPoint.result === "Minimal" ? "#D1FAE5" : 
                                                           selectedPoint.result === "Mild" ? "#FEF3C7" : "#FEE2E2",
                                        }
                                    ]}>
                                        <Text style={[
                                            styles.resultText,
                                            {
                                                color: selectedPoint.result === "Minimal" ? "#065F46" : 
                                                       selectedPoint.result === "Mild" ? "#92400E" : "#991B1B",
                                            }
                                        ]}>
                                            {selectedPoint.result}
                                        </Text>
                                    </View>
                                </View>

                                {selectedPoint.assessmentId?.category && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Category:</Text>
                                        <Text style={styles.detailValue}>
                                            {selectedPoint.assessmentId.category}
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

const styles = StyleSheet.create({
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
        flex: 2,
        textAlign: "right",
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: "700",
        color: "#8B5CF6",
    },
    resultBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    resultText: {
        fontSize: 13,
        fontWeight: "600",
    },
});

export default NativeAssessmentHistory;
