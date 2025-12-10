import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, X } from "lucide-react-native";
import api from "../../../utils/api";

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const response = await api.getUserAppointments();
      if (response.success) {
        setAppointments(response.appointments || []);
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this appointment?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await api.cancelAppointment(appointmentId);
              if (response.success) {
                Alert.alert("Success", "Appointment cancelled");
                loadAppointments();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to cancel appointment");
            }
          },
        },
      ],
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments();
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (activeTab === "upcoming") {
      return !apt.cancelled && !apt.isCompleted;
    } else if (activeTab === "past") {
      return apt.isCompleted;
    } else {
      return apt.cancelled;
    }
  });

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

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["upcoming", "past", "cancelled"].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                backgroundColor: activeTab === tab ? "#6366F1" : "#F1F5F9",
                alignItems: "center",
              }}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: activeTab === tab ? "#fff" : "#64748B",
                  textTransform: "capitalize",
                }}
              >
                {tab}
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6366F1"
          />
        }
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "#1E293B",
            marginBottom: 24,
          }}
        >
          My Appointments
        </Text>

        {filteredAppointments.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text
              style={{ fontSize: 16, color: "#64748B", textAlign: "center" }}
            >
              No {activeTab} appointments
            </Text>
          </View>
        ) : (
          filteredAppointments.map((appointment) => (
            <View
              key={appointment._id}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                <Image
                  source={{
                    uri:
                      appointment.docData?.image ||
                      "https://via.placeholder.com/60",
                  }}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: "#1E293B",
                      marginBottom: 4,
                    }}
                  >
                    {appointment.docData?.name}
                  </Text>
                  <Text
                    style={{ fontSize: 14, color: "#64748B", marginBottom: 2 }}
                  >
                    {appointment.docData?.speciality}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                    {appointment.docData?.address?.line1}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ fontSize: 14, color: "#64748B", marginBottom: 4 }}
                >
                  📅 {appointment.slotDate?.replace(/_/g, "/")}
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#64748B", marginBottom: 4 }}
                >
                  🕐 {appointment.slotTime}
                </Text>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: "#6366F1" }}
                >
                  ₹{appointment.amount}
                </Text>
              </View>

              {appointment.cancelled && (
                <View
                  style={{
                    backgroundColor: "#FEE2E2",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#EF4444",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Cancelled
                  </Text>
                </View>
              )}

              {appointment.isCompleted && (
                <View
                  style={{
                    backgroundColor: "#DCFCE7",
                    borderRadius: 8,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#16A34A",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    Completed
                  </Text>
                </View>
              )}

              {!appointment.cancelled && !appointment.isCompleted && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#FEE2E2",
                    borderRadius: 8,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => handleCancelAppointment(appointment._id)}
                >
                  <X color="#EF4444" size={20} />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#EF4444",
                      marginLeft: 8,
                    }}
                  >
                    Cancel Appointment
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
