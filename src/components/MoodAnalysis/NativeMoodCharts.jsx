import React, { useState, useMemo } from "react";
import { View, Text, Dimensions, TouchableOpacity, Modal, StyleSheet, ScrollView } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G, Defs, LinearGradient, Stop, Polyline } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Mood list with emojis (from web)
const moodsList = [
    { emoji: "😁", label: "Joyful" }, { emoji: "😊", label: "Happy" }, { emoji: "😌", label: "Calm" },
    { emoji: "🙏", label: "Grateful" }, { emoji: "💪", label: "Motivated" }, { emoji: "❤️", label: "Loved" },
    { emoji: "🌟", label: "Inspired" }, { emoji: "😢", label: "Sad" }, { emoji: "😡", label: "Angry" },
    { emoji: "😰", label: "Anxious" }, { emoji: "😩", label: "Tired" }, { emoji: "😖", label: "Overwhelmed" },
    { emoji: "😭", label: "Awful" }, { emoji: "😐", label: "Neutral" }, { emoji: "😕", label: "Confused" },
    { emoji: "🥱", label: "Bored" }, { emoji: "🙂", label: "Okay" }, { emoji: "🥹", label: "Nostalgic" },
    { emoji: "🌈", label: "Hopeful" }, { emoji: "😔", label: "Guilty" }, { emoji: "😳", label: "Ashamed" }
];

// Color palette
const COLORS = {
    primary: "#6366F1", success: "#22C55E", warning: "#F59E0B", danger: "#EF4444",
    purple: "#A855F7", cyan: "#06B6D4", pink: "#EC4899", emerald: "#10B981",
    slate: {
        50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 400: "#94A3B8",
        500: "#64748B", 600: "#475569", 700: "#334155", 800: "#1E293B", 900: "#0F172A"
    }
};

const returnEmojiForMood = (moodLabel) => {
    const userMood = moodsList.find(m => m.label.toLowerCase() === moodLabel?.toLowerCase());
    return userMood?.emoji || "😐";
};

const getMoodColor = (type) => {
    if (type === "positive") return COLORS.success;
    if (type === "negative") return COLORS.danger;
    return COLORS.warning;
};

// Transform mobile data to chart format
const transformMoodData = (entries) => {
    return entries.slice(0, 7).map(entry => {
        // Convert 1-5 moodScore to 0-100 normalized score
        const normalizedScore = ((entry.moodScore || 3) - 1) * 25; // 1->0, 3->50, 5->100
        const type = normalizedScore >= 64 ? "positive" : normalizedScore >= 45 ? "neutral" : "negative";

        return {
            id: entry._id,
            day: new Date(entry.createdAt).toLocaleDateString('en-US', { weekday: 'short' }),
            date: entry.createdAt,
            mood: returnEmojiForMood(entry.moodLabel),
            value: normalizedScore,
            type,
            label: entry.moodLabel || "Neutral",
            activities: entry.activities || []
        };
    });
};

// Calculate weekly average
const getWeeklyAverage = (chartData) => {
    if (!chartData || chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    return Math.round(total / chartData.length);
};

// Calculate trend
const getWeeklyTrend = (chartData) => {
    if (!chartData || chartData.length < 2) return { trend: 0, label: "Not enough data" };
    const today = chartData[chartData.length - 1].value;
    const yesterday = chartData[chartData.length - 2].value;
    const diff = today - yesterday;
    return {
        trend: Math.round(diff),
        label: diff > 0 ? `↑ +${diff} points` : diff < 0 ? `↓ ${diff} points` : "→ No change"
    };
};

// Tooltip Modal
const DataTooltip = ({ visible, data, onClose }) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
            <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipTitle}>{data?.mood} {data?.label}</Text>
                {data?.items?.map((item, i) => (
                    <View key={i} style={styles.tooltipRow}>
                        <Text style={styles.tooltipLabel}>{item.label}:</Text>
                        <Text style={styles.tooltipValue}>{item.value}</Text>
                    </View>
                ))}
                <TouchableOpacity style={styles.tooltipCloseBtn} onPress={onClose}>
                    <Text style={styles.tooltipCloseTxt}>Close</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    </Modal>
);

// MOOD ANALYTICS COMPONENT (Matching Web)
export const NativeMoodAnalytics = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [tooltipData, setTooltipData] = useState(null);

    const chartData = useMemo(() => transformMoodData(data), [data]);
    const weeklyAvg = getWeeklyAverage(chartData);
    const trend = getWeeklyTrend(chartData);

    if (chartData.length === 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>Mood Analytics</Text>
                <Text style={styles.subtitle}>Weekly mood analytics</Text>
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyText}>No mood data available</Text>
                </View>
            </View>
        );
    }

    const handlePointPress = (point) => {
        setTooltipData({
            mood: point.mood,
            label: point.label,
            items: [
                { label: "Date", value: new Date(point.date).toLocaleDateString() },
                { label: "Day", value: point.day },
                { label: "Score", value: `${point.value}/100` },
                { label: "Type", value: point.type }
            ]
        });
    };

    // Chart dimensions
    const height = 250;
    const padding = { left: 40, right: 20, top: 20, bottom: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={{ marginBottom: 12 }}>
                <Text style={styles.title}>Mood Analytics</Text>
                <Text style={styles.subtitle}>Weekly mood analytics</Text>
            </View>

            {/* Stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={styles.statBadge}>
                    <Text style={styles.statText}>Average: {weeklyAvg}/100</Text>
                </View>
                <View style={[styles.statBadge, {
                    backgroundColor: trend.trend > 0 ? COLORS.success : trend.trend < 0 ? COLORS.danger : COLORS.slate[400]
                }]}>
                    <Text style={[styles.statText, { color: '#fff' }]}>{trend.label}</Text>
                </View>
            </View>

            {/* Mood Over Time Chart */}
            <Text style={styles.sectionTitle}>Mood Over Time</Text>
            <Svg width={width} height={height}>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(val => {
                    const y = padding.top + chartHeight - (val / 100) * chartHeight;
                    return (
                        <G key={val}>
                            <Line
                                x1={padding.left} y1={y}
                                x2={width - padding.right} y2={y}
                                stroke={COLORS.slate[100]} strokeWidth="1" strokeDasharray="4,4"
                            />
                            <SvgText x={padding.left - 8} y={y + 4} fontSize="10" fill={COLORS.slate[400]} textAnchor="end">
                                {val}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Line path */}
                {chartData.length > 1 && (
                    <Polyline
                        points={chartData.map((d, i) => {
                            const x = padding.left + (i / (chartData.length - 1)) * chartWidth;
                            const y = padding.top + chartHeight - (d.value / 100) * chartHeight;
                            return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke={COLORS.primary}
                        strokeWidth="3"
                    />
                )}

                {/* Data points with emojis */}
                {chartData.map((d, i) => {
                    const x = padding.left + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
                    const y = padding.top + chartHeight - (d.value / 100) * chartHeight;
                    const color = getMoodColor(d.type);

                    return (
                        <G key={i}>
                            <Circle
                                cx={x} cy={y} r="8"
                                fill={color}
                                stroke="#fff" strokeWidth="2"
                                onPress={() => handlePointPress(d)}
                            />
                            {/* Day label */}
                            <SvgText
                                x={x} y={padding.top + chartHeight + 25}
                                fontSize="11" fill={COLORS.slate[600]} textAnchor="middle"
                            >
                                {d.day}
                            </SvgText>
                        </G>
                    );
                })}
            </Svg>

            <DataTooltip visible={!!tooltipData} data={tooltipData} onClose={() => setTooltipData(null)} />
        </View>
    );
};

// WEEKLY MOOD DISTRIBUTION (Donut Chart)
export const NativeWeeklyMoodDistribution = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [tooltipData, setTooltipData] = useState(null);

    const moodDistribution = useMemo(() => {
        const map = {};
        data.forEach(entry => {
            const mood = entry.mood || entry.moodLabel || "Neutral";
            map[mood] = (map[mood] || 0) + 1;
        });
        return map;
    }, [data]);

    const labels = Object.keys(moodDistribution);
    const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0);

    if (total === 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>Weekly Mood Distribution</Text>
                <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyText}>No distribution data</Text>
                </View>
            </View>
        );
    }

    const donutColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40", "#B4FF9F", "#FFB3E6"];

    let startAngle = 0;
    const arcs = labels.map((label, i) => {
        const count = moodDistribution[label];
        const percent = count / total;
        const angle = percent * 360;
        const nextAngle = startAngle + angle;
        const path = createDonutSlice(110, 110, 90, 55, startAngle, nextAngle);

        const arc = {
            label,
            count,
            percent,
            color: donutColors[i % donutColors.length],
            emoji: returnEmojiForMood(label),
            path
        };
        startAngle = nextAngle;
        return arc;
    });

    const handleSlicePress = (arc) => {
        setTooltipData({
            mood: arc.emoji,
            label: arc.label,
            items: [
                { label: "Count", value: arc.count },
                { label: "Percentage", value: `${(arc.percent * 100).toFixed(1)}%` },
                { label: "Total Entries", value: total }
            ]
        });
    };

    return (
        <View style={{ marginTop: 8 }}>
            <View style={{ alignItems: 'center', marginBottom: 20, position: 'relative' }}>
                <Svg width={220} height={220} viewBox="0 0 220 220">
                    {arcs.map((arc, i) => (
                        <TouchableOpacity key={i} onPress={() => handleSlicePress(arc)}>
                            <Path
                                d={arc.path}
                                fill={arc.color}
                                stroke="#FFFFFF"
                                strokeWidth={3}
                            />
                        </TouchableOpacity>
                    ))}
                </Svg>

                {tooltipData && (
                    <View style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: [{ translateX: -70 }, { translateY: -35 }],
                        backgroundColor: '#1F2937',
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderRadius: 12,
                        alignItems: 'center',
                        minWidth: 140,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 8,
                    }}>
                        <Text style={{ fontSize: 28, marginBottom: 6 }}>{tooltipData.mood}</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 }}>
                            {tooltipData.label}
                        </Text>
                        <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '700' }}>
                            Percent: {tooltipData.items[1].value}
                        </Text>
                    </View>
                )}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
                {arcs.map((arc, i) => (
                    <TouchableOpacity
                        key={i}
                        onPress={() => handleSlicePress(arc)}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            backgroundColor: '#F9FAFB',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                        }}
                    >
                        <View style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: arc.color,
                        }} />
                        <Text style={{ fontSize: 16 }}>{arc.emoji}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>
                            {arc.label}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>
                            {(arc.percent * 100).toFixed(0)}%
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={{ marginTop: 16, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#DBEAFE' }}>
                <Text style={{ fontSize: 13, color: '#1E40AF', textAlign: 'center', fontWeight: '600' }}>
                    Total Entries: <Text style={{ fontWeight: '700', color: '#1F2937' }}>{total}</Text>
                </Text>
            </View>
        </View>
    );
};

// Helper for pie slices
const createPieSlice = (cx, cy, r, startAngle, endAngle) => {
    if (endAngle - startAngle >= 360) {
        return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
    }
    if (isNaN(startAngle) || isNaN(endAngle)) return "";

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return "";

    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
};

// Helper for donut slices (with inner and outer radius)
const createDonutSlice = (cx, cy, outerR, innerR, startAngle, endAngle) => {
    if (endAngle - startAngle >= 360) {
        return `
            M ${cx - outerR} ${cy}
            A ${outerR} ${outerR} 0 1 1 ${cx + outerR} ${cy}
            A ${outerR} ${outerR} 0 1 1 ${cx - outerR} ${cy}
            M ${cx - innerR} ${cy}
            A ${innerR} ${innerR} 0 1 0 ${cx + innerR} ${cy}
            A ${innerR} ${innerR} 0 1 0 ${cx - innerR} ${cy}
            Z
        `;
    }

    if (isNaN(startAngle) || isNaN(endAngle)) return "";

    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    const x1Outer = cx + outerR * Math.cos(startRad);
    const y1Outer = cy + outerR * Math.sin(startRad);
    const x2Outer = cx + outerR * Math.cos(endRad);
    const y2Outer = cy + outerR * Math.sin(endRad);

    const x1Inner = cx + innerR * Math.cos(startRad);
    const y1Inner = cy + innerR * Math.sin(startRad);
    const x2Inner = cx + innerR * Math.cos(endRad);
    const y2Inner = cy + innerR * Math.sin(endRad);

    if (isNaN(x1Outer) || isNaN(y1Outer) || isNaN(x2Outer) || isNaN(y2Outer)) return "";

    const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

    return `
        M ${x1Outer} ${y1Outer}
        A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
        L ${x2Inner} ${y2Inner}
        A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}
        Z
    `;
};


// Circular Progress
export const CircularProgress = ({ value, total, size = 60, strokeWidth = 6, color = COLORS.primary }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const validTotal = Number(total) || 1;
    const validValue = Number(value) || 0;
    const progress = Math.min((validValue / validTotal) * circumference, circumference);
    const strokeDashoffset = circumference - progress;

    if (isNaN(strokeDashoffset)) return null;

    return (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
            <Svg width={size} height={size}>
                <Circle cx={size / 2} cy={size / 2} r={radius} stroke={COLORS.slate[200]} strokeWidth={strokeWidth} fill="none" />
                <Circle
                    cx={size / 2} cy={size / 2} r={radius}
                    stroke={color} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}
                />
            </Svg>
            <View style={{ position: "absolute" }}>
                <Text style={{ fontSize: 10, fontWeight: "bold", color: COLORS.slate[900] }}>
                    {Math.round((validValue / validTotal) * 100)}%
                </Text>
            </View>
        </View>
    );
};

// Backward compatibility aliases
export const NativeLineChart = NativeMoodAnalytics;
export const NativeBarChart = NativeWeeklyMoodDistribution;
export const NativePieChart = NativeWeeklyMoodDistribution;
export const NativeMoodCount = NativeWeeklyMoodDistribution;
export const NativeMoodScoreChart = NativeMoodAnalytics;
export const NativeTestResultsBarChart = ({ data }) => null; // Placeholder
export const NativeMoodTrendChart = NativeMoodAnalytics;
export const NativeMoodDistributionChart = NativeWeeklyMoodDistribution;

const styles = StyleSheet.create({
    card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10 },
    title: { fontSize: 18, fontWeight: "700", color: COLORS.slate[900] },
    subtitle: { fontSize: 13, color: COLORS.slate[500], marginTop: 2 },
    sectionTitle: { fontSize: 14, fontWeight: "600", color: COLORS.slate[700], marginTop: 16, marginBottom: 12 },
    emptyText: { color: COLORS.slate[400], fontSize: 14 },
    statBadge: { backgroundColor: COLORS.slate[100], paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    statText: { fontSize: 11, fontWeight: "600", color: COLORS.slate[700] },
    legendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
    lengendLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: COLORS.slate[900] },
    legendValue: { fontSize: 12, color: COLORS.slate[600], marginLeft: 'auto' },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center" },
    tooltipContainer: { backgroundColor: "#fff", borderRadius: 16, padding: 20, width: "80%", maxWidth: 320, elevation: 5 },
    tooltipTitle: { fontSize: 18, fontWeight: "700", color: COLORS.slate[900], textAlign: "center", marginBottom: 16 },
    tooltipRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
    tooltipLabel: { fontSize: 14, color: COLORS.slate[600], fontWeight: "500" },
    tooltipValue: { fontSize: 14, color: COLORS.slate[900], fontWeight: "600" },
    tooltipCloseBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 12 },
    tooltipCloseTxt: { color: "#fff", fontSize: 14, fontWeight: "600" }
});
