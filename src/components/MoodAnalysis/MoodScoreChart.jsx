import React, { useMemo, useState } from "react";
import { View, Text, Dimensions, StyleSheet, Modal, TouchableOpacity } from "react-native";
import Svg, { Path, Circle, Line as SvgLine, G, Text as SvgText, Defs, LinearGradient, Stop } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Tag colors for situations
const TAG_COLORS = [
    { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
    { bg: "#FFEDD5", text: "#9A3412", border: "#FDBA74" },
    { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
    { bg: "#FEF9C3", text: "#854D0E", border: "#FDE047" },
    { bg: "#ECFCCB", text: "#3F6212", border: "#BEF264" },
    { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
    { bg: "#D1FAE5", text: "#047857", border: "#6EE7B7" },
    { bg: "#CCFBF1", text: "#115E59", border: "#5EEAD4" },
    { bg: "#CFFAFE", text: "#164E63", border: "#67E8F9" },
    { bg: "#E0F2FE", text: "#075985", border: "#7DD3FC" },
    { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
    { bg: "#E0E7FF", text: "#3730A3", border: "#A5B4FC" },
    { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
    { bg: "#F3E8FF", text: "#6B21A8", border: "#D8B4FE" },
    { bg: "#FAE8FF", text: "#86198F", border: "#F0ABFC" },
    { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" }
];

function calculateNormalizedScore(situation) {
    const intensities = situation?.intensities ?? [];
    const entryScore = situation?.entry_score ?? 0;
    const tagAdjustment = situation?.tag_adjustment ?? 0;

    if (intensities.length === 0) {
        return Math.round((entryScore + tagAdjustment + 1) * 50);
    }

    const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const intensityScaled = avgIntensity / 5;
    const baseScore = intensityScaled - 0.5;
    const finalAdjusted = baseScore + entryScore + tagAdjustment;
    return Math.round((finalAdjusted + 1) * 50);
}

// Smooth Line Chart Component
const SmoothLineChart = ({ data, width, height, onPointPress }) => {
    if (!data || data.length === 0) return null;

    const padding = { left: 35, right: 15, top: 30, bottom: 30 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const minScore = 0;
    const maxScore = 100;
    const avgScore = Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length);

    // Create smooth path
    const points = data.map((d, i) => {
        const x = padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
        const y = padding.top + chartHeight - ((d.score - minScore) / (maxScore - minScore)) * chartHeight;
        return { x, y, ...d };
    });

    // Create smooth curve path
    let pathData = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : '';
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cpx = (prev.x + curr.x) / 2;
        pathData += ` Q ${cpx} ${prev.y}, ${curr.x} ${curr.y}`;
    }

    return (
        <Svg width={width} height={height}>
            <Defs>
                <LinearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#22C55E" stopOpacity="1" />
                    <Stop offset="100%" stopColor="#10B981" stopOpacity="1" />
                </LinearGradient>
            </Defs>

            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map(val => {
                const y = padding.top + chartHeight - ((val - minScore) / (maxScore - minScore)) * chartHeight;
                return (
                    <G key={val}>
                        <SvgLine
                            x1={padding.left}
                            y1={y}
                            x2={width - padding.right}
                            y2={y}
                            stroke="#E5E7EB"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                        />
                        <SvgText
                            x={padding.left - 8}
                            y={y + 4}
                            fontSize="10"
                            fill="#9CA3AF"
                            textAnchor="end"
                        >
                            {val}
                        </SvgText>
                    </G>
                );
            })}

            {/* Average line */}
            {avgScore && (() => {
                const avgY = padding.top + chartHeight - ((avgScore - minScore) / (maxScore - minScore)) * chartHeight;
                return (
                    <SvgLine
                        x1={padding.left}
                        y1={avgY}
                        x2={width - padding.right}
                        y2={avgY}
                        stroke="#22C55E"
                        strokeWidth="2"
                        strokeDasharray="6,6"
                        opacity="0.5"
                    />
                );
            })()}

            {/* Smooth line */}
            {pathData && (
                <Path
                    d={pathData}
                    stroke="url(#lineGradient)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            )}

            {/* Data points - tappable */}
            {points.map((point, i) => (
                <Circle
                    key={i}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="#22C55E"
                    stroke="#fff"
                    strokeWidth="2"
                    onPress={() => onPointPress && onPointPress(data[i])}
                />
            ))}
        </Svg>
    );
};

// Main Component
export const NativeMoodScoreChart = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [selectedPoint, setSelectedPoint] = useState(null);

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const sorted = [...data].sort((a, b) => new Date(a.createdAt || a.date) - new Date(b.createdAt || b.date));

        return sorted.map(entry => {
            const score = entry.situations && entry.situations.length
                ? Math.round(
                    entry.situations.reduce((sum, s) => sum + calculateNormalizedScore(s), 0) / entry.situations.length
                )
                : 50;

            return {
                score,
                date: entry.date || (entry.createdAt ? entry.createdAt.split('T')[0] : ''),
                mood: entry.mood || 'Unknown',
                situations: entry.situations || []
            };
        });
    }, [data]);

    const uniqueSituations = useMemo(() => {
        const situationSet = new Set();
        data.forEach(entry => {
            (entry.situations || []).forEach(s => {
                if (s.situation) situationSet.add(s.situation);
            });
        });
        return [...situationSet].map((name, i) => ({
            name,
            color: TAG_COLORS[i % TAG_COLORS.length]
        }));
    }, [data]);

    const avgScore = chartData.length > 0
        ? Math.round(chartData.reduce((sum, d) => sum + d.score, 0) / chartData.length)
        : 0;

    if (chartData.length === 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>Mood Score</Text>
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyText}>No mood score data</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Mood Score</Text>
                <View style={styles.avgBadge}>
                    <Text style={styles.avgText}>Avg: {avgScore}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Chart */}
            <View style={{ marginVertical: 12 }}>
                <SmoothLineChart
                    data={chartData}
                    width={width}
                    height={220}
                    onPointPress={setSelectedPoint}
                />
            </View>

            {/* Situations Tags - Wrapped */}
            {uniqueSituations.length > 0 && (
                <>
                    <Text style={styles.sectionTitle}>Situations</Text>
                    <View style={styles.tagsContainer}>
                        {uniqueSituations.map((tag, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.tag,
                                    {
                                        backgroundColor: tag.color.bg,
                                        borderColor: tag.color.border
                                    }
                                ]}
                            >
                                <Text style={[styles.tagText, { color: tag.color.text }]}>
                                    {tag.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

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
                                <Text style={styles.modalTitle}>Mood Score Details</Text>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date:</Text>
                                    <Text style={styles.detailValue}>{selectedPoint.date}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Mood:</Text>
                                    <Text style={styles.detailValue}>{selectedPoint.mood}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Score:</Text>
                                    <Text style={[styles.detailValue, styles.scoreValue]}>{selectedPoint.score}/100</Text>
                                </View>

                                {selectedPoint.situations && selectedPoint.situations.length > 0 && (
                                    <>
                                        <Text style={styles.situationsTitle}>Situations:</Text>
                                        {selectedPoint.situations.map((s, i) => (
                                            <View key={i} style={styles.situationItem}>
                                                <Text style={styles.situationName}>• {s.situation}</Text>
                                                {s.emotions && s.emotions.length > 0 && (
                                                    <Text style={styles.emotionText}>
                                                        {s.emotions.map(e => e.emotion).join(', ')}
                                                    </Text>
                                                )}
                                            </View>
                                        ))}
                                    </>
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
    card: {
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 1,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        borderWidth: 1,
        borderColor: "#F3F4F6"
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937"
    },
    avgBadge: {
        backgroundColor: "#DCFCE7",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16
    },
    avgText: {
        fontSize: 11,
        fontWeight: "600",
        color: "#166534"
    },
    divider: {
        height: 1,
        backgroundColor: "#E5E7EB",
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 10,
        marginTop: 8
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    tag: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 1
    },
    tagText: {
        fontSize: 11,
        fontWeight: "500"
    },
    emptyText: {
        color: "#9CA3AF",
        fontSize: 13
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center"
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 20,
        width: "85%",
        maxWidth: 360,
        elevation: 5
    },
    closeBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: "#F3F4F6",
        alignItems: 'center',
        justifyContent: 'center'
    },
    closeBtnText: {
        fontSize: 18,
        color: "#6B7280"
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 16,
        textAlign: 'center'
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6"
    },
    detailLabel: {
        fontSize: 13,
        color: "#6B7280",
        fontWeight: "500"
    },
    detailValue: {
        fontSize: 13,
        color: "#1F2937",
        fontWeight: "600"
    },
    scoreValue: {
        color: "#22C55E",
        fontSize: 14
    },
    situationsTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#374151",
        marginTop: 12,
        marginBottom: 8
    },
    situationItem: {
        marginBottom: 8,
        paddingLeft: 8
    },
    situationName: {
        fontSize: 13,
        color: "#1F2937",
        fontWeight: "500"
    },
    emotionText: {
        fontSize: 11,
        color: "#6B7280",
        marginTop: 2,
        paddingLeft: 12
    }
});
