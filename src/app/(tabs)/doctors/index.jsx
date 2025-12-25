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
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  Star,
  ChevronRight,
  Clock,
  Award,
  Stethoscope,
  Calendar,
  MapPin,
} from "lucide-react-native";
import api from "../../../utils/api";

export default function DoctorsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctors, setDoctors] = useState([]);
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

  const navigateToDoctor = (doctorId) => {
    console.log("[DoctorsList] Navigating to doctor:", doctorId);
    router.push({
      pathname: "/(tabs)/doctors/[id]",
      params: { id: doctorId }
    });
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <View style={[styles.loadingContent, { paddingTop: insets.top + 60 }]}>
          <View style={styles.loadingIconContainer}>
            <Stethoscope size={40} color="#6366F1" />
          </View>
          <Text style={styles.loadingTitle}>Finding Best Doctors</Text>
          <Text style={styles.loadingSubtitle}>Please wait...</Text>
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Clean White Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerSubtitle}>Find Your</Text>
            <Text style={styles.headerTitle}>Specialists</Text>
          </View>
          <View style={styles.headerIconContainer}>
            <Stethoscope size={24} color="#6366F1" />
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search color="#9CA3AF" size={20} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors by name or specialty..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredDoctors.length} {filteredDoctors.length === 1 ? "Doctor" : "Doctors"} Found
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={styles.nearMeButton}
            onPress={() => router.push("/doctors/nearme")}
          >
            <MapPin size={14} color="#FFFFFF" />
            <Text style={styles.nearMeText}>Near Me</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Doctor List */}
      <ScrollView
        contentContainerStyle={[styles.listContainer, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Text style={styles.errorIcon}>😔</Text>
            </View>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDoctors}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Search size={40} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>No Doctors Found</Text>
            <Text style={styles.emptyText}>
              {doctors.length === 0
                ? "No doctors are currently available"
                : "Try adjusting your search or filters"}
            </Text>
            {doctors.length === 0 && (
              <TouchableOpacity style={styles.retryButton} onPress={loadDoctors}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredDoctors.map((doctor, index) => (
            <TouchableOpacity
              key={doctor._id}
              style={styles.doctorCard}
              onPress={() => navigateToDoctor(doctor._id)}
              activeOpacity={0.9}
            >
              {/* Featured Badge for first doctor */}
              {index === 0 && (
                <View style={styles.featuredBadge}>
                  <Award size={12} color="#FFFFFF" />
                  <Text style={styles.featuredText}>Top Rated</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                {/* Doctor Image */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: doctor.image || "https://via.placeholder.com/100" }}
                    style={styles.doctorImage}
                  />
                  {doctor.available && (
                    <View style={styles.onlineDot} />
                  )}
                </View>

                {/* Doctor Info */}
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName} numberOfLines={1}>
                    {doctor.name}
                  </Text>

                  <View style={styles.specialtyBadge}>
                    <Text style={styles.specialtyText}>{doctor.speciality}</Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                      <Clock size={12} color="#6B7280" />
                      <Text style={styles.detailText} numberOfLines={1}>{doctor.experience}</Text>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailItem}>
                      <Award size={12} color="#6B7280" />
                      <Text style={styles.detailText} numberOfLines={1}>{doctor.degree}</Text>
                    </View>
                  </View>

                  <View style={styles.bottomRow}>
                    <View style={styles.ratingContainer}>
                      <Star size={14} color="#F59E0B" fill="#F59E0B" />
                      <Text style={styles.ratingText}>4.8</Text>
                      <Text style={styles.reviewsText}>(200+)</Text>
                    </View>

                    <View style={styles.priceContainer}>
                      <Text style={styles.priceLabel}>From</Text>
                      <Text style={styles.priceValue}>₹{doctor.fees}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.arrowContainer}>
                  <View style={styles.arrowCircle}>
                    <ChevronRight size={18} color="#6366F1" />
                  </View>
                </View>
              </View>

              {/* Availability Status */}
              {doctor.available && (
                <LinearGradient
                  colors={["#F0FDF4", "#DCFCE7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.availabilityBar}
                >
                  <View style={styles.availabilityDot} />
                  <Text style={styles.availabilityText}>
                    {doctor.location ? `In ${doctor.location}` : "Available Today"}
                  </Text>
                  <MapPin size={14} color="#22C55E" />
                </LinearGradient>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 15,
    color: "#6B7280",
  },

  // Header
  header: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },


  // Search
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#1F2937",
  },

  // Results Header
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  resultsCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortText: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "500",
  },

  // List
  listContainer: {
    paddingHorizontal: 20,
  },

  // Doctor Card
  doctorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    overflow: "hidden",
  },
  featuredBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomLeftRadius: 12,
    gap: 4,
    zIndex: 1,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  cardContent: {
    flexDirection: "row",
    padding: 16,
  },
  imageContainer: {
    position: "relative",
  },
  doctorImage: {
    width: 85,
    height: 85,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  doctorInfo: {
    flex: 1,
    marginLeft: 14,
    overflow: "hidden",
  },
  doctorName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
  },
  specialtyBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "45%",
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 10,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  reviewsText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  priceLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6366F1",
  },
  arrowContainer: {
    justifyContent: "center",
    paddingLeft: 8,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  // Availability Bar
  availabilityBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
  },

  // Error State
  errorContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 36,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 15,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  nearMeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  nearMeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
