import React, { useState, useMemo } from "react";
import { View, Text, Dimensions, TouchableOpacity, Modal, StyleSheet, ScrollView } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G, Defs, LinearGradient, Stop, Polyline } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

const moodsList = [
    { emoji: "😁", label: "Joyful" }, { emoji: "😊", label: "Happy" }, { emoji: "😌", label: "Calm" },
    { emoji: "🙏", label: "Grateful" }, { emoji: "💪", label: "Motivated" }, { emoji: "❤️", label: "Loved" },
    { emoji: "🌟", label: "Inspired" }, { emoji: "😢", label: "Sad" }, { emoji: "😡", label: "Angry" },
    { emoji: "😰", label: "Anxious" }, { emoji: "😩", label: "Tired" }, { emoji: "😖", label: "Overwhelmed" },
    { emoji: "😭", label: "Awful" }, { emoji: "😐", label: "Neutral" }, { emoji: "😕", label: "Confused" },
    { emoji: "🥱", label: "Bored" }, { emoji: "🙂", label: "Okay" }, { emoji: "🥹", label: "Nostalgic" },
    { emoji: "🌈", label: "Hopeful" }, { emoji: "😔", label: "Guilty" }, { emoji: "😳", label: "Ashamed" }
];

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

const transformMoodData = (entries) => {
    return entries.slice(0, 7).map(entry => {
        // Calculate normalized score from situations if available
        let normalizedScore = 50; // default neutral

        if (entry.situations && entry.situations.length > 0) {
            const scores = entry.situations.map(s => {
                const intensities = s.intensities || [];
                if (intensities.length === 0) return 50;
                const avgIntensity = intensities.reduce((a, b) => a + b, 0) / intensities.length;
                const intensityScaled = avgIntensity / 5;
                const baseScore = intensityScaled - 0.5;
                const finalAdjusted = baseScore + (s.entry_score || 0) + (s.tag_adjustment || 0);
                return Math.round((finalAdjusted + 1) * 50);
            });
            normalizedScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        } else if (entry.moodScore) {
            normalizedScore = ((entry.moodScore || 3) - 1) * 25;
        }

        const type = normalizedScore >= 64 ? "positive" : normalizedScore >= 45 ? "neutral" : "negative";

        return {
            id: entry._id,
            day: new Date(entry.createdAt || entry.date).toLocaleDateString('en-US', { weekday: 'short' }),
            date: entry.createdAt || entry.date,
            mood: returnEmojiForMood(entry.moodLabel || entry.mood),
            value: normalizedScore,
            type,
            label: entry.moodLabel || entry.mood || "Neutral",
            activities: entry.activities || [],
            situations: entry.situations || []
        };
    });
};

const getWeeklyAverage = (chartData) => {
    if (!chartData || chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.value, 0);
    return Math.round(total / chartData.length);
};

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

const SmallTooltip = ({ visible, data, position, onClose }) => {
    if (!visible || !data) return null;

    return (
        <TouchableOpacity style={styles.tooltipOverlay} activeOpacity={1} onPress={onClose}>
            <View style={[styles.smallTooltip, { top: position?.y || 100, left: Math.max(20, Math.min(position?.x - 70, SCREEN_WIDTH - 160)) }]}>
                <Text style={styles.tooltipEmoji}>{data.mood}</Text>
                <Text style={styles.tooltipMoodLabel}>{data.label}</Text>
                <Text style={styles.tooltipScore}>Score: {data.value}/100</Text>
                <Text style={styles.tooltipDay}>Day: {data.day}</Text>
            </View>
        </TouchableOpacity>
    );
};

export const NativeMoodAnalytics = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [tooltipData, setTooltipData] = useState(null);
    const [tooltipPosition, setTooltipPosition] = useState(null);

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

    const handleBarPress = (point, index) => {
        console.log('handleBarPress called with:', point, index);
        console.log('Current tooltipData:', tooltipData);
        const newData = tooltipData?.id === point.id ? null : point;
        console.log('Setting tooltipData to:', newData);
        setTooltipData(newData);
    };

    const height = 250;
    const padding = { left: 40, right: 20, top: 20, bottom: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = (chartWidth / chartData.length) * 0.7;

    return (
        <View style={styles.card}>
            <View style={{ marginBottom: 12 }}>
                <Text style={styles.title}>Mood Analytics</Text>
                <Text style={styles.subtitle}>Weekly mood analytics</Text>
            </View>

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

            <Text style={styles.sectionTitle}>Mood Over Time</Text>
            <View style={{ position: 'relative' }}>
                <Svg width={width} height={height}>
                    {[0, 25, 50, 75, 100].map(val => {
                        const y = padding.top + chartHeight - (val / 100) * chartHeight;
                        return (
                            <G key={val}>
                                <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={COLORS.slate[100]} strokeWidth="1" strokeDasharray="4,4" />
                                <SvgText x={padding.left - 8} y={y + 4} fontSize="10" fill={COLORS.slate[400]} textAnchor="end">{val}</SvgText>
                            </G>
                        );
                    })}

                    {chartData.map((d, i) => {
                        const x = padding.left + (i / chartData.length) * chartWidth;
                        const barHeight = (d.value / 100) * chartHeight;
                        const y = padding.top + chartHeight - barHeight;
                        const color = getMoodColor(d.type);

                        return (
                            <G key={i}>
                                <Rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={color}
                                    rx={4}
                                    onPress={() => {
                                        console.log('Bar pressed:', d);
                                        handleBarPress(d, i);
                                    }}
                                />
                                <SvgText x={x + barWidth / 2} y={padding.top + chartHeight + 25} fontSize={11} fill={COLORS.slate[600]} textAnchor="middle">{d.day}</SvgText>
                            </G>
                        );
                    })}
                </Svg>
            </View>

            {/* Modal Popup for Bar Details */}
            <Modal visible={!!tooltipData} transparent animationType="fade" onRequestClose={() => setTooltipData(null)}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTooltipData(null)}>
                    <View style={styles.tooltipModal}>
                        <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setTooltipData(null)}>
                            <Text style={styles.modalCloseBtnText}>✕</Text>
                        </TouchableOpacity>

                        <ScrollView showsVerticalScrollIndicator={true}>
                            {tooltipData && (
                                <>
                                    <Text style={styles.modalEmoji}>{tooltipData.mood}</Text>
                                    <Text style={styles.modalMoodLabel}>{tooltipData.label}</Text>

                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalLabel}>Score:</Text>
                                        <Text style={[styles.modalValue, { color: getMoodColor(tooltipData.type) }]}>
                                            {tooltipData.value}/100
                                        </Text>
                                    </View>

                                    <View style={styles.modalDetailRow}>
                                        <Text style={styles.modalLabel}>Date:</Text>
                                        <Text style={styles.modalValue}>
                                            {new Date(tooltipData.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Text>
                                    </View>

                                    {tooltipData.situations && tooltipData.situations.length > 0 && (
                                        <>
                                            <Text style={styles.modalSectionTitle}>Situations & Tags:</Text>
                                            {tooltipData.situations.map((s, i) => (
                                                <View key={i} style={styles.situationBox}>
                                                    <Text style={styles.situationName}>• {s.situation}</Text>
                                                    {s.emotions && s.emotions.length > 0 && (
                                                        <View style={styles.emotionsContainer}>
                                                            {s.emotions.map((e, ei) => (
                                                                <View key={ei} style={styles.emotionTag}>
                                                                    <Text style={styles.emotionTagText}>{e.emotion}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </>
                                    )}

                                    {tooltipData.activities && tooltipData.activities.length > 0 && (
                                        <>
                                            <Text style={styles.modalSectionTitle}>Activities:</Text>
                                            <View style={styles.activitiesContainer}>
                                                {tooltipData.activities.map((activity, i) => (
                                                    <View key={i} style={styles.activityTag}>
                                                        <Text style={styles.activityTagText}>{activity}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </>
                            )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

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

    // Build arcs synchronously - no delays
    const arcs = [];
    let currentAngle = 0;

    labels.forEach((label, i) => {
        const count = moodDistribution[label];
        const percent = count / total;
        const sweepAngle = Math.min(percent * 360, 359.99);

        // Only add arc if it has a positive angle
        if (sweepAngle > 0) {
            const path = createDonutSlice(120, 120, 100, 60, currentAngle, currentAngle + sweepAngle);

            if (path) {
                arcs.push({
                    label,
                    count,
                    percent,
                    color: donutColors[i % donutColors.length],
                    emoji: returnEmojiForMood(label),
                    path
                });
            }
        }

        currentAngle += sweepAngle;
    });

    const handleSlicePress = (arc) => {
        setTooltipData(tooltipData?.label === arc.label ? null : arc);
    };

    return (
        <View style={{ marginTop: 8 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Svg width={240} height={240} viewBox="0 0 240 240">
                    {arcs.filter(arc => arc.path).map((arc, i) => (
                        <Path
                            key={`arc-${i}-${arc.label}`}
                            d={arc.path}
                            fill={arc.color}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                            onPress={() => handleSlicePress(arc)}
                        />
                    ))}
                    <SvgText x={120} y={115} fontSize="36" fontWeight="bold" fill="#1F2937" textAnchor="middle">
                        {total}
                    </SvgText>
                    <SvgText x={120} y={145} fontSize="14" fill="#6B7280" textAnchor="middle">
                        Total Moods
                    </SvgText>
                </Svg>
            </View>

            {/* Legend */}
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
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: arc.color }} />
                        <Text style={{ fontSize: 16 }}>{arc.emoji}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>{arc.label}</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>{(arc.percent * 100).toFixed(0)}%</Text>
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

const createDonutSlice = (cx, cy, outerR, innerR, startAngle, endAngle) => {
    // Validate inputs
    if (isNaN(startAngle) || isNaN(endAngle) || isNaN(cx) || isNaN(cy) || isNaN(outerR) || isNaN(innerR)) {
        return "";
    }

    // Ensure angles are valid
    const validStartAngle = Number(startAngle) || 0;
    const validEndAngle = Number(endAngle) || 0;

    // Handle full circle case
    if (validEndAngle - validStartAngle >= 359.99) {
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

    // Convert to radians
    const startRad = (validStartAngle - 90) * Math.PI / 180;
    const endRad = (validEndAngle - 90) * Math.PI / 180;

    // Calculate outer arc points
    const x1Outer = cx + outerR * Math.cos(startRad);
    const y1Outer = cy + outerR * Math.sin(startRad);
    const x2Outer = cx + outerR * Math.cos(endRad);
    const y2Outer = cy + outerR * Math.sin(endRad);

    // Calculate inner arc points  
    const x1Inner = cx + innerR * Math.cos(startRad);
    const y1Inner = cy + innerR * Math.sin(startRad);
    const x2Inner = cx + innerR * Math.cos(endRad);
    const y2Inner = cy + innerR * Math.sin(endRad);

    // Check for NaN values
    if (isNaN(x1Outer) || isNaN(y1Outer) || isNaN(x2Outer) || isNaN(y2Outer)) {
        return "";
    }

    // Large arc flag
    const largeArc = (validEndAngle - validStartAngle) > 180 ? 1 : 0;

    return `
        M ${x1Outer} ${y1Outer}
        A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
        L ${x2Inner} ${y2Inner}
        A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}
        Z
    `;
};

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

export const NativeLineChart = NativeMoodAnalytics;
export const NativeBarChart = NativeMoodAnalytics;
export const NativePieChart = NativeWeeklyMoodDistribution;
export const NativeMoodCount = NativeWeeklyMoodDistribution;
export const NativeMoodScoreChart = NativeMoodAnalytics;
export const NativeTestResultsBarChart = ({ data }) => null;
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
    tooltipOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
    smallTooltip: {
        position: 'absolute',
        backgroundColor: '#1F2937',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1001
    },
    barTooltip: {
        position: 'absolute',
        backgroundColor: '#1F2937',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 140,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000
    },
    tooltipEmoji: { fontSize: 32, marginBottom: 4 },
    tooltipMoodLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 6 },
    tooltipScore: { fontSize: 12, color: '#10B981', fontWeight: '600', marginBottom: 2 },
    tooltipDay: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
    donutTooltip: {
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
        maxHeight: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    tooltipModal: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        width: '85%',
        maxWidth: 400,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10
    },
    modalCloseBtn: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
    },
    modalCloseBtnText: {
        fontSize: 20,
        color: '#6B7280',
        fontWeight: '600'
    },
    modalEmoji: {
        fontSize: 48,
        textAlign: 'center',
        marginBottom: 12
    },
    modalMoodLabel: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        marginBottom: 20
    },
    modalDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    modalLabel: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500'
    },
    modalValue: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '600'
    },
    modalSectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
        marginTop: 16,
        marginBottom: 10
    },
    situationBox: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#3B82F6'
    },
    situationName: {
        fontSize: 14,
        color: '#1F2937',
        fontWeight: '600',
        marginBottom: 6
    },
    emotionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 6
    },
    emotionTag: {
        backgroundColor: '#E0E7FF',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C7D2FE'
    },
    emotionTagText: {
        fontSize: 11,
        color: '#4F46E5',
        fontWeight: '600'
    },
    activitiesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    activityTag: {
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0'
    },
    activityTagText: {
        fontSize: 11,
        color: '#065F46',
        fontWeight: '600'
    }
});
