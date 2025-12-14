import { useState, useEffect, useCallback, useRef } from "react";
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    RefreshControl,
    ActivityIndicator,
    Alert,
    Dimensions,
    Animated,
    Share,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from "react-native-svg";
import {
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    ChevronRight,
    Clock,
    Brain,
    Sparkles,
    Target,
    Heart,
    Zap,
    Moon,
    Users,
    BookOpen,
    Coffee,
    Briefcase,
    Home,
    Music,
    Dumbbell,
    MessageCircle,
    AlertCircle,
    CheckCircle,
    Info,
    FileText,
    Share2,
    Flame,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../utils/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Emotions mapped to backend enum values (happy, sad, neutral, anxious, angry)
// We display more emotions but map them to backend values when saving
const EMOTIONS = [
    { id: "very_happy", label: "Joyful", backendLabel: "happy", baseScore: 5, displayScore: 90, color: "#22C55E", icon: "😊" },
    { id: "happy", label: "Happy", backendLabel: "happy", baseScore: 4, displayScore: 75, color: "#84CC16", icon: "😄" },
    { id: "calm", label: "Calm", backendLabel: "neutral", baseScore: 4, displayScore: 70, color: "#14B8A6", icon: "😌" },
    { id: "neutral", label: "Neutral", backendLabel: "neutral", baseScore: 3, displayScore: 50, color: "#6B7280", icon: "😐" },
    { id: "sad", label: "Sad", backendLabel: "sad", baseScore: 2, displayScore: 35, color: "#3B82F6", icon: "😢" },
    { id: "angry", label: "Angry", backendLabel: "angry", baseScore: 2, displayScore: 30, color: "#EF4444", icon: "😤" },
    { id: "anxious", label: "Anxious", backendLabel: "anxious", baseScore: 2, displayScore: 25, color: "#F97316", icon: "😰" },
    { id: "very_sad", label: "Awful", backendLabel: "sad", baseScore: 1, displayScore: 15, color: "#DC2626", icon: "😫" },
];

// Situations/Context - mapped to backend-valid activity values
// Backend accepts: exercise, work, social, sleep, eating, hobby, family, travel, study, other
const SITUATIONS = [
    { id: "work", label: "Work Stress", type: "negative", impact: -10, icon: Briefcase, backendActivity: "work" },
    { id: "sleep", label: "Poor Sleep", type: "negative", impact: -8, icon: Moon, backendActivity: "sleep" },
    { id: "exercise", label: "Exercise", type: "positive", impact: 12, icon: Dumbbell, backendActivity: "exercise" },
    { id: "family", label: "Family Time", type: "positive", impact: 10, icon: Heart, backendActivity: "family" },
    { id: "social", label: "Social Activity", type: "positive", impact: 8, icon: MessageCircle, backendActivity: "social" },
    { id: "hobby", label: "Hobby/Relaxation", type: "positive", impact: 8, icon: Coffee, backendActivity: "hobby" },
    { id: "study", label: "Learning", type: "neutral", impact: 5, icon: BookOpen, backendActivity: "study" },
    { id: "eating", label: "Good Eating", type: "positive", impact: 6, icon: Home, backendActivity: "eating" },
    { id: "travel", label: "Travel/Outdoors", type: "positive", impact: 7, icon: Target, backendActivity: "travel" },
    { id: "other", label: "Other", type: "neutral", impact: 0, icon: Info, backendActivity: "other" },
];

// Intensity levels
const INTENSITY_LEVELS = [
    { value: 1, label: "Very Low" },
    { value: 2, label: "Low" },
    { value: 3, label: "Moderate" },
    { value: 4, label: "High" },
    { value: 5, label: "Very High" },
];

// Helper to get mood category from score
const getMoodCategory = (score) => {
    if (score >= 70) return { label: "Positive", color: "#22C55E" };
    if (score >= 50) return { label: "Neutral", color: "#EAB308" };
    return { label: "Needs Attention", color: "#EF4444" };
};

// Helper to get mood label from score
const getMoodLabel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    if (score >= 55) return "Okay";
    if (score >= 40) return "Low";
    return "Difficult";
};

// Circular Progress Component
const CircularProgress = ({ percentage, size = 120, strokeWidth = 10, color = "#4A9B7F", label, value }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <View style={{ alignItems: "center" }}>
            <Svg width={size} height={size}>
                <Defs>
                    <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
                        <Stop offset="100%" stopColor={color} stopOpacity="1" />
                    </SvgGradient>
                </Defs>
                {/* Background circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#E5E7EB"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#progressGradient)"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontSize: size * 0.25, fontWeight: "700", color: "#1F2937" }}>{value}</Text>
                {label && <Text style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{label}</Text>}
            </View>
        </View>
    );
};

// Semi-Circle Gauge Component (like speedometer)
const SemiCircleGauge = ({ value, maxValue = 100, size = 160, label, color = "#4A9B7F" }) => {
    const percentage = Math.min(value / maxValue, 1);
    const radius = (size - 20) / 2;
    const circumference = Math.PI * radius; // Half circle
    const strokeDashoffset = circumference - (percentage * circumference);

    return (
        <View style={{ alignItems: "center", marginBottom: 10 }}>
            <Svg width={size} height={size / 2 + 20}>
                {/* Background arc */}
                <Path
                    d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
                    stroke="#E5E7EB"
                    strokeWidth={12}
                    fill="transparent"
                    strokeLinecap="round"
                />
                {/* Progress arc */}
                <Path
                    d={`M ${10} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2}`}
                    stroke={color}
                    strokeWidth={12}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                />
            </Svg>
            <View style={{ position: "absolute", bottom: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#1F2937" }}>{value}</Text>
                <Text style={{ fontSize: 12, color: "#6B7280" }}>{label}</Text>
            </View>
        </View>
    );
};

// Weekly Line Chart with dots
const WeeklyLineChart = ({ data = [], height = 120, color = "#4A9B7F" }) => {
    const width = SCREEN_WIDTH - 64;
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - 40;

    if (!data || data.length === 0) {
        return (
            <View style={{ height, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#9CA3AF", fontSize: 12 }}>No data available</Text>
            </View>
        );
    }

    const maxValue = Math.max(...data.map(d => d.value), 5);
    const minValue = Math.min(...data.map(d => d.value), 1);
    const range = maxValue - minValue || 1;

    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
        const y = chartHeight - ((d.value - minValue) / range) * (chartHeight - 20) + 10;
        return { x, y, ...d };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    return (
        <View style={{ height }}>
            <Svg width={width} height={height}>
                {/* Grid lines */}
                {[0, 0.5, 1].map((ratio, i) => (
                    <Path
                        key={i}
                        d={`M ${padding} ${10 + ratio * (chartHeight - 20)} L ${width - padding} ${10 + ratio * (chartHeight - 20)}`}
                        stroke="#F3F4F6"
                        strokeWidth={1}
                    />
                ))}
                {/* Line */}
                <Path
                    d={pathData}
                    stroke={color}
                    strokeWidth={2.5}
                    fill="transparent"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Dots */}
                {points.map((p, i) => (
                    <Circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={5}
                        fill="#FFFFFF"
                        stroke={color}
                        strokeWidth={2.5}
                    />
                ))}
            </Svg>
            {/* Labels */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: padding - 10, marginTop: -5 }}>
                {points.map((p, i) => (
                    <Text key={i} style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", width: 30 }}>{p.label}</Text>
                ))}
            </View>
        </View>
    );
};

// Mood Score Gauge Component
const MoodScoreGauge = ({ score, size = 180 }) => {
    const category = getMoodCategory(score);
    const moodLabel = getMoodLabel(score);

    return (
        <View style={styles.gaugeContainer}>
            <CircularProgress
                percentage={score}
                size={size}
                strokeWidth={14}
                color={category.color}
                value={score}
                label="/100"
            />
            <View style={styles.gaugeLabels}>
                <Text style={[styles.moodLabelText, { color: category.color }]}>{moodLabel}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: category.color + "20" }]}>
                    <Text style={[styles.categoryText, { color: category.color }]}>{category.label}</Text>
                </View>
            </View>
        </View>
    );
};

// Small Metric Card
const MetricCard = ({ icon: Icon, label, value, color = "#4A9B7F", subValue }) => (
    <View style={[styles.metricCard, { borderLeftColor: color }]}>
        <View style={[styles.metricIconContainer, { backgroundColor: color + "15" }]}>
            <Icon size={18} color={color} />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
        {subValue && <Text style={styles.metricSubValue}>{subValue}</Text>}
    </View>
);

// Insight Card Component
const InsightCard = ({ insight, priority }) => {
    const priorityColors = {
        high: "#EF4444",
        medium: "#F59E0B",
        low: "#22C55E",
    };
    const color = priorityColors[priority] || "#6B7280";

    return (
        <View style={[styles.insightCard, { borderLeftColor: color }]}>
            <View style={styles.insightHeader}>
                <Brain size={16} color={color} />
                <Text style={[styles.insightPriority, { color }]}>
                    {priority?.charAt(0).toUpperCase() + priority?.slice(1)} Priority
                </Text>
            </View>
            <Text style={styles.insightText}>{insight}</Text>
        </View>
    );
};

export default function JournalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scrollViewRef = useRef(null);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Form state
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    const [intensity, setIntensity] = useState(3);
    const [selectedSituations, setSelectedSituations] = useState([]);
    const [thoughts, setThoughts] = useState("");
    const [calculatedScore, setCalculatedScore] = useState(50);

    // Data state
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [dashboard, setDashboard] = useState(null);
    const [moodEntries, setMoodEntries] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activeTab, setActiveTab] = useState("log"); // "log" or "insights"

    // Update time every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Calculate mood score based on emotion, intensity, and situations (for display only, 0-100)
    useEffect(() => {
        if (selectedEmotion) {
            const emotion = EMOTIONS.find(e => e.id === selectedEmotion);
            let score = emotion?.displayScore || 50; // Use displayScore for 0-100 visual

            // Adjust based on intensity (normalized around 3)
            const intensityModifier = (intensity - 3) * 5;
            score += intensityModifier;

            // Adjust based on situations
            selectedSituations.forEach(sitId => {
                const situation = SITUATIONS.find(s => s.id === sitId);
                if (situation) {
                    score += situation.impact;
                }
            });

            // Clamp score between 0 and 100
            score = Math.max(0, Math.min(100, Math.round(score)));
            setCalculatedScore(score);
        }
    }, [selectedEmotion, intensity, selectedSituations]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                // Get mood entries
                const entriesResponse = await api.getMoodEntries(userId, 1, 30);
                if (entriesResponse?.moodEntries) {
                    setMoodEntries(entriesResponse.moodEntries);
                }

                // Get dashboard data with analytics and insights
                try {
                    const dashboardResponse = await api.getMoodDashboard(userId, 30);
                    if (dashboardResponse?.dashboard) {
                        setDashboard(dashboardResponse.dashboard);
                    }
                } catch (e) {
                    console.log("Dashboard fetch error:", e);
                }
            }
        } catch (error) {
            console.log("Error loading data:", error);
        } finally {
            setRefreshing(false);
        }
    };

    const toggleSituation = (situationId) => {
        setSelectedSituations(prev =>
            prev.includes(situationId)
                ? prev.filter(id => id !== situationId)
                : [...prev, situationId]
        );
    };

    const handleSaveMood = async () => {
        if (!selectedEmotion) {
            Alert.alert("Select Emotion", "Please select how you're feeling today.");
            return;
        }

        // Animate button press
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        setLoading(true);
        try {
            const userId = await AsyncStorage.getItem("userId");
            if (userId) {
                const emotion = EMOTIONS.find(e => e.id === selectedEmotion);

                // Map activities to backend-valid values
                const validActivities = selectedSituations.map(sitId => {
                    const situation = SITUATIONS.find(s => s.id === sitId);
                    return situation?.backendActivity || sitId;
                });

                // Backend expects moodScore 1-5 and specific moodLabel values
                const moodData = {
                    moodScore: emotion?.baseScore || 3, // 1-5 scale
                    moodLabel: emotion?.backendLabel || "neutral", // valid enum: happy, sad, neutral, anxious, angry
                    score: emotion?.baseScore || 3,
                    label: emotion?.backendLabel || "neutral",
                    textFeedback: thoughts,
                    activities: validActivities, // valid enum: exercise, work, social, sleep, eating, hobby, family, travel, study, other
                    stressLevel: selectedSituations.includes("work") ? 4 : 2,
                    energyLevel: intensity,
                    sleepHours: selectedSituations.includes("sleep") ? 5 : 7,
                    socialInteraction: selectedSituations.some(s => ["social", "family"].includes(s)) ? 4 : 2,
                };

                await api.addMoodEntry(userId, moodData);
                Alert.alert(
                    "Mood Logged! 🎉",
                    `Feeling: ${emotion?.label || "Neutral"}\nScore: ${calculatedScore}/100\n\nKeep tracking to see your patterns!`,
                    [{ text: "OK" }]
                );

                // Reset form
                setSelectedEmotion(null);
                setIntensity(3);
                setSelectedSituations([]);
                setThoughts("");
                setCalculatedScore(50);
                loadData();
            }
        } catch (error) {
            Alert.alert("Error", error.message || "Failed to save mood.");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, []);

    // Format time
    const formatTime = () => {
        return currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = () => {
        return currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Calculate logging streak
    const calculateStreak = () => {
        if (moodEntries.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Sort entries by date (newest first)
        const sortedEntries = [...moodEntries].sort((a, b) =>
            new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
        );

        // Check if user logged today or yesterday
        const lastEntry = new Date(sortedEntries[0]?.timestamp || sortedEntries[0]?.createdAt);
        lastEntry.setHours(0, 0, 0, 0);

        const daysDiff = Math.floor((today - lastEntry) / (1000 * 60 * 60 * 24));
        if (daysDiff > 1) return 0; // Streak broken

        // Count consecutive days
        let checkDate = new Date(today);
        if (daysDiff === 1) checkDate.setDate(checkDate.getDate() - 1);

        for (const entry of sortedEntries) {
            const entryDate = new Date(entry.timestamp || entry.createdAt);
            entryDate.setHours(0, 0, 0, 0);

            if (entryDate.getTime() === checkDate.getTime()) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (entryDate < checkDate) {
                break;
            }
        }

        return streak;
    };

    // Generate and share mood report
    const shareReport = async () => {
        if (moodEntries.length === 0) {
            Alert.alert("No Data", "Log some moods first to generate a report!");
            return;
        }

        const streak = calculateStreak();
        const avgScore = weeklyData.length > 0
            ? Math.round(weeklyData.reduce((sum, d) => sum + d.score, 0) / weeklyData.length)
            : 0;

        // Build report text
        const reportDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        let report = `📊 MOOD REPORT\n`;
        report += `Generated: ${reportDate}\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        report += `📈 SUMMARY (Last 30 Days)\n`;
        report += `• Total Entries: ${moodEntries.length}\n`;
        report += `• Average Mood Score: ${avgScore}/100\n`;
        report += `• Current Streak: ${streak} days 🔥\n`;
        report += `• Trend: ${analytics?.trend || 'Stable'}\n\n`;

        report += `📅 RECENT ENTRIES\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━\n`;

        moodEntries.slice(0, 7).forEach((entry, i) => {
            const date = new Date(entry.timestamp || entry.createdAt);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const score = entry.moodScore || Math.round((entry.score || 3) * 20);
            const mood = entry.moodLabel || entry.label || 'neutral';
            const emoji = mood === 'happy' ? '😊' : mood === 'sad' ? '😢' : mood === 'anxious' ? '😰' : mood === 'angry' ? '😤' : '😐';
            report += `${dateStr}: ${emoji} ${mood} (${score}/100)\n`;
            if (entry.textFeedback) {
                report += `   Notes: "${entry.textFeedback.substring(0, 50)}${entry.textFeedback.length > 50 ? '...' : ''}"\n`;
            }
        });

        report += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `Generated by Raskamon App\n`;
        report += `Share with your therapist for better insights! 💚`;

        try {
            await Share.share({
                message: report,
                title: 'Mood Report',
            });
        } catch (error) {
            Alert.alert("Error", "Could not share report");
        }
    };

    // Get analytics from dashboard
    const analytics = dashboard?.analytics || {};
    const insights = dashboard?.insights || [];
    const recommendations = dashboard?.recommendations || [];
    const basicStats = analytics?.basicStats || {};
    const trend = analytics?.trend || "stable";
    const moodDistribution = analytics?.moodDistribution || {};

    // Calculate weekly data from entries
    const getWeeklyData = () => {
        const last7Days = moodEntries.slice(0, 7);
        return last7Days.map(entry => ({
            score: entry.moodScore || Math.round((entry.score || 3) * 20),
            date: new Date(entry.timestamp || entry.createdAt),
            label: entry.moodLabel || entry.label,
        }));
    };

    const weeklyData = getWeeklyData();
    const avgScore = weeklyData.length > 0
        ? Math.round(weeklyData.reduce((sum, d) => sum + d.score, 0) / weeklyData.length)
        : 50;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Mood Journal</Text>
                    <Text style={styles.headerSubtitle}>{formatDate()}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.timeContainer}>
                        <Clock size={14} color="#6B7280" />
                        <Text style={styles.timeText}>{formatTime()}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.calendarButton}
                        onPress={() => router.push("/(tabs)/mood/calendar")}
                    >
                        <Calendar size={20} color="#4A9B7F" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "log" && styles.tabActive]}
                    onPress={() => setActiveTab("log")}
                >
                    <BookOpen size={18} color={activeTab === "log" ? "#4A9B7F" : "#6B7280"} />
                    <Text style={[styles.tabText, activeTab === "log" && styles.tabTextActive]}>Log Mood</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === "insights" && styles.tabActive]}
                    onPress={() => setActiveTab("insights")}
                >
                    <Brain size={18} color={activeTab === "insights" ? "#4A9B7F" : "#6B7280"} />
                    <Text style={[styles.tabText, activeTab === "insights" && styles.tabTextActive]}>Insights</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A9B7F" />}
            >
                {activeTab === "log" ? (
                    <>
                        {/* Mood Score Display */}
                        <View style={styles.scoreSection}>
                            <Text style={styles.sectionTitle}>Your Mood Score</Text>
                            <MoodScoreGauge score={calculatedScore} />
                            <Text style={styles.scoreExplanation}>
                                Score based on emotion, intensity & context
                            </Text>
                        </View>

                        {/* Emotion Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>How are you feeling?</Text>
                            <Text style={styles.sectionSubtitle}>Select the emotion that best describes your mood</Text>
                            <View style={styles.emotionGrid}>
                                {EMOTIONS.map((emotion) => (
                                    <TouchableOpacity
                                        key={emotion.id}
                                        style={[
                                            styles.emotionButton,
                                            selectedEmotion === emotion.id && {
                                                backgroundColor: emotion.color + "20",
                                                borderColor: emotion.color,
                                            }
                                        ]}
                                        onPress={() => setSelectedEmotion(emotion.id)}
                                    >
                                        <Text style={styles.emotionIcon}>{emotion.icon}</Text>
                                        <Text style={[
                                            styles.emotionLabel,
                                            selectedEmotion === emotion.id && { color: emotion.color, fontWeight: "600" }
                                        ]}>{emotion.label}</Text>
                                        <Text style={styles.emotionScore}>Base: {emotion.baseScore}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Intensity Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>How intense is this feeling?</Text>
                            <Text style={styles.sectionSubtitle}>Rate from 1 (very low) to 5 (very high)</Text>
                            <View style={styles.intensityContainer}>
                                {INTENSITY_LEVELS.map((level) => (
                                    <TouchableOpacity
                                        key={level.value}
                                        style={[
                                            styles.intensityButton,
                                            intensity === level.value && styles.intensityButtonActive
                                        ]}
                                        onPress={() => setIntensity(level.value)}
                                    >
                                        <Text style={[
                                            styles.intensityValue,
                                            intensity === level.value && styles.intensityValueActive
                                        ]}>{level.value}</Text>
                                        <Text style={[
                                            styles.intensityLabel,
                                            intensity === level.value && styles.intensityLabelActive
                                        ]}>{level.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Situation/Context Selection */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>What's happening today?</Text>
                            <Text style={styles.sectionSubtitle}>Context helps us understand your mood better</Text>
                            <View style={styles.situationsGrid}>
                                {SITUATIONS.map((situation) => {
                                    const Icon = situation.icon;
                                    const isSelected = selectedSituations.includes(situation.id);
                                    const typeColor = situation.type === "positive" ? "#22C55E" :
                                        situation.type === "negative" ? "#EF4444" : "#6B7280";

                                    return (
                                        <TouchableOpacity
                                            key={situation.id}
                                            style={[
                                                styles.situationButton,
                                                isSelected && {
                                                    backgroundColor: typeColor + "15",
                                                    borderColor: typeColor,
                                                }
                                            ]}
                                            onPress={() => toggleSituation(situation.id)}
                                        >
                                            <Icon size={18} color={isSelected ? typeColor : "#6B7280"} />
                                            <Text style={[
                                                styles.situationLabel,
                                                isSelected && { color: typeColor, fontWeight: "600" }
                                            ]}>{situation.label}</Text>
                                            <Text style={[styles.situationImpact, { color: typeColor }]}>
                                                {situation.impact > 0 ? `+${situation.impact}` : situation.impact}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        {/* Thoughts/Notes */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Additional Notes</Text>
                            <Text style={styles.sectionSubtitle}>Optional: Add any thoughts or context</Text>
                            <View style={styles.thoughtsInputContainer}>
                                <TextInput
                                    style={styles.thoughtsInput}
                                    placeholder="What's on your mind today?"
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                    value={thoughts}
                                    onChangeText={setThoughts}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        {/* Save Button */}
                        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                            <TouchableOpacity
                                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                                onPress={handleSaveMood}
                                disabled={loading}
                            >
                                <LinearGradient colors={["#4A9B7F", "#3B8068"]} style={styles.saveButtonGradient}>
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <CheckCircle size={20} color="#FFFFFF" />
                                            <Text style={styles.saveButtonText}>Log Mood Entry</Text>
                                            <Text style={styles.saveButtonScore}>Score: {calculatedScore}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </>
                ) : (
                    <>
                        {/* Insights Tab */}

                        {/* Streak & Share Row */}
                        <View style={styles.streakShareRow}>
                            <View style={styles.streakCard}>
                                <Flame size={22} color="#F59E0B" />
                                <View>
                                    <Text style={styles.streakNumber}>{calculateStreak()}</Text>
                                    <Text style={styles.streakLabel}>Day Streak</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.shareButton} onPress={shareReport}>
                                <Share2 size={18} color="#4A9B7F" />
                                <Text style={styles.shareButtonText}>Share Report</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Overall Score Card */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewTitle}>Your Mood Overview</Text>
                            <View style={styles.overviewContent}>
                                <MoodScoreGauge score={avgScore} size={140} />
                                <View style={styles.overviewStats}>
                                    <View style={styles.overviewStat}>
                                        <Text style={styles.overviewStatValue}>{moodEntries.length}</Text>
                                        <Text style={styles.overviewStatLabel}>Total Entries</Text>
                                    </View>
                                    <View style={styles.overviewStat}>
                                        <View style={styles.trendIndicator}>
                                            {trend === "improving" ? <TrendingUp size={20} color="#22C55E" /> :
                                                trend === "declining" ? <TrendingDown size={20} color="#EF4444" /> :
                                                    <Minus size={20} color="#6B7280" />}
                                        </View>
                                        <Text style={styles.overviewStatLabel}>
                                            {trend === "improving" ? "Improving" :
                                                trend === "declining" ? "Declining" : "Stable"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Quick Metrics */}
                        <View style={styles.metricsRow}>
                            <MetricCard
                                icon={Heart}
                                label="Avg Mood"
                                value={avgScore}
                                color="#EC4899"
                                subValue="/100"
                            />
                            <MetricCard
                                icon={Zap}
                                label="Energy"
                                value={basicStats.averageEnergy?.toFixed(1) || "3.0"}
                                color="#F59E0B"
                                subValue="/5"
                            />
                            <MetricCard
                                icon={Moon}
                                label="Sleep"
                                value={basicStats.averageSleep?.toFixed(1) || "7.0"}
                                color="#8B5CF6"
                                subValue="hrs"
                            />
                        </View>

                        {/* Weekly Chart */}
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartTitle}>Weekly Mood Trend</Text>
                                <Text style={styles.chartSubtitle}>Last 7 days</Text>
                            </View>
                            <View style={styles.weeklyChart}>
                                {weeklyData.length > 0 ? (
                                    weeklyData.reverse().map((data, index) => {
                                        const barHeight = (data.score / 100) * 80;
                                        const category = getMoodCategory(data.score);
                                        return (
                                            <View key={index} style={styles.weeklyBarContainer}>
                                                <Text style={styles.weeklyScore}>{data.score}</Text>
                                                <View style={[styles.weeklyBar, { height: barHeight, backgroundColor: category.color }]} />
                                                <Text style={styles.weeklyDay}>
                                                    {data.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                                                </Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Info size={24} color="#9CA3AF" />
                                        <Text style={styles.noDataText}>Start logging to see trends</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Weekly Line Chart */}
                        <View style={styles.chartCard}>
                            <View style={styles.chartHeader}>
                                <Text style={styles.chartTitle}>Mood Trend Line</Text>
                                <Text style={styles.chartSubtitle}>With data points</Text>
                            </View>
                            <WeeklyLineChart
                                data={weeklyData.length > 0
                                    ? weeklyData.map(d => ({
                                        value: d.score / 20, // Scale to 1-5
                                        label: d.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)
                                    }))
                                    : []
                                }
                                height={140}
                                color="#4A9B7F"
                            />
                        </View>

                        {/* Semi-Circle Gauges Row */}
                        <View style={styles.gaugesRow}>
                            <View style={styles.gaugeCard}>
                                <SemiCircleGauge
                                    value={avgScore}
                                    maxValue={100}
                                    size={130}
                                    label="Mood Score"
                                    color="#4A9B7F"
                                />
                            </View>
                            <View style={styles.gaugeCard}>
                                <SemiCircleGauge
                                    value={Math.round((basicStats.averageEnergy || 3) * 20)}
                                    maxValue={100}
                                    size={130}
                                    label="Energy Level"
                                    color="#F59E0B"
                                />
                            </View>
                        </View>

                        {/* Mood Distribution */}
                        <View style={styles.chartCard}>
                            <Text style={styles.chartTitle}>Mood Distribution</Text>
                            <View style={styles.distributionContainer}>
                                {Object.entries(moodDistribution).length > 0 ? (
                                    Object.entries(moodDistribution).map(([mood, count]) => {
                                        const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                        const emotion = EMOTIONS.find(e => e.id === mood) || { label: mood, color: "#6B7280", icon: "😐" };
                                        return (
                                            <View key={mood} style={styles.distributionItem}>
                                                <View style={styles.distributionInfo}>
                                                    <Text style={styles.distributionEmoji}>{emotion.icon}</Text>
                                                    <Text style={styles.distributionLabel}>{emotion.label}</Text>
                                                </View>
                                                <View style={styles.distributionBarContainer}>
                                                    <View style={[styles.distributionBar, { width: `${percentage}%`, backgroundColor: emotion.color }]} />
                                                </View>
                                                <Text style={styles.distributionPercentage}>{percentage}%</Text>
                                            </View>
                                        );
                                    })
                                ) : (
                                    <View style={styles.noDataContainer}>
                                        <Text style={styles.noDataText}>No mood data yet</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* AI Insights */}
                        <View style={styles.insightsSection}>
                            <View style={styles.insightsSectionHeader}>
                                <Sparkles size={20} color="#F59E0B" />
                                <Text style={styles.insightsSectionTitle}>AI Insights</Text>
                            </View>
                            {insights.length > 0 ? (
                                insights.slice(0, 3).map((insight, index) => (
                                    <InsightCard
                                        key={index}
                                        insight={insight.description || insight.title || insight}
                                        priority={insight.priority || "medium"}
                                    />
                                ))
                            ) : (
                                <View style={styles.emptyInsights}>
                                    <Brain size={32} color="#D1D5DB" />
                                    <Text style={styles.emptyInsightsTitle}>Keep Logging!</Text>
                                    <Text style={styles.emptyInsightsText}>
                                        Log more moods to receive personalized AI insights about your emotional patterns.
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Recommendations */}
                        {recommendations.length > 0 && (
                            <View style={styles.recommendationsSection}>
                                <Text style={styles.recommendationsTitle}>Recommendations</Text>
                                {recommendations.slice(0, 2).map((rec, index) => (
                                    <View key={index} style={styles.recommendationCard}>
                                        <Target size={18} color="#4A9B7F" />
                                        <View style={styles.recommendationContent}>
                                            <Text style={styles.recommendationText}>
                                                {rec.description || rec.title || rec}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* View Calendar Button */}
                        <TouchableOpacity
                            style={styles.viewCalendarButton}
                            onPress={() => router.push("/(tabs)/mood/calendar")}
                        >
                            <Text style={styles.viewCalendarText}>View Full Calendar</Text>
                            <ChevronRight size={18} color="#4A9B7F" />
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F9FAFB" },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    headerTitle: { fontSize: 24, fontWeight: "700", color: "#1F2937" },
    headerSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    timeContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
    timeText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },
    calendarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#E6F4F0",
        justifyContent: "center",
        alignItems: "center",
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
        gap: 12,
    },
    tab: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#F3F4F6",
        gap: 6,
    },
    tabActive: {
        backgroundColor: "#E6F4F0",
    },
    tabText: { fontSize: 14, fontWeight: "500", color: "#6B7280" },
    tabTextActive: { color: "#4A9B7F", fontWeight: "600" },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

    // Score Section
    scoreSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    gaugeContainer: { alignItems: "center" },
    gaugeLabels: { marginTop: 16, alignItems: "center" },
    moodLabelText: { fontSize: 22, fontWeight: "700" },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 8,
    },
    categoryText: { fontSize: 12, fontWeight: "600" },
    scoreExplanation: { fontSize: 12, color: "#9CA3AF", marginTop: 12 },

    // Streak & Share Row
    streakShareRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        gap: 12,
    },
    streakCard: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFBEB",
        borderRadius: 14,
        padding: 14,
        gap: 10,
        borderWidth: 1,
        borderColor: "#FEF3C7",
    },
    streakNumber: {
        fontSize: 22,
        fontWeight: "800",
        color: "#D97706",
    },
    streakLabel: {
        fontSize: 11,
        color: "#92400E",
        fontWeight: "500",
    },
    shareButton: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
        borderWidth: 1.5,
        borderColor: "#4A9B7F",
    },
    shareButtonText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#4A9B7F",
    },
    // Gauges Row
    gaugesRow: {
        flexDirection: "row",
        gap: 12,
        marginBottom: 16,
    },
    gaugeCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },

    // Sections
    section: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 4 },
    sectionSubtitle: { fontSize: 12, color: "#9CA3AF", marginBottom: 14 },

    // Emotion Grid
    emotionGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    emotionButton: {
        width: "31%",
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 12,
        backgroundColor: "#F9FAFB",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        alignItems: "center",
        marginBottom: 10,
    },
    emotionIcon: { fontSize: 24, marginBottom: 4 },
    emotionLabel: { fontSize: 12, color: "#4B5563", fontWeight: "500" },
    emotionScore: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },

    // Intensity
    intensityContainer: {
        flexDirection: "row",
        gap: 8,
    },
    intensityButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: "#F9FAFB",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        alignItems: "center",
    },
    intensityButtonActive: {
        backgroundColor: "#E6F4F0",
        borderColor: "#4A9B7F",
    },
    intensityValue: { fontSize: 18, fontWeight: "700", color: "#6B7280" },
    intensityValueActive: { color: "#4A9B7F" },
    intensityLabel: { fontSize: 9, color: "#9CA3AF", marginTop: 2 },
    intensityLabelActive: { color: "#4A9B7F" },

    // Situations Grid
    situationsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    situationButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        borderWidth: 1.5,
        borderColor: "#E5E7EB",
        gap: 6,
    },
    situationLabel: { fontSize: 12, color: "#4B5563" },
    situationImpact: { fontSize: 10, fontWeight: "600" },

    // Thoughts Input
    thoughtsInputContainer: {
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    thoughtsInput: {
        fontSize: 14,
        color: "#1F2937",
        minHeight: 80,
        lineHeight: 20,
    },

    // Save Button
    saveButton: { marginBottom: 16 },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    saveButtonText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
    saveButtonScore: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.8)" },

    // Overview Card
    overviewCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    overviewTitle: { fontSize: 18, fontWeight: "600", color: "#1F2937", marginBottom: 16 },
    overviewContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
    },
    overviewStats: { gap: 20 },
    overviewStat: { alignItems: "center" },
    overviewStatValue: { fontSize: 28, fontWeight: "700", color: "#1F2937" },
    overviewStatLabel: { fontSize: 12, color: "#6B7280", marginTop: 4 },
    trendIndicator: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },

    // Metrics Row
    metricsRow: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        padding: 14,
        alignItems: "center",
        borderLeftWidth: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    metricIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    metricValue: { fontSize: 20, fontWeight: "700", color: "#1F2937" },
    metricLabel: { fontSize: 11, color: "#6B7280", marginTop: 2 },
    metricSubValue: { fontSize: 10, color: "#9CA3AF" },

    // Chart Card
    chartCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    chartHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    chartTitle: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
    chartSubtitle: { fontSize: 12, color: "#9CA3AF" },

    // Weekly Chart
    weeklyChart: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "flex-end",
        height: 120,
        paddingTop: 20,
    },
    weeklyBarContainer: { alignItems: "center" },
    weeklyScore: { fontSize: 10, fontWeight: "600", color: "#6B7280", marginBottom: 4 },
    weeklyBar: { width: 28, borderRadius: 6, minHeight: 8 },
    weeklyDay: { fontSize: 11, color: "#6B7280", marginTop: 6, fontWeight: "500" },
    noDataContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 20 },
    noDataText: { fontSize: 13, color: "#9CA3AF", marginTop: 8 },

    // Distribution
    distributionContainer: { gap: 12 },
    distributionItem: { flexDirection: "row", alignItems: "center", gap: 10 },
    distributionInfo: { flexDirection: "row", alignItems: "center", gap: 6, width: 90 },
    distributionEmoji: { fontSize: 18 },
    distributionLabel: { fontSize: 12, color: "#4B5563" },
    distributionBarContainer: {
        flex: 1,
        height: 8,
        backgroundColor: "#F3F4F6",
        borderRadius: 4,
        overflow: "hidden",
    },
    distributionBar: { height: "100%", borderRadius: 4 },
    distributionPercentage: { fontSize: 12, fontWeight: "600", color: "#1F2937", width: 40, textAlign: "right" },

    // Insights Section
    insightsSection: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    insightsSectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 14,
    },
    insightsSectionTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
    insightCard: {
        backgroundColor: "#F9FAFB",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderLeftWidth: 3,
    },
    insightHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 6,
    },
    insightPriority: { fontSize: 11, fontWeight: "600" },
    insightText: { fontSize: 13, color: "#4B5563", lineHeight: 18 },
    emptyInsights: { alignItems: "center", paddingVertical: 24 },
    emptyInsightsTitle: { fontSize: 16, fontWeight: "600", color: "#4B5563", marginTop: 12 },
    emptyInsightsText: { fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 6, lineHeight: 18 },

    // Recommendations
    recommendationsSection: { marginBottom: 16 },
    recommendationsTitle: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 12 },
    recommendationCard: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        alignItems: "flex-start",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    recommendationContent: { flex: 1 },
    recommendationText: { fontSize: 13, color: "#4B5563", lineHeight: 18 },

    // View Calendar Button
    viewCalendarButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        backgroundColor: "#E6F4F0",
        borderRadius: 12,
        gap: 6,
        marginBottom: 20,
    },
    viewCalendarText: { fontSize: 14, fontWeight: "600", color: "#4A9B7F" },
});
