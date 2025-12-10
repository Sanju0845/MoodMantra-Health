import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, MapPin, Calendar } from "lucide-react-native";
import api from "../../../utils/api";

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadDoctor = async () => {
    try {
      const response = await api.getDoctors();
      if (response.success) {
        const foundDoctor = response.doctors.find((d) => d._id === id);
        setDoctor(foundDoctor);
      }
    } catch (error) {
      console.error("Error loading doctor:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert("Error", "Please select a date and time");
      return;
    }

    setBooking(true);
    try {
      const response = await api.bookAppointment(
        doctor._id,
        selectedDate,
        selectedTime,
      );
      if (response.success) {
        Alert.alert("Success", "Appointment booked successfully!", [
          {
            text: "OK",
            onPress: () => router.push("/(tabs)/profile/appointments"),
          },
        ]);
      } else {
        Alert.alert("Error", response.message || "Failed to book appointment");
      }
    } catch (error) {
      console.error("Booking error:", error);
      Alert.alert("Error", error.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  // Generate time slots
  const timeSlots = [
    "09:00 AM",
    "09:30 AM",
    "10:00 AM",
    "10:30 AM",
    "11:00 AM",
    "11:30 AM",
    "02:00 PM",
    "02:30 PM",
    "03:00 PM",
    "03:30 PM",
    "04:00 PM",
    "04:30 PM",
  ];

  // Generate next 7 days
  const generateDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      dates.push(`${day}_${month}_${year}`);
    }
    return dates;
  };

  const dates = generateDates();

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

  if (!doctor) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8FAFC",
        }}
      >
        <Text style={{ color: "#64748B" }}>Doctor not found</Text>
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
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Doctor Info */}
        <View
          style={{ backgroundColor: "#fff", padding: 24, marginBottom: 16 }}
        >
          <View style={{ flexDirection: "row", marginBottom: 16 }}>
            <Image
              source={{
                uri: doctor.image || "https://via.placeholder.com/100",
              }}
              style={{
                width: 100,
                height: 100,
                borderRadius: 16,
                marginRight: 16,
              }}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: "#1E293B",
                  marginBottom: 4,
                }}
              >
                {doctor.name}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 4 }}>
                {doctor.speciality}
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", marginBottom: 8 }}>
                {doctor.degree}
              </Text>
              <Text style={{ fontSize: 12, color: "#94A3B8" }}>
                {doctor.experience}
              </Text>
            </View>
          </View>

          {doctor.address && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <MapPin color="#64748B" size={16} />
              <Text style={{ fontSize: 14, color: "#64748B", marginLeft: 8 }}>
                {doctor.address.line1}, {doctor.address.line2}
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: "#F1F5F9",
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#6366F1",
                marginBottom: 4,
              }}
            >
              ₹{doctor.fees}
            </Text>
            <Text style={{ fontSize: 14, color: "#64748B" }}>
              Consultation Fee
            </Text>
          </View>

          {doctor.about && (
            <View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#1E293B",
                  marginBottom: 8,
                }}
              >
                About
              </Text>
              <Text style={{ fontSize: 14, color: "#64748B", lineHeight: 20 }}>
                {doctor.about}
              </Text>
            </View>
          )}
        </View>

        {/* Date Selection */}
        <View
          style={{ backgroundColor: "#fff", padding: 24, marginBottom: 16 }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1E293B",
              marginBottom: 16,
            }}
          >
            Select Date
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12 }}
          >
            {dates.map((date) => (
              <TouchableOpacity
                key={date}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor:
                    selectedDate === date ? "#6366F1" : "#F1F5F9",
                  minWidth: 80,
                  alignItems: "center",
                }}
                onPress={() => setSelectedDate(date)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: selectedDate === date ? "#fff" : "#64748B",
                  }}
                >
                  {date.split("_")[0]}/{date.split("_")[1]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Selection */}
        {selectedDate && (
          <View style={{ backgroundColor: "#fff", padding: 24 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#1E293B",
                marginBottom: 16,
              }}
            >
              Select Time
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {timeSlots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor:
                      selectedTime === time ? "#6366F1" : "#F1F5F9",
                    minWidth: "30%",
                    alignItems: "center",
                  }}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: selectedTime === time ? "#fff" : "#64748B",
                    }}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Book Button */}
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
            opacity: booking ? 0.7 : 1,
          }}
          onPress={handleBookAppointment}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              Book Appointment
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
