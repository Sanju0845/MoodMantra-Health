import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, TrendingUp, TrendingDown, Heart, Book, Leaf, Calendar, CheckCircle2, Clock, Award, ClipboardList, Activity } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";
import {
  NativePieChart,
  CircularProgress,
  NativeTestResultsBarChart,
  NativeWeeklyMoodDistribution
} from "../../../components/MoodAnalysis/NativeMoodCharts";
import { NativeMoodCount as MoodCount } from "../../../components/MoodAnalysis/MoodCount";
import { NativeMoodScoreChart as MoodScoreChart } from "../../../components/MoodAnalysis/MoodScoreChart";
import { NativeMoodAnalytics } from "../../../components/MoodAnalysis/NativeMoodAnalytics";

const SCREEN_WIDTH = Dimensions.get("window").width;

// Helper for Stats Cards
const StatsCard = ({ title, value, subtext, icon: Icon, color, change, textStatus }) => (
  <View style={{ width: "48%", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748B", flex: 1 }}>{title}</Text>
      {Icon && <Icon size={18} color={color} />}
    </View>
    <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 4 }}>
      {value} <Text style={{ fontSize: 12, fontWeight: "normal", color: "#000" }}>{textStatus}</Text>
    </Text>

    {change !== undefined && (
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        {change >= 0 ? <TrendingUp size={14} color="#3B82F6" /> : <TrendingDown size={14} color="#EF4444" />}
        <Text style={{ fontSize: 11, color: change >= 0 ? "#3B82F6" : "#EF4444", marginLeft: 4 }}>
          {Math.abs(change)}% from last
        </Text>
      </View>
    )}
    <Text style={{ fontSize: 11, color: "#94A3B8" }}>{subtext}</Text>
  </View>
);

// Helper for Assessment Insights Card
const AssessmentInsightsCard = ({ data }) => {
  // Basic logic to find top category and status if data is array
  const assessments = data || [];
  const total = assessments.length;

  // Find categories
  const categories = [...new Set(assessments.map(a => a.assessmentId?.category || "Uncategorized"))];
  const categoryCount = categories.length;

  // Most Frequent
  const freqMap = {};
  assessments.forEach(a => {
    const cat = a.assessmentId?.category || "Other";
    freqMap[cat] = (freqMap[cat] || 0) + 1;
  });
  const mostFrequent = Object.entries(freqMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const bestStatus = "N/A"; // Placeholder requires logic

  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 }}>
      <Text style={{ fontSize: 16, fontWeight: "600", color: "#1E293B", marginBottom: 12 }}>Assessment Insights</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <View style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#3B82F6" }}>{total}</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Total Assessments</Text>
        </View>
        <View style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#8B5CF6" }}>{categoryCount}</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Categories Found</Text>
        </View>
        <View style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#10B981" }}>{mostFrequent}</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Most Frequent</Text>
        </View>
        {/* <View style={{ width: "48%", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "bold", color: "#F59E0B" }}>{bestStatus}</Text>
          <Text style={{ fontSize: 12, color: "#64748B" }}>Best Status</Text>
        </View> */}
      </View>
    </View>
  );
};

// Helper for Badges
const BadgeItem = ({ label, unlocked, icon: Icon }) => (
  <View style={{ width: "31%", alignItems: "center", marginBottom: 12, opacity: unlocked ? 1 : 0.5 }}>
    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: unlocked ? "#EEF2FF" : "#F1F5F9", alignItems: "center", justifyContent: "center", marginBottom: 6, borderWidth: 1, borderColor: unlocked ? "#C7D2FE" : "#E2E8F0" }}>
      <Icon size={24} color={unlocked ? "#6366F1" : "#94A3B8"} />
    </View>
    <Text style={{ fontSize: 10, textAlign: "center", color: unlocked ? "#1E293B" : "#94A3B8", fontWeight: unlocked ? "600" : "400" }}>{label}</Text>
  </View>
);

export default function MoodDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data States
  const [analyticsData, setAnalyticsData] = useState(null);
  const [moodEntries, setMoodEntries] = useState([]);
  const [assessmentSummary, setAssessmentSummary] = useState(null);

  // Filters
  const [period, setPeriod] = useState(30);
  const [therapyType, setTherapyType] = useState("individual");

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [period, therapyType])
  );

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) return;

      const [analyticsRes, weeklyMoodRes, assessmentRes] = await Promise.all([
        api.getUserAnalytics(userId, { days: period, therapyType }),
        api.getWeeklyMoodAnalytics(userId), // This returns data with 'mood' field like web
        api.getUserAssessmentSummary(userId, { days: period, therapyType })
      ]);

      console.log("📊 Weekly Mood API Response:", JSON.stringify(weeklyMoodRes, null, 2));

      setAnalyticsData(analyticsRes);
      // The backend returns { moodEntries: [...] } with 'mood' field
      setMoodEntries(weeklyMoodRes?.moodEntries || []);
      setAssessmentSummary(assessmentRes);

    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboard();
  }, [period, therapyType]);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // Calculate Mood Distribution
  const moodDistribution = {};
  moodEntries.forEach(e => {
    const label = e.moodLabel || "Neutral";
    moodDistribution[label] = (moodDistribution[label] || 0) + 1;
  });

  // Debug: Log first mood entry structure
  if (moodEntries.length > 0) {
    console.log("📊 First Mood Entry:", JSON.stringify(moodEntries[0], null, 2));
    console.log("📊 Mood Distribution:", moodDistribution);
  }

  // Data helpers
  const ad = analyticsData || {};
  const as = assessmentSummary || {};

  // Activity Data
  const completedCount = ad.completedCount || 0;
  const pendingCount = ad.pendingCount || 0;
  const totalTasks = completedCount + pendingCount;
  const completionRate = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;
  const badges = ad.badges || {};

  // Pie Data construction
  const pieData = as.categorySummary?.map(c => ({
    name: c.category,
    value: c.averageScore || 0
  })) || [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 24,
        paddingBottom: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderColor: "#E2E8F0",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#1E293B" }}>My Analytics</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >

        {/* Day Range Filter */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#1E293B", marginRight: 8 }}>Day Range:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[7, 30, 90].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setPeriod(d)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: period === d ? "#334155" : "#E2E8F0", borderRadius: 8, marginRight: 8 }}
              >
                <Text style={{ fontSize: 12, color: period === d ? "#fff" : "#475569", fontWeight: "600" }}>{d} Days</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* Mood Count - Half Donut + Mood Cards */}
        <MoodCount data={moodEntries} width={SCREEN_WIDTH - 40} />

        {/* Mood Score - Spline Chart with Trends */}
        <MoodScoreChart data={moodEntries} width={SCREEN_WIDTH - 40} />

        {/* Mood Analytics - Mood Over Time (Bar Chart) & Weekly Mood Distribution (Donut) */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Heart color="#3A8DFF" size={18} />
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#374151", marginLeft: 8 }}>Mood Analytics</Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginLeft: 8 }}>Weekly mood analytics</Text>
          </View>

          {/* Average and Trend */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View style={{ backgroundColor: "#F3F4F6", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: "#374151" }}>
                Average: {moodEntries.length > 0 ? Math.round(moodEntries.reduce((sum, e) => {
                  const scores = (e.situations || []).map(s => s.normalized_score || 50);
                  return sum + (scores.reduce((a, b) => a + b, 0) / scores.length);
                }, 0) / moodEntries.length) : 0}/100
              </Text>
            </View>
            <View style={{ backgroundColor: "#10B981", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TrendingUp color="#fff" size={14} />
              <Text style={{ fontSize: 11, color: "#fff" }}>Trending</Text>
            </View>
          </View>

          {/* Mood Over Time */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12 }}>Mood Over Time</Text>
          <NativeMoodAnalytics data={moodEntries} width={SCREEN_WIDTH - 72} />

          {/* Weekly Mood Distribution */}
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 12, marginTop: 24 }}>Weekly Mood Distribution</Text>
          <NativeWeeklyMoodDistribution data={moodEntries} width={SCREEN_WIDTH - 72} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
