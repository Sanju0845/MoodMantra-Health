import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Search, Star, MapPin, ChevronRight } from "lucide-react-native";
import api from "../../../utils/api";
import { colors, spacing, borderRadius, fontSize, fontWeight, shadow } from "../../../utils/theme";

const SPECIALITIES = [
  "All",
  "Psychiatrist",
  "Child Psychologist",
  "Clinical Psychologist",
  "Family Therapist",
  "Couples Counselor",
  "General Physician",
];

export default function DoctorsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);

  const loadDoctors = useCallback(async () => {
    try {
      setError(null);
      console.log("[DoctorsList] Loading doctors...");
      const response = await api.getDoctors();

      if (response.success && response.doctors) {
        console.log("[DoctorsList] Found", response.doctors.length, "doctors");
        setDoctors(response.doctors);
      } else {
        setDoctors([]);
      }
    } catch (err) {
      console.error("[DoctorsList] Error:", err);
      setError(err.message);
      setDoctors([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const filteredDoctors = doctors.filter((doc) => {
    if (selectedFilter !== "All" && doc.speciality !== selectedFilter) {
      return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const nameMatch = doc.name?.toLowerCase().includes(query);
      const specialityMatch = doc.speciality?.toLowerCase().includes(query);
      if (!nameMatch && !specialityMatch) {
        return false;
      }
    }
    return true;
  });

  const onRefresh = () => {
    setRefreshing(true);
    loadDoctors();
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: spacing.md, color: colors.textMedium }}>Loading doctors...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={{
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
          borderBottomLeftRadius: borderRadius.xl,
          borderBottomRightRadius: borderRadius.xl,
        }}
      >
        <Text style={{ fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.textWhite, marginBottom: spacing.md }}>
          Find a Doctor
        </Text>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.cardBackground,
            borderRadius: borderRadius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            ...shadow.sm,
          }}
        >
          <Search color={colors.textLight} size={20} />
          <TextInput
            style={{ flex: 1, marginLeft: spacing.sm, fontSize: fontSize.md, color: colors.textDark }}
            placeholder="Search doctors..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={{ paddingVertical: spacing.md }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        >
          {SPECIALITIES.map((speciality) => (
            <TouchableOpacity
              key={speciality}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: borderRadius.full,
                backgroundColor: selectedFilter === speciality ? colors.primary : colors.cardBackground,
                borderWidth: selectedFilter === speciality ? 0 : 1,
                borderColor: colors.border,
                ...shadow.sm,
              }}
              onPress={() => setSelectedFilter(speciality)}
              activeOpacity={0.7}
            >
              <Text
                style={{
                  fontSize: fontSize.sm,
                  fontWeight: fontWeight.semibold,
                  color: selectedFilter === speciality ? colors.textWhite : colors.textMedium,
                }}
              >
                {speciality}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Doctor List */}
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {error ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: fontSize.md, color: colors.error, textAlign: "center", marginBottom: spacing.sm }}>
              Error loading doctors
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textMedium, textAlign: "center", marginBottom: spacing.md }}>
              {error}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md }}
              onPress={loadDoctors}
            >
              <Text style={{ color: colors.textWhite, fontWeight: fontWeight.semibold }}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
            <Text style={{ fontSize: fontSize.md, color: colors.textMedium, textAlign: "center" }}>
              {doctors.length === 0 ? "No doctors available" : "No doctors found matching your search"}
            </Text>
            {doctors.length === 0 && (
              <TouchableOpacity
                style={{ marginTop: spacing.md, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md }}
                onPress={loadDoctors}
              >
                <Text style={{ color: colors.textWhite, fontWeight: fontWeight.semibold }}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredDoctors.map((doctor) => (
            <TouchableOpacity
              key={doctor._id}
              style={{
                backgroundColor: colors.cardBackground,
                borderRadius: borderRadius.lg,
                padding: spacing.md,
                marginBottom: spacing.md,
                flexDirection: "row",
                ...shadow.md,
              }}
              onPress={() => router.push(`/(tabs)/doctors/${doctor._id}`)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: doctor.image || "https://via.placeholder.com/80" }}
                style={{ width: 80, height: 80, borderRadius: borderRadius.md, marginRight: spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textDark, marginBottom: spacing.xs }}>
                      {doctor.name}
                    </Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.primary, marginBottom: spacing.xs }}>
                      {doctor.speciality}
                    </Text>
                  </View>
                  {doctor.available && (
                    <View style={{ backgroundColor: colors.success + "20", paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm }}>
                      <Text style={{ fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.semibold }}>Available</Text>
                    </View>
                  )}
                </View>

                <Text style={{ fontSize: fontSize.xs, color: colors.textMedium, marginBottom: spacing.sm }}>
                  {doctor.experience} • {doctor.degree}
                </Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Star color={colors.warning} size={14} fill={colors.warning} />
                    <Text style={{ marginLeft: spacing.xs, fontSize: fontSize.xs, color: colors.textMedium }}>
                      4.8 (200+ reviews)
                    </Text>
                  </View>
                  <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.primary }}>
                    ₹{doctor.fees}
                  </Text>
                </View>
              </View>
              <View style={{ justifyContent: "center" }}>
                <ChevronRight color={colors.textLight} size={20} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
