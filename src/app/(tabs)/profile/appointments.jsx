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
import { ArrowLeft, X, CheckCircle, Calendar, Clock, MapPin } from "lucide-react-native";
import api from "../../../utils/api";

export default function AppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);

  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const slotDateFormat = (slotDate) => {
    const dateArray = slotDate.split("/");
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2];
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.getUserAppointments();

      if (response.success) {
        // Filter to show only paid or cancelled appointments (matching web logic)
        const validAppointments = (response.appointments || []).filter(
          (appt) => appt.payment || appt.cancelled
        );
        setAppointments(validAppointments.reverse());
      }
    } catch (error) {
      console.error("Error loading appointments:", error);
      Alert.alert("Error", "Failed to load appointments");
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
              setCancellingId(appointmentId);
              const response = await api.cancelAppointment(appointmentId);
              if (response.success) {
                Alert.alert("Success", response.message || "Appointment cancelled");
                loadAppointments();
              } else {
                Alert.alert("Error", response.message || "Failed to cancel");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to cancel appointment");
            } finally {
              setCancellingId(null);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" }}>
        <ActivityIndicator size="large" color="#4A9B7F" />
        <Text style={{ marginTop: 12, color: "#64748B" }}>Loading appointments...</Text>
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
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <ArrowLeft color="#1E293B" size={24} />
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1E293B" }}>
          My Appointments
        </Text>
        <Text style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
          View your confirmed and completed appointments
        </Text>
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
            tintColor="#4A9B7F"
          />
        }
      >
        {appointments.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#F1F5F9",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Calendar color="#94A3B8" size={40} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#1E293B", marginBottom: 8 }}>
              No Appointments Found
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B", textAlign: "center", paddingHorizontal: 40 }}>
              You don't have any confirmed appointments yet. Book an appointment to get started!
            </Text>
          </View>
        ) : (
          appointments.map((appointment) => (
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
              {/* Doctor Info */}
              <View style={{ flexDirection: "row", marginBottom: 16 }}>
                <Image
                  source={{
                    uri: appointment.docData?.image || "https://via.placeholder.com/80",
                  }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 12,
                    marginRight: 12,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "700",
                      color: "#1E293B",
                      marginBottom: 4,
                    }}
                  >
                    {appointment.docData?.name || "Doctor"}
                  </Text>
                  <Text style={{ fontSize: 14, color: "#4A9B7F", marginBottom: 8, fontWeight: "600" }}>
                    {appointment.docData?.speciality || "Specialist"}
                  </Text>

                  {/* Status Badge */}
                  <View
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 12,
                      backgroundColor: appointment.cancelled
                        ? "#FEE2E2"
                        : appointment.isCompleted
                          ? "#DCFCE7"
                          : "#EEF2FF",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: appointment.cancelled
                          ? "#EF4444"
                          : appointment.isCompleted
                            ? "#16A34A"
                            : "#4A9B7F",
                      }}
                    >
                      {appointment.cancelled ? "Cancelled" : appointment.isCompleted ? "Completed" : "Paid"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Appointment Details */}
              <View
                style={{
                  backgroundColor: "#F8FAFC",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Calendar color="#4A9B7F" size={16} />
                  <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 8 }}>
                    {slotDateFormat(appointment.slotDate)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <Clock color="#4A9B7F" size={16} />
                  <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 8 }}>
                    {appointment.slotTime}
                  </Text>
                </View>
                {appointment.docData?.address && (
                  <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                    <MapPin color="#4A9B7F" size={16} style={{ marginTop: 2 }} />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={{ fontSize: 14, color: "#64748B" }}>
                        {appointment.docData.address.line1}
                      </Text>
                      {appointment.docData.address.line2 && (
                        <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                          {appointment.docData.address.line2}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>

              {/* Additional Details */}
              {appointment.reasonForVisit && (
                <View
                  style={{
                    backgroundColor: "#F0FDF4",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#BBF7D0",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#16A34A", marginBottom: 4 }}>
                    Reason for Visit
                  </Text>
                  <Text style={{ fontSize: 14, color: "#15803D" }}>
                    {appointment.reasonForVisit}
                  </Text>
                </View>
              )}

              {appointment.sessionType && (
                <View
                  style={{
                    backgroundColor: "#EFF6FF",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "#BFDBFE",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#2563EB", marginBottom: 4 }}>
                    Session Details
                  </Text>
                  <Text style={{ fontSize: 14, color: "#1E40AF" }}>
                    {appointment.sessionType}
                    {appointment.communicationMethod && ` • ${appointment.communicationMethod}`}
                  </Text>
                </View>
              )}

              {/* Action Buttons */}
              {!appointment.cancelled && appointment.payment && !appointment.isCompleted && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#DCFCE7",
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#BBF7D0",
                    }}
                  >
                    <CheckCircle color="#16A34A" size={18} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: "#16A34A",
                        marginLeft: 8,
                      }}
                    >
                      Paid
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: "#FEE2E2",
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 1,
                      borderColor: "#FECACA",
                      opacity: cancellingId === appointment._id ? 0.5 : 1,
                    }}
                    onPress={() => handleCancelAppointment(appointment._id)}
                    disabled={cancellingId === appointment._id}
                  >
                    {cancellingId === appointment._id ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <X color="#EF4444" size={18} />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "600",
                            color: "#EF4444",
                            marginLeft: 8,
                          }}
                        >
                          Cancel
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
