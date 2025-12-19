import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { UserCircle, Edit2, Save, X, MapPin, DollarSign, Briefcase, Clock, Globe } from "lucide-react-native";
import api from "../../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

export default function DoctorProfile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [docId, setDocId] = useState(null);

  // Editable fields
  const [fees, setFees] = useState("");
  const [experience, setExperience] = useState("");
  const [languageSpoken, setLanguageSpoken] = useState("");
  const [available, setAvailable] = useState(true);
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getDoctorProfile();

      if (response.success && response.profileData) {
        const data = response.profileData;
        setProfileData(data);
        setDocId(data._id);

        // Set editable fields
        setFees(data.fees?.toString() || "");
        setExperience(data.experience || "");
        setAvailable(data.available !== false);

        // Set address (match web: address.line1 + address.line2)
        if (data.address && typeof data.address === "object") {
          setAddressLine1(data.address.line1 || "");
          setAddressLine2(data.address.line2 || "");
        } else if (typeof data.address === "string") {
          const parts = data.address.split("\n");
          setAddressLine1(parts[0] || "");
          setAddressLine2(parts[1] || "");
        } else {
          setAddressLine1("");
          setAddressLine2("");
        }
      } else {
        Alert.alert("Error", "Failed to load profile");
      }
    } catch (error) {
      console.error("[Profile] Error:", error);
      Alert.alert("Error", error.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!docId) {
      Alert.alert("Error", "Doctor ID not found");
      return;
    }

    // Validation
    if (!fees || isNaN(parseFloat(fees))) {
      Alert.alert("Error", "Please enter a valid fee amount");
      return;
    }

    if (!experience.trim()) {
      Alert.alert("Error", "Please enter your experience");
      return;
    }

    setSaving(true);
    try {
      const response = await api.updateDoctorProfile(docId, {
        fees: parseFloat(fees),
        experience: experience.trim(),
        available,
        // Match web doctor portal format exactly
        address: {
          line1: addressLine1.trim(),
          line2: addressLine2.trim(),
        },
      });

      if (response.success) {
        Alert.alert("Success", response.message || "Profile updated successfully");
        setIsEditing(false);
        await loadProfile(); // Reload to get updated data
      } else {
        Alert.alert("Error", response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("[Profile] Update error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await api.logout();
            router.replace("/auth/login");
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#4A9B7F" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profileData) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <StatusBar style="dark" />
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header / Identity Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.avatarContainer}>
              {profileData.image ? (
                <Image
                  source={{ uri: profileData.image }}
                  style={styles.avatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <UserCircle color="#4A9B7F" size={48} />
                </View>
              )}
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.name}>{profileData.name}</Text>
              <Text style={styles.email}>{profileData.email}</Text>
              {profileData.speciality && (
                <Text style={styles.speciality}>{profileData.speciality}</Text>
              )}
            </View>

            {!isEditing && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Edit2 color="#4A9B7F" size={18} />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Read-Only Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>

          {profileData.degree && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Degree</Text>
              <Text style={styles.infoValue}>{profileData.degree}</Text>
            </View>
          )}

          {profileData.languageSpoken && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Languages</Text>
              <Text style={styles.infoValue}>{profileData.languageSpoken}</Text>
            </View>
          )}

          {profileData.about && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>About</Text>
              <Text style={styles.infoValue}>{profileData.about}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Patients</Text>
            <Text style={styles.infoValue}>{profileData.patients || 0}</Text>
          </View>

          {profileData.rating > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Rating</Text>
              <Text style={styles.infoValue}>{profileData.rating.toFixed(1)} ⭐</Text>
            </View>
          )}
        </View>

        {/* Editable Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isEditing ? "Edit Information" : "Editable Information"}
          </Text>

          {/* Fees */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <DollarSign color="#6B7280" size={18} />
              <Text style={styles.inputLabel}>Consultation Fees (₹)</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fees}
                onChangeText={setFees}
                keyboardType="numeric"
                placeholder="Enter consultation fees"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.infoValue}>₹{profileData.fees || 0}</Text>
            )}
          </View>

          {/* Experience */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Briefcase color="#6B7280" size={18} />
              <Text style={styles.inputLabel}>Experience</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={experience}
                onChangeText={setExperience}
                placeholder="e.g., 5 years"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.infoValue}>{profileData.experience || "Not set"}</Text>
            )}
          </View>



          {/* Availability */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Clock color="#6B7280" size={18} />
              <Text style={styles.inputLabel}>Available for Appointments</Text>
            </View>
            {isEditing ? (
              <View style={styles.switchContainer}>
                <Switch
                  value={available}
                  onValueChange={setAvailable}
                  trackColor={{ false: "#D1D5DB", true: "#4A9B7F" }}
                  thumbColor="#FFFFFF"
                />
                <Text style={styles.switchLabel}>
                  {available ? "Available" : "Not Available"}
                </Text>
              </View>
            ) : (
              <View style={styles.availabilityBadge}>
                <View
                  style={[
                    styles.availabilityDot,
                    { backgroundColor: profileData.available ? "#10B981" : "#EF4444" },
                  ]}
                />
                <Text style={styles.infoValue}>
                  {profileData.available ? "Available" : "Not Available"}
                </Text>
              </View>
            )}
          </View>

          {/* Address */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <MapPin color="#6B7280" size={18} />
              <Text style={styles.inputLabel}>Address</Text>
            </View>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.input}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  placeholder="Address Line 1"
                  placeholderTextColor="#9CA3AF"
                />
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                  placeholder="Address Line 2"
                  placeholderTextColor="#9CA3AF"
                />
              </>
            ) : (
              <Text style={styles.infoValue}>
                {profileData.address && typeof profileData.address === "object"
                  ? `${profileData.address.line1 || ""}\n${profileData.address.line2 || ""}`.trim()
                  : profileData.address || "Not set"}
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                loadProfile(); // Reset to original values
              }}
              disabled={saving}
            >
              <X color="#6B7280" size={20} />
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save color="#FFFFFF" size={20} />
                  <Text style={styles.saveButtonText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    paddingBottom: 100, // Space for footer
  },
  headerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5F0",
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    justifyContent: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#E8F5F0",
  },
  editButtonText: {
    color: "#4A9B7F",
    fontSize: 14,
    fontWeight: "600",
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  speciality: {
    fontSize: 14,
    color: "#4A9B7F",
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
  },
  infoValue: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  addressInput: {
    flex: 1,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  switchLabel: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#4A9B7F",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  logoutButtonText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#4A9B7F",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

