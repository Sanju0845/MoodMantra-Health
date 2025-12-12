import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react-native";
import api from "../../../utils/api";

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.getProfile();
      if (response.success && response.userData) {
        const user = response.userData;
        setName(user.name || "");
        setPhone(user.phone || "");
        setGender(user.gender || "");
        setDob(user.dob ? new Date(user.dob).toISOString().split("T")[0] : "");
        setAddress1(user.address?.line1 || "");
        setAddress2(user.address?.line2 || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name) {
      Alert.alert("Error", "Name is required");
      return;
    }

    setSaving(true);
    try {
      const data = {
        name,
        phone,
        gender,
        dob,
        address: {
          line1: address1,
          line2: address2,
        },
      };

      const response = await api.updateProfile(data);

      if (response.success) {
        Alert.alert("Success", "Profile updated successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", response.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      Alert.alert("Error", error.message || "Failed to update profile");
    } finally {
      setSaving(false);
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
            marginBottom: 24,
          }}
        >
          Edit Profile
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Full Name *
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
            }}
            placeholder="Enter your full name"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Phone Number
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
            }}
            placeholder="Enter your phone number"
            placeholderTextColor="#94A3B8"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Gender
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {["Male", "Female", "Other"].map((option) => (
              <TouchableOpacity
                key={option}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: gender === option ? "#6366F1" : "#F1F5F9",
                  alignItems: "center",
                }}
                onPress={() => setGender(option)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: gender === option ? "#fff" : "#64748B",
                  }}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Date of Birth
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
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            value={dob}
            onChangeText={setDob}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Address Line 1
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
            }}
            placeholder="Enter address line 1"
            placeholderTextColor="#94A3B8"
            value={address1}
            onChangeText={setAddress1}
          />
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 8,
            }}
          >
            Address Line 2
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
            }}
            placeholder="Enter address line 2"
            placeholderTextColor="#94A3B8"
            value={address2}
            onChangeText={setAddress2}
          />
        </View>
      </ScrollView>

      {/* Save Button */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 24,
          paddingBottom: insets.bottom + 90,
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
            opacity: saving ? 0.7 : 1,
          }}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
