import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Dimensions, TouchableOpacity, Modal, StyleSheet, Animated } from "react-native";
import Svg, { Path, Circle, G, Text as SvgText } from "react-native-svg";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Mood list with colors (matching app theme)
const moodsList = [
    { emoji: "😁", label: "Joyful", color: "#FACC15" },
    { emoji: "😊", label: "Happy", color: "#F59E0B" },
    { emoji: "😌", label: "Calm", color: "#60A5FA" },
    { emoji: "🙏", label: "Grateful", color: "#FBBF24" },
    { emoji: "💪", label: "Motivated", color: "#F97316" },
    { emoji: "❤️", label: "Loved", color: "#EC4899" },
    { emoji: "🌟", label: "Inspired", color: "#FDE047" },
    { emoji: "😢", label: "Sad", color: "#3B82F6" },
    { emoji: "😡", label: "Angry", color: "#DC2626" },
    { emoji: "😰", label: "Anxious", color: "#14B8A6" },
    { emoji: "😩", label: "Tired", color: "#9CA3AF" },
    { emoji: "😖", label: "Overwhelmed", color: "#F87171" },
    { emoji: "😭", label: "Awful", color: "#A855F7" },
    { emoji: "😐", label: "Neutral", color: "#6B7280" },
    { emoji: "😕", label: "Confused", color: "#818CF8" },
    { emoji: "🥱", label: "Bored", color: "#94A3B8" },
    { emoji: "🙂", label: "Okay", color: "#4ADE80" },
    { emoji: "🥹", label: "Nostalgic", color: "#F472B6" },
    { emoji: "🌈", label: "Hopeful", color: "#34D399" },
    { emoji: "😔", label: "Guilty", color: "#F43F5E" },
    { emoji: "😳", label: "Ashamed", color: "#E11D48" }
];

const getMoodInfo = (label) => {
    const mood = moodsList.find(m => m.label.toLowerCase() === label?.toLowerCase());
    return mood || { emoji: "😐", label: "Neutral", color: "#6B7280" };
};

// Animated Emoji Component
const AnimatedEmoji = ({ emoji }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.2,
                    duration: 800,
                    useNativeDriver: true
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    return (
        <Animated.Text style={{ fontSize: 32, transform: [{ scale: scaleAnim }] }}>
            {emoji}
        </Animated.Text>
    );
};

// Simple donut chart with growth animation
const SimpleDonutChart = ({ data, total }) => {
    const size = 120;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const growAnim = useRef(new Animated.Value(0)).current;
    const [displayCount, setDisplayCount] = useState(0);

    useEffect(() => {
        // Animate segment growth
        Animated.timing(growAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false
        }).start();

        // Animate counter separately
        const countInterval = setInterval(() => {
            setDisplayCount(prev => {
                if (prev >= total) {
                    clearInterval(countInterval);
                    return total;
                }
                const increment = Math.ceil(total / 50); // Speed of counting
                return Math.min(prev + increment, total);
            });
        }, 30);

        return () => clearInterval(countInterval);
    }, [total]);

    const animProgress = growAnim;

    return (
        <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#F3F4F6"
                    strokeWidth={strokeWidth}
                    fill="none"
                />

                {data.map((item, index) => {
                    const { count, color } = item;
                    const percent = count / total;
                    const fullAngle = percent * 360;

                    // Calculate current angle for this segment
                    let segmentStartAngle = -90; // Start from top
                    for (let i = 0; i < index; i++) {
                        segmentStartAngle += (data[i].count / total) * 360;
                    }

                    // Animate this segment's angle
                    const animatedAngle = fullAngle * animProgress.__getValue();

                    // Add generous overlap to eliminate all gaps
                    const overlap = 2;
                    const extendedStartAngle = segmentStartAngle - overlap;
                    const extendedEndAngle = segmentStartAngle + animatedAngle + overlap;

                    const startRad = (extendedStartAngle) * Math.PI / 180;
                    const endRad = (extendedEndAngle) * Math.PI / 180;

                    const x1 = size / 2 + radius * Math.cos(startRad);
                    const y1 = size / 2 + radius * Math.sin(startRad);
                    const x2 = size / 2 + radius * Math.cos(endRad);
                    const y2 = size / 2 + radius * Math.sin(endRad);

                    const extendedAngle = animatedAngle + (overlap * 2);
                    const largeArc = extendedAngle > 180 ? 1 : 0;

                    if (animatedAngle < 0.1) return null;

                    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;

                    return (
                        <Path
                            key={index}
                            d={path}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="butt"
                        />
                    );
                })}

                {/* Animated counter */}
                <SvgText
                    x={size / 2}
                    y={size / 2 + 5}
                    textAnchor="middle"
                    fontSize="24"
                    fontWeight="bold"
                    fill="#1F2937"
                >
                    {displayCount}
                </SvgText>
            </Svg>
        </View>
    );
};

// Main component
export const NativeMoodCount = ({ data = [], width = SCREEN_WIDTH - 48 }) => {
    const [selectedMood, setSelectedMood] = useState(null);
    const [showAllMoods, setShowAllMoods] = useState(false);

    const moodDistribution = useMemo(() => {
        const map = {};
        data.forEach(entry => {
            const mood = entry.mood || entry.moodLabel || "Neutral";
            map[mood] = (map[mood] || 0) + 1;
        });
        return map;
    }, [data]);

    const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0);

    const allMoods = Object.keys(moodDistribution)
        .map(mood => ({
            label: mood,
            count: moodDistribution[mood],
            ...getMoodInfo(mood)
        }))
        .sort((a, b) => b.count - a.count);

    const top3Moods = allMoods.slice(0, 3);
    const remainingMoods = allMoods.slice(3);
    const visibleRemainingMoods = showAllMoods ? remainingMoods : remainingMoods.slice(0, 4);

    if (total === 0) {
        return (
            <View style={styles.card}>
                <Text style={styles.title}>Mood Distribution</Text>
                <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyText}>No mood data</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Mood Distribution</Text>

            {/* Top Section: Donut + Top 3 Moods */}
            <View style={styles.topSection}>
                {/* Left: Donut Chart */}
                <View style={styles.donutContainer}>
                    <SimpleDonutChart data={allMoods} total={total} />
                </View>

                {/* Right: Top 3 Moods */}
                <View style={styles.top3Container}>
                    {top3Moods.map((mood, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.top3Card,
                                {
                                    backgroundColor: `${mood.color}15`,
                                    borderColor: mood.color
                                }
                            ]}
                            onPress={() => setSelectedMood(mood.label)}
                        >
                            <Text style={{ fontSize: 24 }}>{mood.emoji}</Text>
                            <View style={styles.top3TextContainer}>
                                <Text style={styles.top3Label}>{mood.label}</Text>
                                <Text style={[styles.top3Count, { color: mood.color }]}>{mood.count}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Bottom Section: Remaining Moods (One Row Initially) */}
            {remainingMoods.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <View style={styles.remainingSection}>
                        {visibleRemainingMoods.map((mood, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.remainingCard,
                                    {
                                        backgroundColor: `${mood.color}15`,
                                        borderColor: mood.color,
                                        opacity: showAllMoods ? 1 : (index < 4 ? 1 : 0.5)
                                    }
                                ]}
                                onPress={() => setSelectedMood(mood.label)}
                            >
                                <Text style={styles.remainingEmoji}>{mood.emoji}</Text>
                                <Text style={styles.remainingLabel} numberOfLines={1}>{mood.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* See More/Less Button */}
                    {remainingMoods.length > 4 && (
                        <TouchableOpacity
                            onPress={() => setShowAllMoods(!showAllMoods)}
                            style={{
                                marginTop: 12,
                                paddingVertical: 8,
                                paddingHorizontal: 16,
                                backgroundColor: "#F3F4F6",
                                borderRadius: 8,
                                alignSelf: "center"
                            }}
                        >
                            <Text style={{ fontSize: 12, color: "#6366F1", fontWeight: "600" }}>
                                {showAllMoods ? "See Less ▲" : `See More (${remainingMoods.length - 4}) ▼`}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Detail Modal */}
            <Modal
                visible={!!selectedMood}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedMood(null)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSelectedMood(null)}
                >
                    <View style={styles.modalContent}>
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setSelectedMood(null)}
                        >
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>

                        {selectedMood && (() => {
                            const moodInfo = getMoodInfo(selectedMood);
                            const count = moodDistribution[selectedMood];
                            const percent = ((count / total) * 100).toFixed(1);

                            return (
                                <>
                                    <Text style={styles.modalEmoji}>{moodInfo.emoji}</Text>
                                    <Text style={styles.modalTitle}>{selectedMood}</Text>

                                    <View style={styles.modalStats}>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{count}</Text>
                                            <Text style={styles.statLabel}>Times</Text>
                                        </View>
                                        <View style={styles.statBox}>
                                            <Text style={styles.statValue}>{percent}%</Text>
                                            <Text style={styles.statLabel}>Of Total</Text>
                                        </View>
                                    </View>
                                </>
                            );
                        })()}
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
        shadowRadius: 6
    },
    title: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 16
    },
    topSection: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16
    },
    donutContainer: {
        flex: 0.4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    top3Container: {
        flex: 0.6,
        gap: 10
    },
    top3Card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1.5,
        gap: 12
    },
    top3TextContainer: {
        flex: 1
    },
    top3Label: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1F2937"
    },
    top3Count: {
        fontSize: 18,
        fontWeight: "700",
        color: "#374151"
    },
    remainingSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8
    },
    remainingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 6,
        minWidth: '30%',
        maxWidth: '31%'
    },
    remainingEmoji: {
        fontSize: 20
    },
    remainingLabel: {
        fontSize: 11,
        fontWeight: "600",
        color: "#374151",
        flex: 1
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
        padding: 24,
        width: "80%",
        maxWidth: 320,
        alignItems: "center",
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
    modalEmoji: {
        fontSize: 56,
        marginBottom: 12
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 20
    },
    modalStats: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    statBox: {
        flex: 1,
        backgroundColor: "#F9FAFB",
        padding: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#1F2937",
        marginBottom: 4
    },
    statLabel: {
        fontSize: 11,
        color: "#6B7280",
        textTransform: 'uppercase'
    }
});
