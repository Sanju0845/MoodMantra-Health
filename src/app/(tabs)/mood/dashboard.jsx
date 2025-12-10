import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

export default function MoodDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      const response = await api.getMoodDashboard(userId, period);

      if (response.success) {
        setDashboard(response.dashboard);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 24,
          paddingBottom: 16,
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>

        {/* Period Selector */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[7, 30, 90].map((days) => (
            <TouchableOpacity
              key={days}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: period === days ? "#6366F1" : "#F1F5F9",
                alignItems: "center",
              }}
              onPress={() => setPeriod(days)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: period === days ? "#fff" : "#64748B",
                }}
              >
                {days === 7 ? "Week" : days === 30 ? "Month" : "3 Months"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: 24,
          }}
        >
          Mood Dashboard
        </Text>

        {dashboard?.analytics ? (
          <>
            {/* Stats Cards */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: "#6366F1",
                    marginBottom: 4,
                  }}
                >
                  {dashboard.analytics.basicStats?.averageScore?.toFixed(1) ||
                    0}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  Average Score
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: "bold",
                    color: "#10B981",
                    marginBottom: 4,
                  }}
                >
                  {dashboard.analytics.basicStats?.totalEntries || 0}
                </Text>
                <Text style={{ fontSize: 12, color: "#64748B" }}>
                  Total Entries
                </Text>
              </View>
            </View>

            {/* Trend */}
            {dashboard.analytics.trend && (
              <View
                style={{
                  backgroundColor:
                    dashboard.analytics.trend === "improving"
                      ? "#DCFCE7"
                      : "#FEF3C7",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                {dashboard.analytics.trend === "improving" ? (
                  <TrendingUp color="#16A34A" size={24} />
                ) : (
                  <TrendingDown color="#D97706" size={24} />
                )}
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color:
                      dashboard.analytics.trend === "improving"
                        ? "#16A34A"
                        : "#D97706",
                    marginLeft: 12,
                  }}
                >
                  Your mood is {dashboard.analytics.trend}
                </Text>
              </View>
            )}

            {/* Mood Distribution */}
            {dashboard.analytics.moodDistribution && (
              <View
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 24,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#1E293B",
                    marginBottom: 16,
                  }}
                >
                  Mood Distribution
                </Text>
                {Object.entries(dashboard.analytics.moodDistribution).map(
                  ([mood, count]) => (
                    <View key={mood} style={{ marginBottom: 12 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#64748B",
                            textTransform: "capitalize",
                          }}
                        >
                          {mood}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#1E293B",
                          }}
                        >
                          {count}
                        </Text>
                      </View>
                      <View
                        style={{
                          height: 8,
                          backgroundColor: "#F1F5F9",
                          borderRadius: 4,
                          overflow: "hidden",
                        }}
                      >
                        <View
                          style={{
                            height: "100%",
                            width: `${(count / dashboard.analytics.basicStats.totalEntries) * 100}%`,
                            backgroundColor: "#6366F1",
                          }}
                        />
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}

            {/* Insights */}
            {dashboard.insights && dashboard.insights.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "#1E293B",
                    marginBottom: 16,
                  }}
                >
                  Insights
                </Text>
                {dashboard.insights.map((insight, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#fff",
                      borderRadius: 16,
                      padding: 20,
                      marginBottom: 12,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1E293B",
                        marginBottom: 4,
                      }}
                    >
                      {insight.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: "#64748B" }}>
                      {insight.description}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recommendations */}
            {dashboard.recommendations &&
              dashboard.recommendations.length > 0 && (
                <View>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: "#1E293B",
                      marginBottom: 16,
                    }}
                  >
                    Recommendations
                  </Text>
                  {dashboard.recommendations.map((rec, index) => (
                    <View
                      key={index}
                      style={{
                        backgroundColor: "#FEF3C7",
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "600",
                          color: "#92400E",
                          marginBottom: 4,
                        }}
                      >
                        {rec.title}
                      </Text>
                      <Text style={{ fontSize: 14, color: "#78350F" }}>
                        {rec.description}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
          </>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text
              style={{ fontSize: 16, color: "#64748B", textAlign: "center" }}
            >
              No mood data available yet. Start tracking your mood to see
              insights!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
