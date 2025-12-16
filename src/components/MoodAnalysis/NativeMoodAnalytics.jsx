import React, { useState, useMemo } from "react";
import { View, Text, Dimensions, TouchableOpacity, Modal, StyleSheet } from "react-native";
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Mood list (matching web)
const moodsList = [
    { emoji: "😁", label: "Joyful" }, { emoji: "😊", label: "Happy" }, { emoji: "😌", label: "Calm" },
    { emoji: "🙏", label: "Grateful" }, { emoji: "💪", label: "Motivated" }, { emoji: "❤️", label: "Loved" },
    { emoji: "🌟", label: "Inspired" }, { emoji: "😢", label: "Sad" }, { emoji: "😡", label: "Angry" },
    { emoji: "😰", label: "Anxious" }, { emoji: "😩", label: "Tired" }, { emoji: "😖", label: "Overwhelmed" },
    { emoji: "😭", label: "Awful" }, { emoji: "😐", label: "Neutral" }, { emoji: "😕", label: "Confused" },
    { emoji: "🥱", label: "Bored" }, { emoji: "🙂", label: "Okay" }, { emoji: "🥹", label: "Nostalgic" },
    { emoji: "🌈", label: "Hopeful" }, { emoji: "😔", label: "Guilty" }, { emoji: "😳", label: "Ashamed" }
];

const returnEmojiForMood = (moodLabel) => {
    const userMood = moodsList.find(m => m.label.toLowerCase() === moodLabel?.toLowerCase());
    return userMood?.emoji || "😐";
};

// Calculate normalized score from situation data
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

// Get overall mood type
function getOverallMoodType(normalizedScore) {
    if (normalizedScore >= 64) return "positive";
    if (normalizedScore >= 45) return "neutral";
    return "negative";
}

const getMoodColor = (type) => {
    if (type === "positive") return "#22C55E"; // Green
    if (type === "negative") return "#F59E0B"; // Orange
    return "#94A3B8"; // Gray/Neutral
};

// MOOD OVER TIME (Bar Chart)
export const NativeMoodAnalytics = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [tooltipData, setTooltipData] = useState(null);

    const chartData = useMemo(() => {
        return data.slice(0, 7).map(entry => {
            const scores = (entry.situations || []).map(s => calculateNormalizedScore(s));
            const avgScore = scores.length > 0
                ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
                : 50;

            const type = getOverallMoodType(avgScore);

            return {
                day: new Date(entry.createdAt || entry.date).toLocaleDateString('en-US', { weekday: 'short' }),
                mood: returnEmojiForMood(entry.mood || entry.moodLabel),
                value: avgScore,
                type,
                label: entry.mood || entry.moodLabel || "Neutral"
            };
        });
    }, [data]);

    if (chartData.length === 0) {
        return (
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No mood data</Text>
            </View>
        );
    }

    const height = 200;
    const padding = { left: 30, right: 20, top: 20, bottom: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return (
        <View>
            {/* Legend */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#22C55E" }} />
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Positive</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#94A3B8" }} />
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Neutral</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#F59E0B" }} />
                    <Text style={{ fontSize: 11, color: "#64748B" }}>Negative</Text>
                </View>
            </View>

            <Svg width={width} height={height}>
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(val => {
                    const y = padding.top + chartHeight - (val / 100) * chartHeight;
                    return (
                        <G key={val}>
                            <Line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
                                stroke="#E2E8F0" strokeWidth="1" strokeDasharray="4,4" />
                            <SvgText x={padding.left - 6} y={y + 4} fontSize="10" fill="#94A3B8" textAnchor="end">
                                {val}
                            </SvgText>
                        </G>
                    );
                })}

                {/* Vertical bars */}
                {chartData.map((d, i) => {
                    const barWidth = Math.max(20, chartWidth / chartData.length - 10);
                    const x = padding.left + (i * (chartWidth / chartData.length)) + ((chartWidth / chartData.length) - barWidth) / 2;
                    const barHeight = (d.value / 100) * chartHeight;
                    const y = padding.top + chartHeight - barHeight;
                    const color = getMoodColor(d.type);

                    return (
                        <Rect
                            key={i}
                            x={x} y={y}
                            width={barWidth}
                            height={Math.max(barHeight, 2)}
                            fill={color}
                            rx="4"
                        />
                    );
                })}

                {/* X-axis labels */}
                {chartData.map((d, i) => {
                    const x = padding.left + (i * (chartWidth / chartData.length)) + (chartWidth / chartData.length) / 2;
                    return (
                        <SvgText key={i} x={x} y={height - 10} fontSize="11" fill="#64748B" textAnchor="middle">
                            {d.day}
                        </SvgText>
                    );
                })}
            </Svg>

            {/* Mood History - Emojis */}
            <Text style={{ fontSize: 13, fontWeight: '600', color: "#374151", marginTop: 16, marginBottom: 8 }}>Mood History</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {chartData.map((d, i) => (
                    <View key={i} style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>{d.mood}</Text>
                        <Text style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>{d.day}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// WEEKLY MOOD DISTRIBUTION (Donut Chart with different colors)
export const NativeWeeklyMoodDistribution = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
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
            <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>No distribution data</Text>
            </View>
        );
    }

    // Colors matching web
    const donutColors = [
        "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF",
        "#FF9F40", "#B4FF9F", "#FFB3E6", "#8AB6FF", "#FF6F61"
    ];

    const size = 180;
    const strokeWidth = 40;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    let currentAngle = -90;
    const arcs = labels.map((label, i) => {
        const count = moodDistribution[label];
        const percent = count / total;
        const angle = percent * 360;


        const startRad = (currentAngle) * Math.PI / 180;
        const endRad = (currentAngle + angle) * Math.PI / 180;

        const x1 = size / 2 + radius * Math.cos(startRad);
        const y1 = size / 2 + radius * Math.sin(startRad);
        const x2 = size / 2 + radius * Math.cos(endRad);
        const y2 = size / 2 + radius * Math.sin(endRad);

        const largeArc = angle > 180 ? 1 : 0;
        const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

        const arc = {
            label,
            count,
            percent,
            color: donutColors[i % donutColors.length],
            emoji: returnEmojiForMood(label),
            path
        };

        currentAngle += angle;
        return arc;
    });

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#F3F4F6"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {/* Colored arcs */}
                {arcs.map((arc, i) => (
                    <Path
                        key={i}
                        d={arc.path}
                        stroke={arc.color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        strokeLinecap="round"
                    />
                ))}

                {/* Total in center */}
                <SvgText
                    x={size / 2}
                    y={size / 2 + 5}
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="bold"
                    fill="#1F2937"
                >
                    {total}
                </SvgText>
            </Svg>
        </View>
    );
};
