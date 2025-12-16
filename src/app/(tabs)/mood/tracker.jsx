import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../../utils/api";

const MOODS = [
  { label: "Happy", emoji: "😊", value: 5, color: "#22C55E" },
  { label: "Calm", emoji: "😌", value: 4, color: "#10B981" },
  { label: "Neutral", emoji: "😐", value: 3, color: "#F59E0B" },
  { label: "Anxious", emoji: "😰", value: 2, color: "#A855F7" },
  { label: "Sad", emoji: "😢", value: 1, color: "#3B82F6" },
];

const ACTIVITIES = [
  { label: "Exercise", backendValue: "exercise" },
  { label: "Work", backendValue: "work" },
  { label: "Social", backendValue: "social" },
  { label: "Meditation", backendValue: "other" }, // Mapped to 'other' or need backend update
  { label: "Reading", backendValue: "hobby" },
  { label: "Music", backendValue: "hobby" },
  { label: "Nature", backendValue: "travel" },
  { label: "Gaming", backendValue: "hobby" },
  { label: "Cooking", backendValue: "hobby" },
  { label: "Shopping", backendValue: "other" },
];

export default function MoodTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [stressLevel, setStressLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState("7");
  const [textFeedback, setTextFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleActivity = (activity) => {
    if (selectedActivities.includes(activity)) {
      setSelectedActivities(selectedActivities.filter((a) => a !== activity));
    } else {
      setSelectedActivities([...selectedActivities, activity]);
    }
  };

  const handleSaveMood = async () => {
    if (!selectedMood) {
      Alert.alert("Error", "Please select your mood");
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem("userId");

      const moodData = {
        moodScore: selectedMood.value,
        moodLabel: selectedMood.label.toLowerCase(),
        activities: selectedActivities,
        textFeedback,
        stressLevel,
        energyLevel,
        sleepHours: parseInt(sleepHours) || 7,
        socialInteraction: selectedActivities.includes("social") ? 8 : 3,
      };

      const response = await api.submitMoodEntry(userId, moodData);

      if (response.success) {
        Alert.alert("Success", "Mood logged successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", response.message || "Failed to save mood");
      }
    } catch (error) {
      console.error("Save mood error:", error);
      Alert.alert("Error", error.message || "Failed to save mood");
    } finally {
      setLoading(false);
    }
  };

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
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 24,
          paddingBottom: insets.bottom + 100,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: 8,
          }}
        >
          How are you feeling?
        </Text>
        <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>
          Track your mood and activities today
        </Text>

        {/* Mood Selection */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Select Your Mood
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 32,
          }}
        >
          {MOODS.map((mood) => (
            <TouchableOpacity
              key={mood.label}
              style={{
                flex: 1,
                minWidth: "30%",
                backgroundColor:
                  selectedMood?.label === mood.label ? mood.color : "#fff",
                borderRadius: 16,
                padding: 16,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
              onPress={() => setSelectedMood(mood)}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>
                {mood.emoji}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color:
                    selectedMood?.label === mood.label ? "#fff" : "#1E293B",
                }}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activities */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Activities Today
        </Text>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 32,
          }}
        >
          {ACTIVITIES.map((activity) => (
            <TouchableOpacity
              key={activity.backendValue + activity.label}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 20,
                backgroundColor: selectedActivities.includes(activity.backendValue)
                  ? "#6366F1"
                  : "#F1F5F9",
              }}
              onPress={() => toggleActivity(activity.backendValue)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: selectedActivities.includes(activity.backendValue)
                    ? "#fff"
                    : "#64748B",
                  textTransform: "capitalize",
                }}
              >
                {activity.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stress Level */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Stress Level: {stressLevel}/10
        </Text>
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={{
                flex: 1,
                height: 40,
                backgroundColor: stressLevel >= level ? "#EF4444" : "#F1F5F9",
                borderRadius: 4,
              }}
              onPress={() => setStressLevel(level)}
            />
          ))}
        </View>

        {/* Energy Level */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Energy Level: {energyLevel}/10
        </Text>
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 32 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
            <TouchableOpacity
              key={level}
              style={{
                flex: 1,
                height: 40,
                backgroundColor: energyLevel >= level ? "#22C55E" : "#F1F5F9",
                borderRadius: 4,
              }}
              onPress={() => setEnergyLevel(level)}
            />
          ))}
        </View>

        {/* Sleep Hours */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Hours of Sleep
        </Text>
        <TextInput
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: "#1E293B",
            marginBottom: 32,
          }}
          placeholder="7"
          placeholderTextColor="#94A3B8"
          value={sleepHours}
          onChangeText={setSleepHours}
          keyboardType="number-pad"
        />

        {/* Text Feedback */}
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#1E293B",
            marginBottom: 12,
          }}
        >
          Notes (Optional)
        </Text>
        <TextInput
          style={{
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            borderRadius: 12,
            padding: 16,
            fontSize: 16,
            color: "#1E293B",
            height: 120,
            textAlignVertical: "top",
          }}
          placeholder="How are you feeling today?"
          placeholderTextColor="#94A3B8"
          value={textFeedback}
          onChangeText={setTextFeedback}
          multiline
        />
      </ScrollView>

      {/* Save Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 24,
          paddingBottom: insets.bottom + 24,
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderColor: "#E2E8F0",
        }}
      >
        <TouchableOpacity
          style={{
            backgroundColor: "#6366F1",
            borderRadius: 12,
            padding: 16,
            alignItems: "center",
            opacity: loading ? 0.7 : 1,
          }}
          onPress={handleSaveMood}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Save Mood Entry
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
