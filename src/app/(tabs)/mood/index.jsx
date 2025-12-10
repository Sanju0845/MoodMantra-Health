import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Activity, BarChart3, Plus, TrendingUp, Heart, Brain, Sparkles } from "lucide-react-native";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../../utils/theme";

export default function MoodScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const benefits = [
    { icon: TrendingUp, text: "Identify patterns in your emotional well-being" },
    { icon: Brain, text: "Understand what affects your mood" },
    { icon: Sparkles, text: "Get AI-powered insights and recommendations" },
    { icon: Heart, text: "Share progress with your therapist" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xl,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        }}
      >
        <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textWhite, marginBottom: spacing.xs }}>
          Mood Tracker
        </Text>
        <Text style={{ fontSize: fontSize.md, color: colors.textWhite, opacity: 0.9 }}>
          Track and analyze your daily moods
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Track Mood Button */}
        <TouchableOpacity
          style={{
            borderRadius: borderRadius.lg,
            marginBottom: spacing.md,
            overflow: "hidden",
            ...shadow.md,
          }}
          onPress={() => router.push("/(tabs)/mood/tracker")}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              padding: spacing.lg,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: spacing.md,
                borderRadius: borderRadius.md,
              }}
            >
              <Plus color={colors.textWhite} size={28} />
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ color: colors.textWhite, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.xs }}>
                Track Mood
              </Text>
              <Text style={{ color: colors.textWhite, fontSize: fontSize.sm, opacity: 0.9 }}>
                Log how you're feeling right now
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* View Dashboard Button */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginBottom: spacing.xl,
            flexDirection: "row",
            alignItems: "center",
            ...shadow.md,
          }}
          onPress={() => router.push("/(tabs)/mood/dashboard")}
          activeOpacity={0.7}
        >
          <View
            style={{
              backgroundColor: colors.primary + "20",
              padding: spacing.md,
              borderRadius: borderRadius.md,
            }}
          >
            <BarChart3 color={colors.primary} size={28} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ color: colors.textDark, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.xs }}>
              View Dashboard
            </Text>
            <Text style={{ color: colors.textMedium, fontSize: fontSize.sm }}>
              See your mood analytics and insights
            </Text>
          </View>
        </TouchableOpacity>

        {/* Why Track Your Mood */}
        <View
          style={{
            backgroundColor: colors.cardBackground,
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            ...shadow.sm,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
            <Activity color={colors.primary} size={24} />
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textDark, marginLeft: spacing.sm }}>
              Why Track Your Mood?
            </Text>
          </View>

          {benefits.map((benefit, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: index < benefits.length - 1 ? spacing.md : 0,
              }}
            >
              <View
                style={{
                  backgroundColor: colors.secondary + "20",
                  padding: spacing.xs,
                  borderRadius: borderRadius.sm,
                }}
              >
                <benefit.icon color={colors.secondary} size={18} />
              </View>
              <Text style={{ flex: 1, marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.textMedium, lineHeight: 22 }}>
                {benefit.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Daily Tip Card */}
        <View
          style={{
            backgroundColor: colors.warning + "15",
            borderRadius: borderRadius.lg,
            padding: spacing.lg,
            marginTop: spacing.lg,
            borderLeftWidth: 4,
            borderLeftColor: colors.warning,
          }}
        >
          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.warning, marginBottom: spacing.xs }}>
            💡 Daily Tip
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.textMedium, lineHeight: 22 }}>
            Tracking your mood at the same time each day helps establish patterns and gives more accurate insights.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
